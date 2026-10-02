const {
  redirectToPrivacyGateIfNeeded,
  isPrivacyScopeError,
  showPrivacyGuide,
} = require('./privacy');

function ensureCameraAuthorized() {
  return new Promise((resolve) => {
    wx.getSetting({
      success: (res) => {
        const auth = (res && res.authSetting) || {};
        if (auth['scope.camera'] === true) {
          resolve(true);
          return;
        }
        if (auth['scope.camera'] === false) {
          wx.showModal({
            title: '需要摄像头权限',
            content: '扫码核销需要使用摄像头。请在设置中允许「摄像头」权限。',
            confirmText: '去设置',
            cancelText: '取消',
            success: (r) => {
              if (r.confirm) {
                wx.openSetting({
                  success: (st) => {
                    resolve(!!(st.authSetting && st.authSetting['scope.camera']));
                  },
                  fail: () => resolve(false),
                });
              } else {
                resolve(false);
              }
            },
          });
          return;
        }
        wx.authorize({
          scope: 'scope.camera',
          success: () => resolve(true),
          fail: () => resolve(true),
        });
      },
      fail: () => resolve(true),
    });
  });
}

function decodeBase64Utf8(b64) {
  try {
    const ab = wx.base64ToArrayBuffer(String(b64 || '').replace(/\s/g, ''));
    const u8 = new Uint8Array(ab);
    let raw = '';
    for (let i = 0; i < u8.length; i += 1) raw += String.fromCharCode(u8[i]);
    return decodeURIComponent(escape(raw));
  } catch (e) {
    return '';
  }
}

function looksLikeTicketText(text) {
  const t = String(text || '').trim();
  if (!t) return false;
  if (/^CTT:/i.test(t)) return true;
  if (/petmini:\/\/event-checkin/i.test(t)) return true;
  if (/event-checkin\?/i.test(t)) return true;
  if (/核销码[：:\s]*[A-Z0-9]{4,8}/i.test(t)) return true;
  if (/^[A-Z0-9]{4,8}$/i.test(t)) return true;
  if (/[?&]code=[A-Z0-9]{4,8}/i.test(t)) return true;
  return false;
}

/** 合并 result / rawData(base64) / path，优先可识别为核销码的文本 */
function readScanPayload(res) {
  if (!res) return '';
  const candidates = [];
  if (res.result) candidates.push(String(res.result).trim());
  if (res.rawData) {
    const decoded = decodeBase64Utf8(res.rawData);
    if (decoded) candidates.push(decoded.trim());
  }
  if (res.path) candidates.push(String(res.path).trim());

  for (let i = 0; i < candidates.length; i += 1) {
    if (looksLikeTicketText(candidates[i])) return candidates[i];
  }
  if (candidates.length > 1 && candidates[1]) return candidates[1];
  return candidates[0] || '';
}

/**
 * 打开扫码（隐私 + 相机权限 + 回调延迟，避免扫码页关闭后 UI 无反应）
 */
function scanTicketCode(options = {}) {
  const beforeOpen = options.beforeOpen;
  return redirectToPrivacyGateIfNeeded()
    .then((privacyOk) => {
      if (!privacyOk) return Promise.reject(new Error('请先同意隐私协议'));
      return ensureCameraAuthorized();
    })
    .then((cameraOk) => {
      if (!cameraOk) return Promise.reject(new Error('未获得摄像头权限'));
      if (typeof beforeOpen === 'function') beforeOpen();
      return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn, val) => {
          if (settled) return;
          settled = true;
          fn(val);
        };
        wx.scanCode({
          onlyFromCamera: false,
          scanType: ['qrCode', 'barCode', 'datamatrix'],
          success: (res) => {
            setTimeout(() => finish(resolve, res), 280);
          },
          fail: (err) => {
            setTimeout(() => finish(reject, err || new Error('扫码失败')), 80);
          },
        });
      });
    })
    .then((res) => readScanPayload(res));
}

module.exports = {
  scanTicketCode,
  readScanPayload,
};
