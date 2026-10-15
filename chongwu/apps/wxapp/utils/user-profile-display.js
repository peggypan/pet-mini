const store = require('./store');
const { getDefaultPet } = require('./catalog');

function isUsableAvatarUrl(url) {
  const s = (url || '').trim();
  return !!s && !s.includes('/assets/mock/');
}

/**
 * 个人主页头像：与「编辑主页」一致，优先账号 avatarUrl，其次宠物档案头像
 */
function getProfileAvatarUrl() {
  const userInfo = wx.getStorageSync('userInfo') || {};
  const fromUser = (userInfo.avatarUrl || '').trim();
  if (isUsableAvatarUrl(fromUser)) return fromUser;

  const pet = getDefaultPet();
  const fromPet = (pet.avatarUrl || pet.avatar || '').trim();
  if (isUsableAvatarUrl(fromPet)) return fromPet;

  return pet.avatar || fromUser || fromPet || '/assets/mock/real_avatar.jpg';
}

/** 保存头像后：用户与默认宠物档案写入同一 URL，避免两处各显示一张 */
function syncProfileAvatarEverywhere(avatarUrl) {
  const url = (avatarUrl || '').trim();
  if (!url) return;
  const prev = wx.getStorageSync('userInfo') || {};
  wx.setStorageSync('userInfo', { ...prev, avatarUrl: url });
  try {
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.userInfo = { ...(app.globalData.userInfo || {}), avatarUrl: url };
    }
  } catch (e) {
    // ignore
  }
  store.updateDefaultPetAvatar(url);
}

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
  getProfileAvatarUrl,
  syncProfileAvatarEverywhere,
  isUsableAvatarUrl,
};
