const { HEALING_BUDDY_TYPES } = require('./mock');
const store = require('./store');
const { validatePetProfile } = require('./pet-profile-guard');

const HEALING_PET_ID_PREFIX = 'hp_';

function healingPetBuddyId(petId) {
  return `${HEALING_PET_ID_PREFIX}${petId}`;
}

function parseHealingPetBuddyId(id) {
  const sid = String(id || '');
  if (!sid.startsWith(HEALING_PET_ID_PREFIX)) return null;
  return sid.slice(HEALING_PET_ID_PREFIX.length);
}

function getUserDisplayName() {
  const info = wx.getStorageSync('userInfo') || {};
  return info.nickname || info.nickName || '宠友';
}

function mapHealingPetToBuddy(pet) {
  if (!pet || !pet.id) return null;
  const cover = pet.avatarUrl || pet.avatar || '';
  const gallery = Array.isArray(pet.galleryPhotos) ? pet.galleryPhotos.filter(Boolean) : [];
  const mediaList = gallery.length
    ? gallery.map((url) => ({ type: 'image', url }))
    : cover
      ? [{ type: 'image', url: cover }]
      : [];
  return {
    id: healingPetBuddyId(pet.id),
    userName: getUserDisplayName(),
    avatar: cover,
    cover,
    distance: '同城',
    petName: pet.name,
    breed: pet.breedName || pet.breed || '',
    age: pet.birthday ? '已建档' : '',
    verified: !!(pet.vaccineStatus === 'immune' || pet.verified),
    personality: pet.personality,
    buddyType: pet.healingBuddyType || HEALING_BUDDY_TYPES[0],
    tags: [...(pet.socialTags || []), '宠物疗愈'],
    expectTime: '可协商',
    expectPlace: pet.activityAreaName || '同城',
    expectPlaceAddress: pet.activityAreaAddress || '',
    location:
      pet.activityAreaLatitude != null && pet.activityAreaLongitude != null
        ? {
            name: pet.activityAreaName || pet.activityAreaAddress || '常活动区域',
            address: pet.activityAreaAddress || '',
            latitude: Number(pet.activityAreaLatitude),
            longitude: Number(pet.activityAreaLongitude),
          }
        : undefined,
    desc: (pet.healingIntro || pet.personality || '').trim(),
    zone: 'healing',
    healingPetProfile: true,
    mediaList,
    likes: 0,
    comments: 0,
    shares: 0,
  };
}

function listHealingProfileBuddies() {
  return store
    .listPets()
    .filter((p) => p.healingPet && validatePetProfile(p).ok)
    .map(mapHealingPetToBuddy)
    .filter(Boolean);
}

function findHealingPetBuddy(id) {
  const petId = parseHealingPetBuddyId(id);
  if (!petId) return null;
  const pet = store.getPet(petId);
  if (!pet || !pet.healingPet) return null;
  return mapHealingPetToBuddy(pet);
}

module.exports = {
  HEALING_BUDDY_TYPES,
  HEALING_PET_ID_PREFIX,
  healingPetBuddyId,
  parseHealingPetBuddyId,
  mapHealingPetToBuddy,
  listHealingProfileBuddies,
  findHealingPetBuddy,
};
