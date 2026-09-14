const { isPrivacyScopeError, showPrivacyGuide, redirectToPrivacyGateIfNeeded } = require('./privacy');

/**
 * 封装 wx.chooseMedia（隐私已在启动页统一授权，此处不再单独弹窗）
 */
function chooseMedia(options = {}) {
  const { success, fail, complete, ...rest } = options;

  return redirectToPrivacyGateIfNeeded().then((ok) => {
    if (!ok) return Promise.reject(new Error('privacy:not accepted'));
    return new Promise((resolve, reject) => {
      wx.chooseMedia({
        ...rest,
        success: (res) => {
          if (success) success(res);
          resolve(res);
        },
        fail: (err) => {
          if (isPrivacyScopeError(err)) showPrivacyGuide();
          if (fail) fail(err);
          reject(err);
        },
        complete: (res) => {
          if (complete) complete(res);
        },
      });
    });
  });
}

module.exports = { chooseMedia };
