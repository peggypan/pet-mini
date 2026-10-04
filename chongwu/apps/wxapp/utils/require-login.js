/**
 * 登录守卫：未登录跳转「我的」Tab 登录区。
 * 写操作/互动请用 pet-profile-guard.requireInteract（先登录再校验宠物档案）。
 * 仅登录即可的操作（我的活动、编辑资料、宠物表单）用 requireLogin。
 */
const { hasLoginToken } = require('./cloud-session');

const PROFILE_TAB = '/pages/profile/profile';
const LOGIN_PROMPT_KEY = 'mvp_show_login_prompt';

function isLoggedIn() {
  try {
    const app = getApp();
    if (app && typeof app.isLoggedIn === 'function' && app.isLoggedIn()) {
      return true;
    }
  } catch (e) {
    // ignore
  }
  return hasLoginToken();
}

function markLoginPromptPending() {
  try {
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.pendingLoginPrompt = true;
    }
  } catch (e) {
    // ignore
  }
  try {
    wx.setStorageSync(LOGIN_PROMPT_KEY, 1);
  } catch (e) {
    // ignore
  }
}

/** 跳转「我的」Tab 展示登录区 */
function goLoginPage() {
  markLoginPromptPending();
  wx.switchTab({ url: PROFILE_TAB });
}

/**
 * 已登录返回 true；未登录则跳转登录并返回 false
 */
function requireLogin(options = {}) {
  if (isLoggedIn()) return true;
  goLoginPage(options);
  return false;
}

function consumeLoginPromptFlag() {
  let pending = false;
  try {
    const app = getApp();
    if (app && app.globalData && app.globalData.pendingLoginPrompt) {
      pending = true;
      app.globalData.pendingLoginPrompt = false;
    }
  } catch (e) {
    // ignore
  }
  if (!pending) {
    try {
      pending = !!wx.getStorageSync(LOGIN_PROMPT_KEY);
      if (pending) wx.removeStorageSync(LOGIN_PROMPT_KEY);
    } catch (e) {
      // ignore
    }
  }
  return pending;
}

module.exports = {
  PROFILE_TAB,
  LOGIN_PROMPT_KEY,
  isLoggedIn,
  goLoginPage,
  requireLogin,
  consumeLoginPromptFlag,
};
