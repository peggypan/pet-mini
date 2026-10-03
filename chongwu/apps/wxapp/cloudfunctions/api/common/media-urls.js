function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function isBrokenMediaUrl(url) {
  const u = trim(url);
  if (!u) return false;
  return (
    u.startsWith('http://tmp/')
    || u.startsWith('https://tmp/')
    || u.startsWith('wxfile://')
    || u.startsWith('http://127.0.0.1')
  );
}

function isAllowedMediaUrl(url) {
  const u = trim(url);
  if (!u) return true;
  if (isBrokenMediaUrl(u)) return false;
  if (u.startsWith('cloud://')) return true;
  if (u.startsWith('/assets/')) return true;
  if (u.startsWith('https://') || u.startsWith('http://')) return true;
  return false;
}

function sanitizeMediaList(list) {
  const raw = Array.isArray(list) ? list : [];
  let changed = false;
  const next = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const url = trim(item.url);
      if (!url || isBrokenMediaUrl(url)) {
        changed = true;
        return null;
      }
      let poster = trim(item.poster);
      if (poster && isBrokenMediaUrl(poster)) {
        poster = '';
        changed = true;
      }
      return { ...item, url, poster: poster || item.poster };
    })
    .filter(Boolean);
  if (next.length !== raw.length) changed = true;
  return { mediaList: next, changed };
}

function sanitizeMediaFields(doc) {
  const patch = {};
  let changed = false;

  ['cover', 'image', 'avatar', 'hostAvatar'].forEach((key) => {
    const v = doc && doc[key];
    if (v && isBrokenMediaUrl(v)) {
      patch[key] = '';
      changed = true;
    }
  });

  if (doc && Array.isArray(doc.images)) {
    const images = doc.images.filter((u) => u && !isBrokenMediaUrl(u));
    if (images.length !== doc.images.length) {
      patch.images = images;
      changed = true;
    }
  }

  const { mediaList, changed: mlChanged } = sanitizeMediaList(doc && doc.mediaList);
  if (mlChanged) {
    patch.mediaList = mediaList;
    changed = true;
    if (!patch.image && !patch.cover) {
      const first = mediaList.find((m) => m.type === 'image');
      if (first && first.url) patch.image = first.url;
      else if (doc && doc.image && isBrokenMediaUrl(doc.image)) patch.image = '';
    }
  }

  return { patch, changed };
}

function validateMediaPayload(body) {
  const urls = [];
  if (body.cover) urls.push(body.cover);
  if (body.image) urls.push(body.image);
  if (body.avatar) urls.push(body.avatar);
  if (body.hostAvatar) urls.push(body.hostAvatar);
  (body.images || []).forEach((u) => urls.push(u));
  (body.mediaList || []).forEach((m) => {
    if (m && m.url) urls.push(m.url);
    if (m && m.poster) urls.push(m.poster);
  });
  const bad = urls.find((u) => isBrokenMediaUrl(u));
  if (bad) {
    return '图片尚未上传到云存储，请重新选择图片后再发布';
  }
  return '';
}

module.exports = {
  isBrokenMediaUrl,
  isAllowedMediaUrl,
  sanitizeMediaList,
  sanitizeMediaFields,
  validateMediaPayload,
};
