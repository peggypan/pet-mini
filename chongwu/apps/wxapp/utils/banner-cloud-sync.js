const cloudApi = require('./cloud-api');
const store = require('./store');

function bannerApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('banners', action, payload);
}

async function refreshBannersFromCloud(options = {}) {
  if (!cloudApi.cloudEnabled()) return store.listHomeBanners();
  try {
    const payload = { limit: options.limit || 10 };
    if (options.city) payload.city = options.city;
    const data = await bannerApi('listFeed', payload);
    const list = (data && data.list) || [];
    return store.replaceBannersFromCloud(list);
  } catch (e) {
    console.warn('[banner-cloud-sync] listFeed', e);
    return store.listHomeBanners();
  }
}

module.exports = {
  refreshBannersFromCloud,
};
