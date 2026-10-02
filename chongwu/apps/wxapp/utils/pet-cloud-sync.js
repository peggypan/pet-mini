const cloudApi = require('./cloud-api');
const store = require('./store');

function needsCloudUpload(path) {
  if (!path || typeof path !== 'string') return false;
  if (path.startsWith('cloud://')) return false;
  if (path.startsWith('https://') || path.startsWith('http://')) return false;
  if (path.startsWith('/assets/')) return false;
  return true;
}

function uploadOne(localPath) {
  const m = localPath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = (m && m[1]) || 'jpg';
  const cloudPath = `pets/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return wx.cloud
    .uploadFile({ cloudPath, filePath: localPath })
    .then((res) => res.fileID);
}

async function resolveMediaUrl(url) {
  if (!url) return '';
  if (!needsCloudUpload(url)) return url;
  return uploadOne(url);
}

async function uploadPetMedia(payload) {
  const next = { ...payload };
  next.avatarUrl = await resolveMediaUrl(next.avatarUrl);
  const gallery = Array.isArray(next.galleryPhotos) ? next.galleryPhotos : [];
  next.galleryPhotos = await Promise.all(gallery.map((u) => resolveMediaUrl(u)));
  next.vaccineProofUrl = await resolveMediaUrl(next.vaccineProofUrl);
  return next;
}

const { hasLoginToken, ensureCloudSession } = require('./cloud-session');
const { resolvePets } = require('./cloud-media');

async function refreshPetsFromCloud() {
  if (!cloudApi.cloudEnabled()) return store.listPets();
  if (!hasLoginToken()) return store.listPets();
  await ensureCloudSession();
  try {
    const data = await cloudApi.listMyPets();
    let list = (data && data.list) || [];
    list = await resolvePets(list);
    return store.replaceAllPetsFromCloud(list);
  } catch (e) {
    console.warn('[pet-cloud-sync] listMine', e);
    return store.listPets();
  }
}

async function savePetToCloud(payload, petId) {
  if (!cloudApi.cloudEnabled()) {
    return petId ? store.updatePet(petId, payload) : store.addPet(payload);
  }
  wx.showLoading({ title: '保存中…', mask: true });
  try {
    const uploaded = await uploadPetMedia(payload);
    const body = { ...uploaded };
    if (petId) body.id = petId;
    const data = await cloudApi.savePet(body);
    const pet = (data && data.pet) || null;
    if (!pet) throw new Error('保存失败');
    const row = store.upsertPetFromCloud(pet);
    if (!petId) {
      store.pushMessage('档案已保存', '宠物档案已更新，可使用搭子、活动与社区互动', 'system');
    }
    return row;
  } finally {
    wx.hideLoading();
  }
}

async function loadPetFromCloud(id) {
  if (!cloudApi.cloudEnabled() || !id) return null;
  try {
    const data = await cloudApi.getPet(id);
    const pet = data && data.pet;
    if (pet) return store.upsertPetFromCloud(pet);
  } catch (e) {
    // fall through
  }
  return null;
}

module.exports = {
  refreshPetsFromCloud,
  savePetToCloud,
  loadPetFromCloud,
};
