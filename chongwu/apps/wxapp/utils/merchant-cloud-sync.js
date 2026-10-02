const cloudApi = require('./cloud-api');
const store = require('./store');

function merchantApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('merchants', action, payload);
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
  const cloudPath = `merchants/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: localPath }).then((res) => res.fileID);
}

async function resolveUrl(url) {
  if (!url) return '';
  if (!needsCloudUpload(url)) return url;
  return uploadOne(url);
}

async function uploadMerchantMedia(payload) {
  const next = { ...payload };
  next.cover = await resolveUrl(next.cover);
  next.logoUrl = await resolveUrl(next.logoUrl || next.cover);
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

async function refreshMerchantsFromCloud(options = {}) {
  if (!cloudApi.cloudEnabled()) return store.listMerchants();
  await ensureCloudLogin();
  try {
    const payload = { limit: options.limit || 80 };
    if (options.city) payload.city = options.city;
    if (options.type) payload.type = options.type;
    const data = await merchantApi('listFeed', payload);
    const list = (data && data.list) || [];
    return store.replaceAllMerchantsFromCloud(list);
  } catch (e) {
    console.warn('[merchant-cloud-sync] listFeed', e);
    return store.listMerchants();
  }
}

async function fetchMerchantFromCloud(id) {
  if (!cloudApi.cloudEnabled() || !id) return store.getMerchantFromCache(id);
  await ensureCloudLogin();
  try {
    const data = await merchantApi('get', { id: String(id) });
    const merchant = data && data.merchant;
    if (merchant) store.upsertMerchantFromCloud(merchant);
    return merchant || store.getMerchantFromCache(id);
  } catch (e) {
    return store.getMerchantFromCache(id);
  }
}

async function saveMerchantToCloud(payload, merchantId) {
  if (!cloudApi.cloudEnabled()) {
    throw new Error('云开发未启用');
  }
  await ensureCloudLogin();
  const body = await uploadMerchantMedia(payload);
  const data = await merchantApi('save', merchantId ? { ...body, id: merchantId } : body);
  const merchant = data && data.merchant;
  if (!merchant) throw new Error('保存失败');
  store.upsertMerchantFromCloud(merchant);
  return merchant;
}

module.exports = {
  refreshMerchantsFromCloud,
  fetchMerchantFromCloud,
  saveMerchantToCloud,
};
