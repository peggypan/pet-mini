const { MOCK_SOCIAL, MOCK_NEARBY, MOCK_PET } = require('./mock');
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

function findEvent(id) {
  return (MOCK_SOCIAL.events || []).find((e) => String(e.id) === String(id)) || null;
}

function findNearbyFriend(id) {
  return MOCK_NEARBY.find((f) => String(f.id) === String(id)) || null;
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
  findEvent,
  findNearbyFriend,
  getDefaultPet,
  getDefaultPets,
};
