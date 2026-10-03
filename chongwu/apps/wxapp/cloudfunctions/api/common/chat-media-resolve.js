const cloud = require('wx-server-sdk');

function isCloudFileId(url) {
  return typeof url === 'string' && url.startsWith('cloud://');
}

/** 云函数侧换临时 HTTPS，避免客户端 downloadFile 受云存储「仅创建者可读」限制 */
async function resolveTempUrls(fileIds) {
  const ids = [...new Set((fileIds || []).filter(isCloudFileId))];
  const map = {};
  if (!ids.length) return map;
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    try {
      const res = await cloud.getTempFileURL({ fileList: chunk });
      (res.fileList || []).forEach((item) => {
        if (item.fileID && item.status === 0 && item.tempFileURL) {
          map[item.fileID] = item.tempFileURL;
        }
      });
    } catch (e) {
      console.warn('[chat-media-resolve] getTempFileURL', e);
    }
  }
  return map;
}

async function enrichMessagesWithMediaUrls(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const fileIds = [];
  list.forEach((m) => {
    if (m && isCloudFileId(m.url)) fileIds.push(m.url);
    if (m && isCloudFileId(m.poster)) fileIds.push(m.poster);
  });
  const map = await resolveTempUrls(fileIds);
  if (!Object.keys(map).length) return list;
  return list.map((m) => {
    if (!m) return m;
    const next = { ...m };
    if (isCloudFileId(next.url)) {
      next.fileId = next.url;
      if (map[next.url]) next.url = map[next.url];
    }
    if (isCloudFileId(next.poster)) {
      next.posterFileId = next.poster;
      if (map[next.poster]) next.poster = map[next.poster];
    }
    return next;
  });
}

module.exports = {
  enrichMessagesWithMediaUrls,
};
