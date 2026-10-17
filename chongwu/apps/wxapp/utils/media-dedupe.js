function mediaUrlKey(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  const noQuery = s.split('?')[0];
  return noQuery || s;
}

function pickMediaItemUrl(item) {
  if (!item) return '';
  if (item.type === 'video') return item.poster || item.url || '';
  return item.url || item.poster || '';
}

/** 相册列表按 URL 去重（可选排除与封面相同的项） */
function dedupeMediaList(mediaList, options = {}) {
  const excludeCover = options.excludeCover;
  const coverKey = excludeCover ? mediaUrlKey(excludeCover) : '';
  const seen = new Set();
  const out = [];
  (mediaList || []).forEach((item) => {
    const key = mediaUrlKey(pickMediaItemUrl(item));
    if (!key || seen.has(key)) return;
    if (coverKey && key === coverKey) return;
    seen.add(key);
    out.push(item);
  });
  return out;
}

function dedupeUrlList(urls, options = {}) {
  const excludeCover = options.excludeCover;
  const coverKey = excludeCover ? mediaUrlKey(excludeCover) : '';
  const seen = new Set();
  const out = [];
  (urls || []).forEach((url) => {
    const key = mediaUrlKey(url);
    if (!key || seen.has(key)) return;
    if (coverKey && key === coverKey) return;
    seen.add(key);
    out.push(String(url).trim());
  });
  return out;
}

module.exports = {
  mediaUrlKey,
  dedupeMediaList,
  dedupeUrlList,
};
