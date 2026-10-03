const cloudApi = require('./cloud-api');
const store = require('./store');
const { needsCloudUpload } = require('./cloud-media');
const { ensureCloudSession, hasLoginToken } = require('./cloud-session');

async function uploadProfileAvatar(localPath) {
  if (!localPath || !needsCloudUpload(localPath)) return localPath || '';
  if (!cloudApi.cloudEnabled() || !wx.cloud || !wx.cloud.uploadFile) {
    return localPath;
  }
  await ensureCloudSession();
  const m = String(localPath).match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = (m && m[1]) || 'jpg';
  const cloudPath = `users/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const res = await wx.cloud.uploadFile({ cloudPath, filePath: localPath });
  return (res && res.fileID) || localPath;
}

function mergeUserInfo(patch) {
  const prev = wx.getStorageSync('userInfo') || {};
  const merged = { ...prev, ...patch };
  wx.setStorageSync('userInfo', merged);
  try {
    const app = getApp();
    if (app && app.globalData) app.globalData.userInfo = merged;
  } catch (e) {
    // 模块加载阶段 getApp 可能不可用
  }
  return merged;
}

/**
 * 网名 / 签名写入本地并同步云 users（不依赖其它 profile 模块，避免循环引用）
 */
async function persistUserProfileFields(fields = {}) {
  const nickname = fields.nickname !== undefined ? String(fields.nickname).trim() : undefined;
  const bio = fields.bio !== undefined ? String(fields.bio).trim() : undefined;
  const avatarUrl = fields.avatarUrl !== undefined ? String(fields.avatarUrl).trim() : undefined;

  if (nickname !== undefined && !nickname) {
    throw new Error('昵称不能为空');
  }

  const localPatch = {};
  if (nickname !== undefined) localPatch.nickname = nickname;
  if (bio !== undefined) localPatch.bio = bio;
  if (Object.keys(localPatch).length) store.setUserProfile(localPatch);

  const sessionPatch = {};
  if (nickname !== undefined) sessionPatch.nickname = nickname;
  if (bio !== undefined) sessionPatch.bio = bio;
  if (avatarUrl !== undefined) sessionPatch.avatarUrl = avatarUrl;
  if (Object.keys(sessionPatch).length) mergeUserInfo(sessionPatch);

  if (!cloudApi.cloudEnabled()) {
    return { user: wx.getStorageSync('userInfo') };
  }

  let cloudAvatar = avatarUrl;
  if (avatarUrl !== undefined && cloudAvatar) {
    cloudAvatar = await uploadProfileAvatar(cloudAvatar);
  }

  const payload = {};
  if (nickname !== undefined) payload.nickname = nickname;
  if (bio !== undefined) payload.bio = bio;
  if (avatarUrl !== undefined) payload.avatarUrl = cloudAvatar || '';
  if (!Object.keys(payload).length) return null;

  if (!hasLoginToken()) {
    throw new Error('请先登录后再保存头像');
  }

  const data = await cloudApi.callApi('auth', 'updateProfile', payload);
  const user = data && data.user;
  if (user) {
    mergeUserInfo({
      ...user,
      avatarUrl: user.avatarUrl || cloudAvatar || '',
      ...(nickname !== undefined ? { nickname } : {}),
      ...(bio !== undefined ? { bio } : {}),
    });
  }
  return { ...(data || {}), uploadedAvatarUrl: cloudAvatar };
}

async function pullUserProfileFromCloud() {
  if (!cloudApi.cloudEnabled()) return null;
  if (!wx.getStorageSync('token')) return null;

  const data = await cloudApi.callApi('auth', 'me', {});
  const user = data && data.user;
  if (!user) return null;

  const local = store.getUserProfile();
  const localNick = (local.nickname || '').trim();
  const localBio = (local.bio || '').trim();
  const cloudBio = (user.bio || '').trim();

  const profilePatch = {};
  if (localNick) profilePatch.nickname = localNick;
  else if (user.nickname) profilePatch.nickname = String(user.nickname).trim();
  if (cloudBio) profilePatch.bio = cloudBio;
  else if (localBio) profilePatch.bio = localBio;
  if (Object.keys(profilePatch).length) store.setUserProfile(profilePatch);

  mergeUserInfo({
    ...user,
    nickname: profilePatch.nickname || user.nickname,
    bio: profilePatch.bio !== undefined ? profilePatch.bio : user.bio,
  });

  if (user.avatarUrl) {
    store.updateDefaultPetAvatar(user.avatarUrl);
  }

  if (localBio && !cloudBio) {
    try {
      await persistUserProfileFields({ bio: localBio });
    } catch (e) {
      // 忽略：集合未建或云函数未部署
    }
  }

  return wx.getStorageSync('userInfo');
}

module.exports = {
  persistUserProfileFields,
  pullUserProfileFromCloud,
  uploadProfileAvatar,
};
