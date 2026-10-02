const cloudApi = require('./cloud-api');
const store = require('./store');

function splashApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('splash_ads', action, payload);
}

async function fetchActiveSplashAdFromCloud() {
  const fallback = store.getDefaultSplashAd();
  if (!cloudApi.cloudEnabled()) return fallback;
  try {
    const data = await splashApi('getActive');
    const ad = data && data.ad;
    if (ad && ad.imageUrl) {
      store.setSplashAdCache(ad);
      return ad;
    }
  } catch (e) {
    console.warn('[splash-ad-cloud-sync] getActive', e);
  }
  return store.getSplashAdCache() || fallback;
}

module.exports = {
  fetchActiveSplashAdFromCloud,
};
