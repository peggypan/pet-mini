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
  return wx.cloud
    .uploadFile({ cloudPath, filePath: localPath })
    .then((res) => {
      if (!res || !res.fileID) throw new Error('图片上传失败，请重试');
      return res.fileID;
    });
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
  const stillLocal = imageFields.filter((key) => next[key] && needsCloudUpload(next[key]));
  if (stillLocal.length) {
    throw new Error('证件或封面尚未上传到云存储，请重新选择图片');
  }
  return next;
}

async function ensureCloudLogin() {
  try {
    const loginData = await cloudApi.callApi('auth', 'login');
    if (loginData && loginData.token) {
      const app = getApp();
      app.globalData.token = loginData.token;
      app.globalData.userInfo = loginData.user;
      wx.setStorageSync('token', loginData.token);
      wx.setStorageSync('userInfo', loginData.user);
    }
    return loginData;
  } catch (e) {
    console.warn('[host-apply-cloud-sync] auth.login', e);
    throw new Error((e && e.message) || '请先登录后再操作');
  }
}

async function syncHostApplyClubState(data) {
  if (!data || !data.apply) return data;
  let next = data;

  if (!next.clubId) {
    try {
      next = await hostApplyApi('ensureClub');
      store.applyHostApplyFromCloud(next);
    } catch (e) {
      console.warn('[host-apply-cloud-sync] ensureClub', e);
    }
  }

  return next;
}

async function refreshHostApplyFromCloud() {
  if (!cloudApi.cloudEnabled()) {
    return { local: store.getClubApply(), remote: null };
  }
  await ensureCloudLogin();
  try {
    let data = await hostApplyApi('getMine');
    store.applyHostApplyFromCloud(data);
    data = await syncHostApplyClubState(data);
    return { local: store.getClubApply(), remote: (data && data.apply) || null };
  } catch (e) {
    console.warn('[host-apply-cloud-sync] getMine', e);
    return { local: store.getClubApply(), remote: null };
  }
}

async function submitHostApplyToCloud(payload) {
  if (!cloudApi.cloudEnabled()) {
    return store.submitClubApply(payload);
  }
  await ensureCloudLogin();
  const body = await uploadHostApplyMedia(payload);
  let data = await hostApplyApi('submit', body);
  let local = store.applyHostApplyFromCloud(data);
  if (!local) {
    local = store.applyHostApplyFromCloud({
      apply: data && data.apply,
      auditStatus: (data && data.auditStatus) || 'pending',
      clubId: data && data.clubId,
      club: data && data.club,
    });
  }
  if (!local) {
    throw new Error('提交失败，请检查网络或稍后重试');
  }
  try {
    data = await syncHostApplyClubState(data);
    if (data && data.apply) {
      const synced = store.applyHostApplyFromCloud(data);
      if (synced) local = synced;
    }
  } catch (e) {
    console.warn('[host-apply-cloud-sync] sync after submit', e);
  }
  store.pushMessage('主理人入驻已提交', '审核中，请耐心等待', 'system');
  return local;
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
  syncHostApplyClubState,
};
