const cloudApi = require('./cloud-api');
const { needsCloudUpload } = require('./cloud-media');
const { hasLoginToken, ensureCloudSession } = require('./cloud-session');

const LOCAL_KEY = 'mvp_user_feedback_queue';

function uploadOne(localPath) {
  const m = localPath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = (m && m[1]) || 'jpg';
  const cloudPath = `feedback/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: localPath }).then((res) => res.fileID);
}

async function resolveImageUrls(images) {
  const list = Array.isArray(images) ? images : [];
  return Promise.all(
    list.map(async (url) => {
      if (!url) return '';
      if (!needsCloudUpload(url)) return url;
      return uploadOne(url);
    }),
  );
}

function saveFeedbackLocally(payload) {
  const row = {
    id: `local_${Date.now()}`,
    ...payload,
    createdAt: new Date().toISOString(),
    status: 'local',
  };
  const prev = wx.getStorageSync(LOCAL_KEY) || [];
  prev.unshift(row);
  wx.setStorageSync(LOCAL_KEY, prev.slice(0, 20));
  return row;
}

async function submitUserFeedback(payload) {
  const body = { ...(payload || {}) };
  if (cloudApi.cloudEnabled() && hasLoginToken()) {
    await ensureCloudSession();
    const images = await resolveImageUrls(body.images || []);
    const data = await cloudApi.submitUserFeedback({ ...body, images });
    return { ok: true, id: data && data.id, cloud: true };
  }
  saveFeedbackLocally(body);
  return { ok: true, cloud: false };
}

module.exports = {
  submitUserFeedback,
};
