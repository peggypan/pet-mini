/** 用户隐私授权（wx.chooseMedia 等接口前置） */

function ensurePrivacyAuthorize() {
  return new Promise((resolve, reject) => {
    if (!wx.getPrivacySetting) {
      resolve();
      return;
    }
    wx.getPrivacySetting({
      success: (res) => {
        if (!res.needAuthorization) {
          resolve();
          return;
        }
        if (!wx.requirePrivacyAuthorize) {
          reject(new Error('requirePrivacyAuthorize:fail not supported'));
          return;
        }
        wx.requirePrivacyAuthorize({
          success: () => resolve(),
          fail: (err) => reject(err || new Error('requirePrivacyAuthorize:fail')),
        });
      },
      fail: (err) => reject(err || new Error('getPrivacySetting:fail')),
    });
  });
}

function isPrivacyScopeError(err) {
  const msg = String((err && (err.errMsg || err.message)) || '');
  return msg.includes('privacy agreement') || Number(err && err.errno) === 112;
}

function showPrivacyGuide() {
  wx.showModal({
    title: '需完善隐私声明',
    content: '请在微信小程序后台「设置 → 服务内容声明 → 用户隐私保护指引」中声明：\n1. 收集你选中的照片或视频信息\n2. 若使用拍照，还需声明摄像头\n\n提交审核并发布新版本后约 5 分钟生效；开发阶段可在开发者工具重新编译并清除缓存后重试。',
    confirmText: '我知道了',
    showCancel: false,
  });
}

module.exports = {
  ensurePrivacyAuthorize,
  isPrivacyScopeError,
  showPrivacyGuide,
};
