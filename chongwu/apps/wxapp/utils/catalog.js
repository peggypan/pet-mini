const {
  MOCK_SOCIAL,
  MOCK_BUDDY,
  MOCK_EVENTS,
  MOCK_MAP_POINTS,
  MOCK_MERCHANTS,
  MOCK_PET,
} = require('./mock');
const store = require('./store');

function findSocialPost(id) {
  const sid = String(id);
  const local = store.getSocialPost(sid);
  if (local) return { ...local };
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
  const raw = store.getBuddyPost(sid) || MOCK_BUDDY.find((b) => String(b.id) === sid) || null;
  return normalizeBuddyMedia(raw);
}

function listAllBuddies() {
  return [...store.listBuddyPosts(), ...MOCK_BUDDY].map(normalizeBuddyMedia);
}

function findEvent(id) {
  return MOCK_EVENTS.find((e) => String(e.id) === String(id)) || null;
}

function findMerchant(id) {
  return MOCK_MERCHANTS.find((m) => String(m.id) === String(id)) || null;
}

function listAllMapPoints() {
  return [...store.listMapPoints(), ...MOCK_MAP_POINTS];
}

function getDefaultPet() {
  const local = store.listPets()[0];
  if (local) {
    return {
      ...MOCK_PET,
      ...local,
      breed: local.breedName || local.breed || MOCK_PET.breed,
      avatar: local.avatarUrl || MOCK_PET.avatar,
      cover: local.coverUrl || local.avatarUrl || MOCK_PET.cover,
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
  findEvent,
  findMerchant,
  listAllMapPoints,
  getDefaultPet,
  getDefaultPets,
};
