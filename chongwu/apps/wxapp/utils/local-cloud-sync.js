const cloudApi = require('./cloud-api');
const store = require('./store');

function localApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('local_posts', action, payload);
}

const { needsCloudUpload } = require('./cloud-media');

function uploadOne(localPath) {
  const m = localPath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = (m && m[1]) || 'jpg';
  const cloudPath = `local/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: localPath }).then((res) => res.fileID);
}

async function resolveUrl(url) {
  if (!url) return '';
  if (!needsCloudUpload(url)) return url;
  return uploadOne(url);
}

async function uploadLocalMedia(payload) {
  const next = { ...payload };
  const mediaList = Array.isArray(next.mediaList) ? next.mediaList : [];
  next.mediaList = await Promise.all(
    mediaList.map(async (item) => {
      if (!item || typeof item !== 'object') return item;
      const url = await resolveUrl(item.url);
      const poster = item.type === 'video' ? await resolveUrl(item.poster || item.url) : '';
      return item.type === 'video'
        ? { ...item, url, poster: poster || url }
        : { ...item, url };
    }),
  );
  next.images = next.mediaList.filter((m) => m.type === 'image').map((m) => m.url);
  next.image = next.image ? await resolveUrl(next.image) : (next.images[0] || '');
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

async function refreshLocalPostsFromCloud(options = {}) {
  if (!cloudApi.cloudEnabled()) return store.listLocalPosts();
  await ensureCloudLogin();
  try {
    const payload = {
      type: options.type || 'all',
      limit: options.limit || 80,
    };
    if (options.city) payload.city = options.city;
    const data = await localApi('listFeed', payload);
    const list = (data && data.list) || [];
    return store.replaceAllLocalPostsFromCloud(list);
  } catch (e) {
    console.warn('[local-cloud-sync] listFeed', e);
    return store.listLocalPosts();
  }
}

async function saveLocalToCloud(payload, postId) {
  if (!cloudApi.cloudEnabled()) {
    return store.addLocalPost(payload);
  }
  wx.showLoading({ title: '发布中…', mask: true });
  try {
    await ensureCloudLogin();
    const uploaded = await uploadLocalMedia(payload);
    const body = { ...uploaded, city: store.getCity() };
    if (postId) body.id = postId;
    const data = await localApi('save', body);
    const post = (data && data.post) || null;
    if (!post) throw new Error('发布失败');
    store.upsertLocalPostFromCloud(post);
    if (!postId) {
      store.pushMessage('发布成功', '信息已提交，将在同城展示', 'social');
    }
    return post;
  } finally {
    wx.hideLoading();
  }
}

async function removeLocalFromCloud(id) {
  if (!cloudApi.cloudEnabled()) {
    store.deleteLocalPost(id);
    return true;
  }
  await localApi('remove', { id });
  store.deleteLocalPost(id);
  return true;
}

async function fetchLocalPostFromCloud(id) {
  if (!cloudApi.cloudEnabled() || !id) return null;
  await ensureCloudLogin();
  try {
    const data = await localApi('get', { id });
    const post = data && data.post;
    if (post) store.upsertLocalPostFromCloud(post);
    return post;
  } catch (e) {
    return null;
  }
}

module.exports = {
  refreshLocalPostsFromCloud,
  saveLocalToCloud,
  removeLocalFromCloud,
  fetchLocalPostFromCloud,
};
