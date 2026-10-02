const cloudApi = require('./cloud-api');

function hasLoginToken() {
  try {
    const app = getApp();
    if (app && app.globalData && app.globalData.token) return true;
  } catch (e) {
    // ignore
  }
  try {
    return !!wx.getStorageSync('token');
  } catch (e) {
    return false;
  }
}

function persistCloudSession(data) {
  if (!data || !data.token) return;
  try {
    const app = getApp();
    app.globalData.token = data.token;
    app.globalData.userInfo = data.user;
    wx.setStorageSync('token', data.token);
    wx.setStorageSync('userInfo', data.user);
  } catch (e) {
    // ignore
  }
}

async function ensureCloudSession() {
  if (!cloudApi.cloudEnabled() || !hasLoginToken()) return null;
  try {
    const data = await cloudApi.login();
    persistCloudSession(data);
    return data;
  } catch (e) {
    console.warn('[cloud-session] refresh', e);
    return null;
  }
}

module.exports = {
  hasLoginToken,
  persistCloudSession,
  ensureCloudSession,
};
