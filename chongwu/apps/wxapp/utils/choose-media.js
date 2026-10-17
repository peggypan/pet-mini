const { isPrivacyScopeError, showPrivacyGuide, redirectToPrivacyGateIfNeeded } = require('./privacy');

function invokeChooseMedia(rest, handlers) {
  const { success, fail, complete, resolve, reject } = handlers;
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
}

/** 真机选图前需触发隐私授权，否则 chooseMedia 可能无弹窗直接失败 */
function ensurePrivacyAuthorizeForMedia() {
  if (!wx.requirePrivacyAuthorize) return Promise.resolve();
  return new Promise((resolve, reject) => {
    wx.requirePrivacyAuthorize({
      success: () => resolve(),
      fail: (err) => {
        if (isPrivacyScopeError(err)) showPrivacyGuide();
        reject(err || new Error('privacy:authorize denied'));
      },
    });
  });
}

/**
 * 封装 wx.chooseMedia（隐私已在启动页统一授权，此处不再单独弹窗）
 */
function chooseMedia(options = {}) {
  const { success, fail, complete, ...rest } = options;

  return redirectToPrivacyGateIfNeeded().then((ok) => {
    if (!ok) return Promise.reject(new Error('privacy:not accepted'));
    return ensurePrivacyAuthorizeForMedia().then(
      () =>
        new Promise((resolve, reject) => {
          invokeChooseMedia(rest, { success, fail, complete, resolve, reject });
        }),
    );
  });
}

module.exports = { chooseMedia };
