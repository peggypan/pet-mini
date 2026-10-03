const cloudApi = require('./cloud-api');
const store = require('./store');

function qualifyApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('event_qualify', action, payload);
}

const { needsCloudUpload } = require('./cloud-media');

function uploadOne(localPath) {
  const m = localPath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = (m && m[1]) || 'jpg';
  const cloudPath = `qualify/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: localPath }).then((res) => res.fileID);
}

async function resolveUrl(url) {
  if (!url) return '';
  if (!needsCloudUpload(url)) return url;
  return uploadOne(url);
}

async function uploadQualifyMedia(body) {
  const next = { ...body };
  next.idFrontImage = await resolveUrl(next.idFrontImage);
  next.idBackImage = await resolveUrl(next.idBackImage);
  next.licenseImage = await resolveUrl(next.licenseImage);
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

async function refreshQualifyFromCloud(role) {
  if (!cloudApi.cloudEnabled()) return store.getEventPublishQualify(role);
  await ensureCloudLogin();
  const r = role === 'merchant' ? 'merchant' : 'personal';
  try {
    const data = await qualifyApi('getMine', { role: r });
    store.applyQualifyFromCloud(data);
    if (r === 'merchant') {
      const { refreshMerchantApplyFromCloud } = require('./merchant-apply-cloud-sync');
      await refreshMerchantApplyFromCloud().catch(() => {});
    }
    return store.getEventPublishQualify(r);
  } catch (e) {
    console.warn('[event-qualify-cloud-sync] getMine', e);
    return store.getEventPublishQualify(r);
  }
}

async function submitQualifyToCloud(payload) {
  if (!cloudApi.cloudEnabled()) {
    const role = payload.role === 'merchant' ? 'merchant' : 'personal';
    if (role === 'merchant') {
      store.submitMerchantApply(payload);
    } else {
      store.submitIdentityVerify(payload);
    }
    return store.getEventPublishQualify(role);
  }
  await ensureCloudLogin();
  const body = await uploadQualifyMedia(payload);
  const data = await qualifyApi('submit', body);
  store.applyQualifyFromCloud(data);
  const role = body.role === 'merchant' ? 'merchant' : 'personal';
  if (role === 'merchant') {
    const {
      submitMerchantApplyToCloud,
      qualifyPayloadToMerchantApply,
    } = require('./merchant-apply-cloud-sync');
    await submitMerchantApplyToCloud(
      qualifyPayloadToMerchantApply({ ...body, city: store.getCity() }),
    ).catch((e) => console.warn('[event-qualify] merchant_applies', e));
    store.pushMessage('商家入驻申请已提交', '平台将审核营业资质，请耐心等待', 'system');
  } else {
    store.pushMessage('身份认证已提交', '后台审核通过后可发起个人活动', 'system');
  }
  return store.getEventPublishQualify(role);
}

module.exports = {
  refreshQualifyFromCloud,
  submitQualifyToCloud,
};
