const ZONES = ['normal', 'match', 'healing'];
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

function pickBuddyPayload(raw) {
  const p = raw || {};
  const zone = ZONES.includes(p.zone) ? p.zone : 'normal';
  const mediaList = normalizeMediaList(p.mediaList);
  const images = Array.isArray(p.images)
    ? p.images.filter(Boolean).slice(0, 6)
    : mediaList.filter((m) => m.type === 'image').map((m) => m.url);
  const firstImage = mediaList.find((m) => m.type === 'image');
  const firstVideo = mediaList.find((m) => m.type === 'video');
  const cover = trim(p.cover) || (firstImage && firstImage.url) || (firstVideo && firstVideo.poster) || '';

  let location = p.location;
  if (location && typeof location === 'object') {
    location = {
      name: trim(location.name),
      address: trim(location.address),
      latitude: location.latitude != null ? Number(location.latitude) : undefined,
      longitude: location.longitude != null ? Number(location.longitude) : undefined,
    };
  } else {
    location = null;
  }

  return {
    userName: trim(p.userName),
    avatar: trim(p.avatar),
    petName: trim(p.petName),
    breed: trim(p.breed),
    age: trim(p.age),
    personality: trim(p.personality),
    verified: !!p.verified,
    buddyType: trim(p.buddyType) || '宠友',
    zone,
    expectTime: trim(p.expectTime) || '可协商',
    expectPlace: trim(p.expectPlace) || '同城',
    expectPlaceAddress: trim(p.expectPlaceAddress),
    location,
    title: trim(p.title),
    desc: trim(p.desc),
    tags: Array.isArray(p.tags) ? p.tags.filter(Boolean).slice(0, 8) : [],
    creditTags: Array.isArray(p.creditTags) ? p.creditTags.filter(Boolean).slice(0, 6) : [],
    mediaList,
    images,
    cover,
    openSignup: p.openSignup !== false,
    distance: trim(p.distance) || '同城',
    city: trim(p.city),
  };
}

function validateBuddy(body) {
  if (!trim(body.title)) {
    return '请填写标题';
  }
  const mediaMsg = validateMediaPayload(body);
  if (mediaMsg) return mediaMsg;
  const text = trim(body.desc);
  if (!text && !(body.mediaList && body.mediaList.length)) {
    return '请填写描述或上传媒体';
  }
  return '';
}

function publicBuddy(doc, viewerOpenid) {
  if (!doc) return null;
  const { _id, _openid, ...rest } = doc;
  const isMine = viewerOpenid && (doc.openid === viewerOpenid || doc._openid === viewerOpenid);
  return {
    id: _id,
    ...rest,
    isMine: !!isMine,
    userName: isMine ? '我' : rest.userName,
  };
}

module.exports = {
  pickBuddyPayload,
  validateBuddy,
  publicBuddy,
  ZONES,
};
