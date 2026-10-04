const { formatPublishTime } = require('./relative-time');

const ROLES = ['personal', 'merchant'];

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function normalizeMediaList(raw, max) {
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
    .slice(0, max || 6);
}

function pickEventPayload(raw) {
  const p = raw || {};
  const mediaList = normalizeMediaList(p.mediaList, 6);
  const detailMediaList = normalizeMediaList(p.detailMediaList, 6);
  const images = Array.isArray(p.images)
    ? p.images.filter(Boolean).slice(0, 6)
    : mediaList.filter((m) => m.type === 'image').map((m) => m.url);
  const detailImages = Array.isArray(p.detailImages)
    ? p.detailImages.filter(Boolean).slice(0, 6)
    : detailMediaList.filter((m) => m.type === 'image').map((m) => m.url);
  const cover = trim(p.cover) || images[0] || '';

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

  const maxPeople = Math.min(100, Math.max(2, Number(p.maxPeople) || 20));
  const remain = p.remain != null ? Math.max(0, Number(p.remain)) : maxPeople;
  const role = ROLES.includes(p.role) ? p.role : 'personal';

  return {
    title: trim(p.title),
    category: trim(p.category),
    role,
    eventType: p.eventType === 'multi' ? 'multi' : 'single',
    eventSessions: Array.isArray(p.eventSessions) ? p.eventSessions.slice(0, 12) : [],
    place: trim(p.place),
    placeAddress: trim(p.placeAddress),
    location,
    eventDate: trim(p.eventDate),
    time: trim(p.time),
    city: trim(p.city),
    maxPeople,
    remain,
    seats: trim(p.seats) || `0/${maxPeople}`,
    fee: trim(p.fee) || '免费报名',
    feeText: trim(p.feeText) || '免费',
    price: Number(p.price) || 0,
    desc: trim(p.desc),
    detailContent: trim(p.detailContent),
    detailMediaList,
    detailImages,
    mediaList,
    images,
    cover,
    publisherName: trim(p.publisherName),
    host: trim(p.host),
    hostAvatar: trim(p.hostAvatar),
    signupScope: trim(p.signupScope),
    timedSignup: !!p.timedSignup,
    deadline: trim(p.deadline),
  };
}

const { validateMediaPayload } = require('./media-urls');

function validateEvent(body) {
  if (!body.title) return '请填写活动名称';
  if (!body.place) return '请选择活动地点';
  if (!body.time) return '请填写活动时间';
  const mediaMsg = validateMediaPayload(body);
  if (mediaMsg) return mediaMsg;
  return '';
}

function publicEvent(doc, viewerOpenid) {
  if (!doc) return null;
  const { _id, _openid, ...rest } = doc;
  const isMine = viewerOpenid && (doc.openid === viewerOpenid || doc._openid === viewerOpenid);
  const publishTime = formatPublishTime(rest.createdAt || rest.updatedAt);
  return {
    id: _id,
    ...rest,
    isMine: !!isMine,
    status: doc.userDeleted ? 'user_deleted' : (rest.status || 'approved'),
    auditStatus: rest.auditStatus || 'approved',
    publishedAt: rest.createdAt,
    source: rest.role === 'merchant' ? 'merchant' : 'user',
    sourceText: rest.role === 'merchant' ? '商家合作' : '用户发起',
    publishTime,
  };
}

module.exports = {
  pickEventPayload,
  validateEvent,
  publicEvent,
  ROLES,
};
