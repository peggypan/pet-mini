const { ensurePrivacyAuthorize, isPrivacyScopeError, showPrivacyGuide } = require('./privacy');

/**
 * 封装 wx.chooseMedia：先走隐私授权，失败时给出配置指引
 */
function chooseMedia(options = {}) {
  const { success, fail, complete, ...rest } = options;

  return ensurePrivacyAuthorize()
    .then(() => new Promise((resolve, reject) => {
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
    }))
    .catch((err) => {
      if (isPrivacyScopeError(err)) showPrivacyGuide();
      if (fail) fail(err);
      throw err;
    });
}

module.exports = { chooseMedia };
