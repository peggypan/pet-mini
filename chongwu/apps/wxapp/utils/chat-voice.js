const { resolveCloudFileUrl, isCloudFileId } = require('./cloud-media');

function isLocalPlayablePath(url) {
  const u = String(url || '');
  return (
    u.startsWith('wxfile://')
    || u.startsWith('http://tmp/')
    || u.startsWith('https://tmp/')
    || (u.startsWith('/') && !u.startsWith('/assets/'))
  );
}

function downloadCloudVoice(fileID) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || !wx.cloud.downloadFile) {
      reject(new Error('cloud unavailable'));
      return;
    }
    wx.cloud.downloadFile({
      fileID,
      success: (res) => {
        if (res.tempFilePath) resolve(res.tempFilePath);
        else reject(new Error('empty tempFilePath'));
      },
      fail: reject,
    });
  });
}

function downloadHttpVoice(url) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) resolve(res.tempFilePath);
        else reject(new Error(`http ${res.statusCode}`));
      },
      fail: reject,
    });
  });
}

/** 供 InnerAudio 使用的本地可播路径 */
async function resolveVoicePlayUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (isLocalPlayablePath(raw)) return raw;
  if (isCloudFileId(raw)) {
    const temp = await resolveCloudFileUrl(raw);
    if (temp && temp !== raw && /^https?:\/\//.test(temp)) {
      try {
        return await downloadHttpVoice(temp);
      } catch (e) {
        console.warn('[chat-voice] http download', e);
        return temp;
      }
    }
    try {
      return await downloadCloudVoice(raw);
    } catch (e) {
      console.warn('[chat-voice] cloud downloadFile', e);
      throw e;
    }
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return downloadHttpVoice(raw);
  }
  return raw;
}

module.exports = {
  resolveVoicePlayUrl,
  isLocalPlayablePath,
};
