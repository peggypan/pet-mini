const cloudApi = require('./cloud-api');
const store = require('./store');

function mapApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('map_points', action, payload);
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
  const cloudPath = `map/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: localPath }).then((res) => res.fileID);
}

async function resolveUrl(url) {
  if (!url) return '';
  if (!needsCloudUpload(url)) return url;
  return uploadOne(url);
}

async function uploadMapImages(payload) {
  const next = { ...payload };
  const images = Array.isArray(next.images) ? next.images : [];
  next.images = await Promise.all(images.map((u) => resolveUrl(u)));
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

async function refreshMapPointsFromCloud(options = {}) {
  if (!cloudApi.cloudEnabled()) return store.listMapPoints();
  await ensureCloudLogin();
  try {
    const payload = { limit: options.limit || 120 };
    if (options.city) payload.city = options.city;
    const data = await mapApi('listFeed', payload);
    const list = (data && data.list) || [];
    return store.replaceAllMapPointsFromCloud(list);
  } catch (e) {
    console.warn('[map-point-cloud-sync] listFeed', e);
    return store.listMapPoints();
  }
}

async function saveMapPointToCloud(point) {
  if (!cloudApi.cloudEnabled()) {
    return store.addMapPoint(point);
  }
  await ensureCloudLogin();
  const body = await uploadMapImages(point);
  const data = await mapApi('save', body);
  const row = data && data.point;
  if (!row) throw new Error('提交失败');
  store.pushMessage(
    '地图标点已提交',
    '审核通过后将展示在友好地图，并发放积分',
    'social',
  );
  return { row: store.mapMapPointFromCloud(row), pointsAwarded: 0, pending: true };
}

module.exports = {
  refreshMapPointsFromCloud,
  saveMapPointToCloud,
};
