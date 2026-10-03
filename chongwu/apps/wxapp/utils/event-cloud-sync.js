const cloudApi = require('./cloud-api');
const store = require('./store');

function eventApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('events', action, payload);
}

const { needsCloudUpload } = require('./cloud-media');

function uploadOne(localPath) {
  const m = localPath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = (m && m[1]) || 'jpg';
  const cloudPath = `events/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: localPath }).then((res) => res.fileID);
}

async function resolveUrl(url) {
  if (!url) return '';
  if (!needsCloudUpload(url)) return url;
  return uploadOne(url);
}

async function uploadEventMedia(payload) {
  const next = { ...payload };
  next.cover = await resolveUrl(next.cover);
  next.hostAvatar = await resolveUrl(next.hostAvatar);

  const mapList = async (list) => Promise.all(
    (Array.isArray(list) ? list : []).map(async (item) => {
      if (!item || typeof item !== 'object') return item;
      const url = await resolveUrl(item.url);
      const poster = item.type === 'video' ? await resolveUrl(item.poster || item.url) : '';
      return item.type === 'video'
        ? { ...item, url, poster: poster || url }
        : { ...item, url };
    }),
  );

  next.mediaList = await mapList(next.mediaList);
  next.detailMediaList = await mapList(next.detailMediaList);
  next.images = next.mediaList.filter((m) => m.type === 'image').map((m) => m.url);
  next.detailImages = next.detailMediaList.filter((m) => m.type === 'image').map((m) => m.url);
  if (!next.cover && next.images[0]) next.cover = next.images[0];
  return next;
}

async function ensureCloudLogin() {
  const { refreshPetsFromCloud } = require('./pet-cloud-sync');
  try {
    const loginData = await cloudApi.login();
    if (loginData && loginData.token) {
      const app = getApp();
      app.globalData.token = loginData.token;
      app.globalData.userInfo = loginData.user;
      wx.setStorageSync('token', loginData.token);
      wx.setStorageSync('userInfo', loginData.user);
    }
  } catch (e) {
    // ignore
  }
  await refreshPetsFromCloud().catch(() => {});
}

async function refreshEventsFeedFromCloud(options = {}) {
  if (!cloudApi.cloudEnabled()) return store.listCloudEvents();
  await ensureCloudLogin();
  try {
    const payload = { limit: options.limit || 80 };
    if (options.city) payload.city = options.city;
    const data = await eventApi('listFeed', payload);
    const list = (data && data.list) || [];
    return store.replaceAllEventsFromCloud(list);
  } catch (e) {
    console.warn('[event-cloud-sync] listFeed', e);
    return store.listCloudEvents();
  }
}

async function refreshMyEventsFromCloud() {
  if (!cloudApi.cloudEnabled()) return store.listMyEvents();
  await ensureCloudLogin();
  try {
    const data = await eventApi('listMine');
    const list = (data && data.list) || [];
    list.forEach((ev) => store.upsertEventFromCloud(ev));
    return store.listMyEvents();
  } catch (e) {
    console.warn('[event-cloud-sync] listMine', e);
    return store.listMyEvents();
  }
}

async function saveEventToCloud(payload, eventId) {
  if (!cloudApi.cloudEnabled()) {
    return store.addMyEvent(payload);
  }
  wx.showLoading({ title: '发布中…', mask: true });
  try {
    await ensureCloudLogin();
    const uploaded = await uploadEventMedia({ ...payload, city: store.getCity() });
    const body = { ...uploaded };
    if (eventId) body.id = eventId;
    const data = await eventApi('save', body);
    const event = (data && data.event) || null;
    if (!event) throw new Error('发布失败');
    store.upsertEventFromCloud(event);
    if (!eventId) {
      store.pushMessage('活动发布成功', '你的活动已上线，可生成海报邀请宠友', 'social');
    }
    return event;
  } finally {
    wx.hideLoading();
  }
}

async function recordEventInterest(eventId) {
  if (!cloudApi.cloudEnabled() || !eventId) return null;
  await ensureCloudLogin();
  try {
    const data = await eventApi('recordInterest', { eventId: String(eventId) });
    const interestCount = data && data.interestCount;
    if (interestCount != null) {
      const cached = store.getEventFromCache(eventId) || { id: eventId };
      store.upsertEventFromCloud({
        ...cached,
        id: String(eventId),
        interestCount,
      });
    }
    return data;
  } catch (e) {
    console.warn('[event-cloud-sync] recordInterest', e);
    return null;
  }
}

async function fetchEventFromCloud(id) {
  if (!cloudApi.cloudEnabled() || !id) return null;
  await ensureCloudLogin();
  try {
    const data = await eventApi('get', { id });
    const event = data && data.event;
    if (event) store.upsertEventFromCloud(event);
    return event;
  } catch (e) {
    return null;
  }
}

async function removeEventFromCloud(id) {
  if (!cloudApi.cloudEnabled()) {
    store.deleteMyEvent(id);
    return true;
  }
  await eventApi('remove', { id });
  store.deleteCloudEvent(id);
  return true;
}

module.exports = {
  refreshEventsFeedFromCloud,
  refreshMyEventsFromCloud,
  saveEventToCloud,
  fetchEventFromCloud,
  removeEventFromCloud,
  recordEventInterest,
};
