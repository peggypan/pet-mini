/** 麦克风授权（语音消息） */

const { redirectToPrivacyGateIfNeeded, isPrivacyScopeError } = require('./privacy');

function showRecordPrivacyGuide() {
  wx.showModal({
    title: '需完善隐私声明',
    content:
      '请在微信小程序后台「设置 → 用户隐私保护指引」中声明「麦克风」，用于发送语音消息；提交并发布新版本后约 5 分钟生效。',
    confirmText: '我知道了',
    showCancel: false,
  });
}

function ensureRecordPermission() {
  return new Promise((resolve, reject) => {
    wx.getSetting({
      success: (res) => {
        const auth = res.authSetting['scope.record'];
        if (auth === true) {
          resolve();
          return;
        }
        if (auth === false) {
          wx.showModal({
            title: '需要麦克风权限',
            content: '发送语音需在设置中允许使用麦克风',
            confirmText: '去设置',
            success: (modal) => {
              if (modal.confirm) wx.openSetting();
            },
          });
          reject(new Error('record:denied'));
          return;
        }
        wx.authorize({
          scope: 'scope.record',
          success: () => resolve(),
          fail: () => {
            wx.showModal({
              title: '需要麦克风权限',
              content: '请允许使用麦克风以发送语音消息',
              confirmText: '去设置',
              success: (modal) => {
                if (modal.confirm) wx.openSetting();
              },
            });
            reject(new Error('record:auth fail'));
          },
        });
      },
      fail: reject,
    });
  });
}

function ensureRecordReady() {
  return redirectToPrivacyGateIfNeeded().then((ok) => {
    if (!ok) return Promise.reject(new Error('privacy:gate'));
    return ensureRecordPermission();
  });
}

module.exports = {
  ensureRecordPermission,
  ensureRecordReady,
  isPrivacyScopeError,
  showRecordPrivacyGuide,
};
