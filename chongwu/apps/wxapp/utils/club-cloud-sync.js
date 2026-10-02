const cloudApi = require('./cloud-api');
const store = require('./store');

function clubApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('clubs', action, payload);
}

function needsCloudUpload(path) {
  if (!path || typeof path !== 'string') return false;
  if (path.startsWith('cloud://')) return false;
  if (path.startsWith('https://') || path.startsWith('http://')) return false;
  if (path.startsWith('/assets/')) return false;
  return true;
}

function uploadOne(localPath) {
  const m = localPath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = (m && m[1]) || 'jpg';
  const cloudPath = `clubs/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: localPath }).then((res) => res.fileID);
}

async function resolveUrl(url) {
  if (!url) return '';
  if (!needsCloudUpload(url)) return url;
  return uploadOne(url);
}

async function uploadClubMedia(payload) {
  const next = { ...payload };
  if (next.cover) next.cover = await resolveUrl(next.cover);
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

async function refreshClubsFromCloud(options = {}) {
  if (!cloudApi.cloudEnabled()) {
    return {
      feed: store.listClubsFeed(),
      mine: store.listMyOwnedClubs(),
    };
  }
  await ensureCloudLogin();
  const city = options.city || store.getCity();
  try {
    const [feedData, mineData] = await Promise.all([
      clubApi('listFeed', { city, limit: options.limit || 50 }),
      clubApi('listMine'),
    ]);
    const feed = store.replaceClubsFeedFromCloud((feedData && feedData.list) || []);
    const mine = store.replaceMyOwnedClubsFromCloud((mineData && mineData.list) || []);
    return { feed, mine };
  } catch (e) {
    console.warn('[club-cloud-sync] refresh', e);
    return {
      feed: store.listClubsFeed(),
      mine: store.listMyOwnedClubs(),
    };
  }
}

async function fetchClubFromCloud(id) {
  if (!cloudApi.cloudEnabled() || !id) return store.getClubFromCache(id);
  await ensureCloudLogin();
  try {
    const data = await clubApi('get', { id: String(id) });
    const club = data && data.club;
    if (club) store.upsertClubInCache(club);
    return club || store.getClubFromCache(id);
  } catch (e) {
    return store.getClubFromCache(id);
  }
}

async function saveClubToCloud(payload, clubId) {
  if (!cloudApi.cloudEnabled()) {
    throw new Error('云开发未启用');
  }
  await ensureCloudLogin();
  const body = await uploadClubMedia(payload);
  const data = await clubApi('save', clubId ? { ...body, id: clubId } : body);
  const club = data && data.club;
  if (!club) throw new Error('保存失败');
  store.upsertClubInCache(club);
  store.upsertMyOwnedClub(club);
  return club;
}

module.exports = {
  refreshClubsFromCloud,
  fetchClubFromCloud,
  saveClubToCloud,
};
