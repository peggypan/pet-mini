const {
  MOCK_SOCIAL,
  MOCK_BUDDY,
  MOCK_EVENTS,
  MOCK_MAP_POINTS,
  MOCK_MERCHANTS,
  MOCK_CLUBS,
  MOCK_PET,
} = require('./mock');
const store = require('./store');
const cloudApi = require('./cloud-api');
const { findHealingPetBuddy, listHealingProfileBuddies } = require('./pet-healing');

function findSocialPost(id) {
  const sid = String(id);
  const local = store.getSocialPost(sid);
  if (local) return { ...local };
  if (cloudApi.cloudEnabled()) return null;
  const mock = (MOCK_SOCIAL.posts || []).find((p) => String(p.id) === sid);
  if (!mock) return null;
  const override = store.getSocialOverride(sid);
  return { ...mock, ...(override || {}) };
}

function normalizeBuddyMedia(buddy) {
  if (!buddy) return buddy;
  if (Array.isArray(buddy.mediaList) && buddy.mediaList.length) {
    return buddy;
  }
  const images = Array.isArray(buddy.images) ? buddy.images : [];
  if (images.length) {
    return {
      ...buddy,
      mediaList: images.map((url) => ({ type: 'image', url })),
    };
  }
  if (buddy.cover) {
    return {
      ...buddy,
      mediaList: [{ type: 'image', url: buddy.cover }],
    };
  }
  return { ...buddy, mediaList: [] };
}

function findBuddy(id) {
  const sid = String(id);
  const fromHealingPet = findHealingPetBuddy(sid);
  if (fromHealingPet) return normalizeBuddyMedia(fromHealingPet);
  const raw = store.getBuddyPost(sid) || MOCK_BUDDY.find((b) => String(b.id) === sid) || null;
  return normalizeBuddyMedia(raw);
}

function listAllBuddies() {
  const fromStore = store.listBuddyPosts();
  const healing = listHealingProfileBuddies();
  if (cloudApi.cloudEnabled()) {
    return [...fromStore, ...healing].map(normalizeBuddyMedia);
  }
  return [...fromStore, ...healing, ...MOCK_BUDDY].map(normalizeBuddyMedia);
}

const DEFAULT_EVENT_COVER = '/assets/mock/real_hero.jpg';

function eventPublishTime(event) {
  const t = event.publishedAt || event.createdAt;
  const n = t ? Date.parse(t) : NaN;
  return Number.isNaN(n) ? 0 : n;
}

function applyFreeEventFee(event) {
  return {
    ...event,
    fee: '免费报名',
    feeText: '免费',
    price: 0,
  };
}

function normalizeUserEvent(raw) {
  if (!raw) return null;
  const maxPeople = Number(raw.maxPeople) || 20;
  const remain = raw.remain != null ? Number(raw.remain) : maxPeople;
  const pet = getDefaultPet();
  return applyFreeEventFee({
    ...raw,
    cover: raw.cover || DEFAULT_EVENT_COVER,
    fee: raw.fee || raw.feeText || '免费报名',
    place: raw.place || '',
    time: raw.time || '',
    seats: raw.seats || `0/${maxPeople}`,
    remain,
    maxPeople,
    host: raw.publisherName || raw.host || '发起人',
    hostAvatar: raw.hostAvatar || pet.avatar || pet.avatarUrl,
    desc: raw.desc || raw.category || '',
    category: raw.category || '',
    source: raw.role === 'merchant' ? 'merchant' : 'user',
    sourceText: raw.role === 'merchant' ? '商家合作' : '用户发起',
    publishedAt: raw.createdAt || raw.publishedAt || new Date().toISOString(),
  });
}

function normalizeMockEvent(raw, index) {
  const dayMs = 86400000;
  const publishedAt = raw.publishedAt
    || new Date(Date.now() - (index + 1) * 3 * dayMs).toISOString();
  return applyFreeEventFee({ ...raw, publishedAt });
}

