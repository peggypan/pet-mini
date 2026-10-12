/**
 * 地图 marker 的 iconPath 仅支持本地路径；https / cloud:// 需先下载到临时文件。
 */
const { resolveCloudFileUrl } = require('./cloud-media');

const FALLBACK_ICON = '/assets/mock/real_avatar.jpg';
const iconCache = Object.create(null);

function isUsableLocalIcon(path) {
  if (!path || typeof path !== 'string') return false;
  if (path.startsWith('/')) return true;
  return path.startsWith('wxfile://') || path.startsWith('http://tmp/') || path.startsWith('https://tmp/');
}

function downloadToTemp(url) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) resolve(res.tempFilePath);
        else reject(new Error(`download ${res.statusCode}`));
      },
      fail: reject,
    });
  });
}

async function resolveMarkerIconPath(raw) {
  const url = String(raw || '').trim();
  if (!url) return FALLBACK_ICON;
  if (isUsableLocalIcon(url)) return url;
  if (iconCache[url]) return iconCache[url];

  try {
    let fetchUrl = url;
    if (url.startsWith('cloud://')) {
      fetchUrl = await resolveCloudFileUrl(url);
    }
    if (fetchUrl && isUsableLocalIcon(fetchUrl)) {
      iconCache[url] = fetchUrl;
      return fetchUrl;
    }
    if (fetchUrl && (fetchUrl.startsWith('https://') || fetchUrl.startsWith('http://'))) {
      const temp = await downloadToTemp(fetchUrl);
      iconCache[url] = temp;
      return temp;
    }
  } catch (e) {
    console.warn('[map-marker-icon] resolve failed', url, e);
  }
  return FALLBACK_ICON;
}

async function hydrateMapMarkerIcons(markers) {
  const list = markers || [];
  const icons = await Promise.all(
    list.map((m) => resolveMarkerIconPath(m.avatar || m.iconPath)),
  );
  return list.map((m, i) => ({
    ...m,
    iconPath: icons[i] || FALLBACK_ICON,
  }));
}

module.exports = {
  FALLBACK_ICON,
  resolveMarkerIconPath,
  hydrateMapMarkerIcons,
};
