const { formatPublishTime } = require('./relative-time');

const LOST_TYPES = ['lost', 'found', 'adopt', 'rescue'];
const { validateMediaPayload } = require('./media-urls');

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

function pickSocialPayload(raw) {
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

  const lostType = LOST_TYPES.includes(p.lostType) ? p.lostType : '';

  return {
    userName: trim(p.userName),
    petName: trim(p.petName),
    avatar: trim(p.avatar),
    zone: trim(p.zone) || 'dog',
    topic: trim(p.topic),
    title: trim(p.title),
    content: trim(p.content),
    lostType,
    mediaList,
    images,
    image,
    circle: trim(p.circle),
    location: trim(p.location),
    geoLocation,
    city: trim(p.city),
    essence: !!p.essence,
  };
}

function validateSocial(body) {
  if (body.lostType && !trim(body.title)) {
    return '请填写标题';
  }
  const mediaMsg = validateMediaPayload(body);
  if (mediaMsg) return mediaMsg;
  const text = trim(body.content);
  if (!text && !(body.mediaList && body.mediaList.length)) {
    return '请填写内容或上传媒体';
  }
  return '';
}

function publicSocial(doc, viewerOpenid) {
  if (!doc) return null;
  const { _id, _openid, ...rest } = doc;
  const isMine = viewerOpenid && (doc.openid === viewerOpenid || doc._openid === viewerOpenid);
  const time = formatPublishTime(rest.createdAt || rest.updatedAt);
  return {
    id: _id,
    ...rest,
    isMine: !!isMine,
    userName: isMine ? '我' : rest.userName,
    liked: !!rest.liked && isMine,
    createdAt: rest.createdAt,
    updatedAt: rest.updatedAt,
    time,
  };
}

module.exports = {
  pickSocialPayload,
  validateSocial,
  publicSocial,
  LOST_TYPES,
};
