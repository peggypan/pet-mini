const cloudApi = require('./cloud-api');
const store = require('./store');

function hostApplyApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('host_applies', action, payload);
}

const { needsCloudUpload } = require('./cloud-media');

function uploadOne(localPath) {
  const m = localPath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = (m && m[1]) || 'jpg';
  const cloudPath = `host-applies/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: localPath }).then((res) => res.fileID);
}

async function resolveUrl(url) {
  if (!url) return '';
  if (!needsCloudUpload(url)) return url;
  return uploadOne(url);
}

async function uploadHostApplyMedia(body) {
  const next = { ...body };
  if (next.name && !next.clubName) next.clubName = next.name;
  const imageFields = ['cover', 'idFrontImage', 'idBackImage', 'licenseImage'];
  await Promise.all(
    imageFields.map(async (key) => {
      if (next[key]) next[key] = await resolveUrl(next[key]);
    }),
  );
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

async function refreshHostApplyFromCloud() {
  if (!cloudApi.cloudEnabled()) return store.getClubApply();
  await ensureCloudLogin();
  try {
    const data = await hostApplyApi('getMine');
    store.applyHostApplyFromCloud(data);
    return store.getClubApply();
  } catch (e) {
    console.warn('[host-apply-cloud-sync] getMine', e);
    return store.getClubApply();
  }
}

async function submitHostApplyToCloud(payload) {
  if (!cloudApi.cloudEnabled()) {
    return store.submitClubApply(payload);
  }
  await ensureCloudLogin();
  const body = await uploadHostApplyMedia(payload);
  const data = await hostApplyApi('submit', body);
  store.applyHostApplyFromCloud(data);
  store.pushMessage('主理人入驻已提交', '审核通过后可管理俱乐部与活动', 'system');
  return store.getClubApply();
}

async function withdrawHostApplyFromCloud() {
  if (!cloudApi.cloudEnabled()) {
    store.clearClubApply();
    return true;
  }
  await ensureCloudLogin();
  await hostApplyApi('remove');
  store.clearClubApply();
  return true;
}

module.exports = {
  refreshHostApplyFromCloud,
  submitHostApplyToCloud,
  withdrawHostApplyFromCloud,
};
