/** 隐私相关工具（启动页统一授权，功能点不再单独弹窗） */

const PRIVACY_GATE = '/pages/privacy-gate/privacy-gate';

function isPrivacyScopeError(err) {
  const msg = String((err && (err.errMsg || err.message)) || '');
  return msg.includes('privacy agreement') || Number(err && err.errno) === 112;
}

function showPrivacyGuide() {
  wx.showModal({
    title: '需完善隐私声明',
    content: '请在微信小程序后台「设置 → 服务内容声明 → 用户隐私保护指引」中声明：\n1. 收集你选中的照片或视频信息\n2. 若使用拍照，还需声明摄像头\n\n提交审核并发布新版本后约 5 分钟生效。',
    confirmText: '我知道了',
    showCancel: false,
  });
}

/** 若尚未同意隐私协议，跳转启动授权页（供极少数场景兜底） */
function redirectToPrivacyGateIfNeeded() {
  return new Promise((resolve) => {
    if (!wx.getPrivacySetting) {
      resolve(true);
      return;
    }
    wx.getPrivacySetting({
      success: (res) => {
        if (res.needAuthorization) {
          wx.reLaunch({ url: PRIVACY_GATE });
          resolve(false);
          return;
        }
        try {
          const app = getApp();
          if (app && app.globalData) app.globalData.privacyAccepted = true;
        } catch (e) {
          // ignore
        }
        resolve(true);
      },
      fail: () => resolve(true),
    });
  });
}

/** 登录/手机号授权前：未同意隐私则引导，避免点击后无任何弹窗 */
function ensurePrivacyBeforeLogin() {
  return new Promise((resolve) => {
    if (!wx.getPrivacySetting) {
      resolve(true);
      return;
    }
    wx.getPrivacySetting({
      success: (res) => {
        if (!res.needAuthorization) {
          try {
            const app = getApp();
            if (app && app.globalData) app.globalData.privacyAccepted = true;
          } catch (e) {
            // ignore
          }
          resolve(true);
          return;
        }
        wx.showModal({
          title: '需先同意隐私指引',
          content: '使用微信登录或手机号登录前，请先阅读并同意《用户隐私保护指引》。',
          confirmText: '去同意',
          cancelText: '取消',
          success: (r) => {
            if (r.confirm) {
              wx.reLaunch({ url: PRIVACY_GATE });
            }
            resolve(false);
          },
          fail: () => resolve(false),
        });
      },
      fail: () => resolve(true),
    });
  });
}

function isDevtools() {
  try {
    return wx.getSystemInfoSync().platform === 'devtools';
  } catch (e) {
    return false;
  }
}

module.exports = {
  PRIVACY_GATE,
  isPrivacyScopeError,
  showPrivacyGuide,
  redirectToPrivacyGateIfNeeded,
  ensurePrivacyBeforeLogin,
  isDevtools,
};
