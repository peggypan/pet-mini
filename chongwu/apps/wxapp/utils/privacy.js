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
        resolve(true);
      },
      fail: () => resolve(true),
    });
  });
}

module.exports = {
  PRIVACY_GATE,
  isPrivacyScopeError,
  showPrivacyGuide,
  redirectToPrivacyGateIfNeeded,
};
