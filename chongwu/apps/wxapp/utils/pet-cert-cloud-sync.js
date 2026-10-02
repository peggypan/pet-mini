const cloudApi = require('./cloud-api');
const store = require('./store');
const { expandSnapshot } = require('./pet-cert-qrcode');

function certApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('pet_certs_public', action, payload);
}

async function ensureCloudLogin() {
  const { refreshPetsFromCloud } = require('./pet-cloud-sync');
  try {
    const loginData = await cloudApi.login();
    if (loginData && loginData.token) {
      const app = getApp();
      app.globalData.token = loginData.token;
      app.globalData.userInfo = loginData.user;
      wx.setStorageSync('token', loginData.token);
      wx.setStorageSync('userInfo', loginData.user);
    }
  } catch (e) {
    // ignore
  }
  await refreshPetsFromCloud().catch(() => {});
}

function cacheCertLocally(certPayload) {
  if (!certPayload || !certPayload.snapshot) return null;
  const snap = certPayload.snapshot;
  const petId = certPayload.petId || snap.id;
  if (!petId) return null;
  const map = store.listPublicPetCerts();
  map[String(petId)] = snap;
  wx.setStorageSync('mvp_pet_cert_public', map);
  return certPayload.cert || expandSnapshot(snap);
}

async function publishPetCertToCloud(petId) {
  if (!petId) return null;
  if (!cloudApi.cloudEnabled()) {
    const pet = store.getPet(petId);
    if (pet) return store.registerPublicPetCert(pet);
    return null;
  }
  await ensureCloudLogin();
  const data = await certApi('publish', { petId: String(petId) });
  const cert = data && data.cert;
  if (cert && cert.snapshot) {
    cacheCertLocally(cert);
    const expanded = cert.cert || expandSnapshot(cert.snapshot);
    return expanded;
  }
  return null;
}

async function fetchPublicPetCertFromCloud(petId) {
  if (!petId) return null;
  const local = store.getPublicPetCert(petId);
  if (local) return expandSnapshot(local);
  if (!cloudApi.cloudEnabled()) return null;
  try {
    const data = await certApi('get', { petId: String(petId) });
    const cert = data && data.cert;
    if (cert && cert.snapshot) {
      cacheCertLocally(cert);
      return cert.cert || expandSnapshot(cert.snapshot);
    }
  } catch (e) {
    console.warn('[pet-cert-cloud-sync] get', e);
  }
  return null;
}

module.exports = {
  publishPetCertToCloud,
  fetchPublicPetCertFromCloud,
};
