const store = require('./store');

/** 主页展示的网名：本地已改昵称优先，其次登录态 userInfo */
function getDisplayNickname() {
  const profile = store.getUserProfile();
  const fromProfile = (profile.nickname || '').trim();
  if (fromProfile) return fromProfile;
  const userInfo = wx.getStorageSync('userInfo') || {};
  return (userInfo.nickname || '').trim() || '宠友';
}

module.exports = {
  getDisplayNickname,
};
