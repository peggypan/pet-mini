const cloudApi = require('./cloud-api');
const store = require('./store');

function discoverLikesApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('pet_discover_likes', action, payload);
}

const { hasLoginToken, ensureCloudSession } = require('./cloud-session');

async function refreshPetDiscoverFromCloud() {
  if (!cloudApi.cloudEnabled()) {
    return store.getPetLikes();
  }
  if (!hasLoginToken()) return store.getPetLikes();
  await ensureCloudSession();
  try {
    const data = await discoverLikesApi('getSummary');
    store.applyPetDiscoverFromCloud(data);
    return store.getPetLikes();
  } catch (e) {
    console.warn('[pet-discover-likes-cloud-sync] getSummary', e);
    return store.getPetLikes();
  }
}

function mapCardToSwipePayload(pet, asLike) {
  const p = pet || {};
  return {
    targetId: String(p.id),
    targetType: p.isHealing || p.healingPetProfile ? 'healing' : 'buddy',
    asLike: !!asLike,
    snapshot: {
      id: p.id,
      userName: p.userName,
      petName: p.petName,
      breed: p.breed,
      avatar: p.cover || p.avatar,
      cover: p.cover,
      distance: p.distance,
    },
  };
}

async function swipeOnCloud(pet, asLike) {
  if (!cloudApi.cloudEnabled()) {
    return store.consumePetSwipe({ pet, asLike });
  }
  if (!hasLoginToken()) {
    return store.consumePetSwipe({ pet, asLike });
  }
  await ensureCloudSession();
  try {
    const data = await discoverLikesApi('swipe', mapCardToSwipePayload(pet, asLike));
    store.applyPetDiscoverFromCloud(data);
    if (asLike && pet) {
      store.setHeartLike(
        {
          id: pet.id,
          source: 'discover',
          userName: pet.userName,
          petName: pet.petName,
          avatar: pet.cover || pet.avatar,
        },
        true,
      );
    }
    return { ok: true };
  } catch (e) {
    if (e.code === 429 || (e.details && e.details.quota)) {
      return { ok: false, quota: true };
    }
    console.warn('[pet-discover-likes-cloud-sync] swipe', e);
    return store.consumePetSwipe({ pet, asLike });
  }
}

async function addShareBonusOnCloud() {
  if (!cloudApi.cloudEnabled()) {
    return store.addPetLikeShareBonus();
  }
  if (!hasLoginToken()) return store.addPetLikeShareBonus();
  await ensureCloudSession();
  try {
    const data = await discoverLikesApi('addShareBonus');
    if (data && data.quota) {
      store.applyPetDiscoverQuota(data.quota);
    }
    return {
      ok: !!data.ok,
      capped: !!data.capped,
      added: data.added || 0,
      ...store.petLikeQuota(),
    };
  } catch (e) {
    console.warn('[pet-discover-likes-cloud-sync] addShareBonus', e);
    return store.addPetLikeShareBonus();
  }
}

module.exports = {
  refreshPetDiscoverFromCloud,
  swipeOnCloud,
  addShareBonusOnCloud,
};
