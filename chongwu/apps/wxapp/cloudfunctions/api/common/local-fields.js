const TYPES = ['lost', 'found', 'adopt', 'rescue'];

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function normalizeMediaList(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const type = item.type === 'video' ? 'video' : 'image';
      const url = trim(item.url);
      if (!url) return null;
      if (type === 'video') {
        return {
          type: 'video',
          url,
          poster: trim(item.poster) || url,
          duration: item.duration || 0,
        };
      }
      return { type: 'image', url };
    })
    .filter(Boolean)
    .slice(0, 6);
}

function pickLocalPayload(raw) {
  const p = raw || {};
  const mediaList = normalizeMediaList(p.mediaList);
  const images = Array.isArray(p.images)
    ? p.images.filter(Boolean).slice(0, 6)
    : mediaList.filter((m) => m.type === 'image').map((m) => m.url);
  const image = trim(p.image) || images[0] || '';

  let geoLocation = p.geoLocation;
  if (geoLocation && typeof geoLocation === 'object') {
    geoLocation = {
      name: trim(geoLocation.name),
      address: trim(geoLocation.address),
      latitude: geoLocation.latitude != null ? Number(geoLocation.latitude) : undefined,
      longitude: geoLocation.longitude != null ? Number(geoLocation.longitude) : undefined,
    };
  } else {
    geoLocation = null;
  }

  const type = TYPES.includes(p.type) ? p.type : 'adopt';

  return {
    type,
    title: trim(p.title),
    desc: trim(p.desc),
    contact: trim(p.contact),
    location: trim(p.location),
    geoLocation,
    city: trim(p.city),
    mediaList,
    images,
    image,
    userName: trim(p.userName),
  };
}

function validateLocal(body) {
  if (!trim(body.title)) return '请填写标题';
  if (!body.desc) return '请填写描述';
  if (body.contact && !/^1\d{10}$/.test(body.contact)) return '手机号格式不正确';
  return '';
}

function publicLocal(doc, viewerOpenid) {
  if (!doc) return null;
  const { _id, _openid, ...rest } = doc;
  const isMine = viewerOpenid && (doc.openid === viewerOpenid || doc._openid === viewerOpenid);
  return {
    id: _id,
    ...rest,
    isMine: !!isMine,
    userName: isMine ? '我' : rest.userName,
    time: '刚刚',
    likes: rest.likes || 0,
    comments: rest.comments || 0,
    shares: rest.shares || 0,
    liked: !!rest.liked && isMine,
  };
}

module.exports = {
  pickLocalPayload,
  validateLocal,
  publicLocal,
  TYPES,
};