/** 平台 mock + 用户发布，按发布时间倒序；开云仅用云缓存 */
function listAllEvents() {
  if (cloudApi.cloudEnabled()) {
    return store
      .listCloudEvents()
      .filter((e) => e.auditStatus !== 'rejected' && e.status !== 'rejected' && e.status !== 'user_deleted')
      .map((raw) => normalizeUserEvent(raw) || normalizeMockEvent(raw, 0))
      .filter(Boolean)
      .sort((a, b) => eventPublishTime(b) - eventPublishTime(a));
  }

  const mock = MOCK_EVENTS.map(normalizeMockEvent);
  const user = store
    .listMyEvents()
    .filter((e) => e.auditStatus !== 'rejected' && e.status !== 'rejected')
    .map(normalizeUserEvent)
    .filter(Boolean);

  const map = new Map();
  mock.forEach((e) => map.set(String(e.id), e));
  user.forEach((e) => map.set(String(e.id), e));

  return Array.from(map.values()).sort(
    (a, b) => eventPublishTime(b) - eventPublishTime(a),
  );
}

function listRecentEvents(limit) {
  const n = limit == null ? 3 : Number(limit);
  return listAllEvents().slice(0, n > 0 ? n : 3);
}

function findEvent(id) {
  const sid = String(id);
  const fromList = listAllEvents().find((e) => String(e.id) === sid);
  if (fromList) return { ...fromList };
  if (cloudApi.cloudEnabled()) {
    const cached = store.getEventFromCache(sid);
    if (cached) {
      const normalized = normalizeUserEvent(cached) || normalizeMockEvent(cached, 0);
      return normalized ? { ...normalized } : null;
    }
    return null;
  }
  return null;
}

function listRecommendClubs() {
  const cloud = store.listClubsFeed();
  const cloudIds = new Set(cloud.map((c) => String(c.id)));
  const mockOnly = MOCK_CLUBS.filter((c) => !cloudIds.has(String(c.id)));
  return [...cloud, ...mockOnly];
}

function findClub(id) {
  const sid = String(id);
  return store.getClubFromCache(sid)
    || MOCK_CLUBS.find((c) => String(c.id) === sid)
    || null;
}

function listAllMerchants() {
  const cloud = store.listMerchants();
  const cloudIds = new Set(cloud.map((m) => String(m.id)));
  const mockOnly = MOCK_MERCHANTS.filter((m) => !cloudIds.has(String(m.id)));
  return [...cloud, ...mockOnly];
}

function findMerchant(id) {
  const sid = String(id);
  const fromStore = store.getMerchantFromCache(sid);
  if (fromStore) return fromStore;
  return MOCK_MERCHANTS.find((m) => String(m.id) === sid) || null;
}

function listAllMapPoints() {
  return [...store.listMapPoints(), ...MOCK_MAP_POINTS];
}

function getDefaultPet() {
  const local = store.listPets()[0];
  if (local) {
    const avatarUrl = local.avatarUrl || local.avatar || '';
    const useMockAvatar = !avatarUrl || avatarUrl.includes('/assets/mock/');
    return {
      ...MOCK_PET,
      ...local,
      name: local.name || MOCK_PET.name,
      breed: local.breedName || local.breed || MOCK_PET.breed,
      avatar: useMockAvatar ? MOCK_PET.avatar : avatarUrl,
      avatarUrl: useMockAvatar ? '' : avatarUrl,
      cover: local.coverUrl || (useMockAvatar ? MOCK_PET.cover : avatarUrl),
      healingPet: !!local.healingPet,
      healingBuddyType: local.healingBuddyType || '',
      healingIntro: local.healingIntro || '',
    };
  }
  return { ...MOCK_PET };
}

function getDefaultPets() {
  const local = store.listPets();
  return local.length ? local : [{ ...MOCK_PET, id: 'demo' }];
}

module.exports = {
  findSocialPost,
  findBuddy,
  listAllBuddies,
  listAllEvents,
  listRecentEvents,
  findEvent,
  findMerchant,
  findClub,
  listRecommendClubs,
  listAllMerchants,
  listAllMapPoints,
  getDefaultPet,
  getDefaultPets,
};
