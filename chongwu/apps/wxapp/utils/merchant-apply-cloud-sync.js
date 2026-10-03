const cloudApi = require('./cloud-api');
const store = require('./store');

function applyApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('merchant_applies', action, payload);
}

const { needsCloudUpload } = require('./cloud-media');

function uploadOne(localPath) {
  const m = localPath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = (m && m[1]) || 'jpg';
  const cloudPath = `merchant-applies/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: localPath }).then((res) => res.fileID);
}

async function resolveUrl(url) {
  if (!url) return '';
  if (!needsCloudUpload(url)) return url;
  return uploadOne(url);
}

async function uploadApplyMedia(body) {
  const next = { ...body };
  next.licenseImage = await resolveUrl(next.licenseImage);
  next.idFrontImage = await resolveUrl(next.idFrontImage);
  next.idBackImage = await resolveUrl(next.idBackImage);
  next.shopFrontImage = await resolveUrl(next.shopFrontImage);
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

function qualifyPayloadToMerchantApply(payload) {
  const p = payload || {};
  return {
    shopName: p.companyName,
    companyName: p.companyName,
    contact: p.legalPerson,
    legalPerson: p.legalPerson,
    phone: p.contactPhone,
    contactPhone: p.contactPhone,
    city: p.city || store.getCity(),
    licenseNo: p.licenseNo,
    licenseImage: p.licenseImage,
    idFrontImage: p.idFrontImage,
    idBackImage: p.idBackImage,
    shopFrontImage: p.shopFrontImage,
    address: p.address || '',
    intro: p.intro || '',
  };
}

async function refreshMerchantApplyFromCloud() {
  if (!cloudApi.cloudEnabled()) return store.getMerchantShopApply();
  await ensureCloudLogin();
  try {
    const data = await applyApi('getMine');
    store.applyMerchantApplyFromCloud(data);
    return store.getMerchantShopApply();
  } catch (e) {
    console.warn('[merchant-apply-cloud-sync] getMine', e);
    return store.getMerchantShopApply();
  }
}

async function submitMerchantApplyToCloud(payload) {
  if (!cloudApi.cloudEnabled()) {
    return store.submitMerchantShopApply(payload);
  }
  await ensureCloudLogin();
  const body = await uploadApplyMedia(payload);
  const data = await applyApi('submit', body);
  store.applyMerchantApplyFromCloud(data);
  return data && data.apply;
}

async function submitMerchantApplyFromQualifyPayload(qualifyPayload) {
  const row = qualifyPayloadToMerchantApply(qualifyPayload);
  if (!cloudApi.cloudEnabled()) return null;
  try {
    await submitMerchantApplyToCloud(row);
    return true;
  } catch (e) {
    console.warn('[merchant-apply-cloud-sync] submit from qualify', e);
    return null;
  }
}

async function withdrawMerchantApplyFromCloud() {
  if (!cloudApi.cloudEnabled()) return false;
  await ensureCloudLogin();
  await applyApi('remove');
  store.clearMerchantShopApply();
  return true;
}

module.exports = {
  refreshMerchantApplyFromCloud,
  submitMerchantApplyToCloud,
  submitMerchantApplyFromQualifyPayload,
  withdrawMerchantApplyFromCloud,
  qualifyPayloadToMerchantApply,
};
