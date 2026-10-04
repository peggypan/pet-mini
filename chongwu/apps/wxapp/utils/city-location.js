const store = require('./store');
const { findCityByName, resolvePrefectureCity } = require('./china-cities');
const amap = require('./amap');

function applyCity(cityInfo, options = {}) {
  const payload = {
    city: cityInfo.name || cityInfo.city,
    province: cityInfo.province || '',
    lat: cityInfo.lat || 0,
    lng: cityInfo.lng || 0,
    auto: !!options.auto,
    locateSource: cityInfo.locateSource || '',
    updatedAt: new Date().toISOString(),
  };
  store.setCityLocation(payload);
  return payload;
}

function privacyAllowsLocation() {
  if (!wx.getPrivacySetting) return true;
  try {
    const app = getApp();
    return !!(app && app.globalData && app.globalData.privacyAccepted);
  } catch (e) {
    return false;
  }
}

const AUTO_LOCATE_MAX_AGE_MS = 4 * 60 * 60 * 1000;

/** 本地缓存的 city 与经纬度推断不一致（如坐标在临沂却显示宿迁） */
function cacheCityMismatch(current) {
  if (!current || !current.city) return false;
  const lat = Number(current.lat);
  const lng = Number(current.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return false;
  }
  const inferred = resolvePrefectureCity({
    province: current.province || '',
    city: '',
    district: '',
    adcode: '',
    lat,
    lng,
  });
  return inferred.name && inferred.name !== current.city;
}

function shouldRefreshAutoLocate(current, force) {
  if (force) return true;
  if (!current || !current.auto || !current.city) return true;
  if (!current.lat || !current.lng) return true;
  if (!current.updatedAt) return true;
  if (cacheCityMismatch(current)) return true;
  const age = Date.now() - new Date(current.updatedAt).getTime();
  return age > AUTO_LOCATE_MAX_AGE_MS;
}

function autoLocateCity(options = {}) {
  const { silent = false, force = false } = options;
  const current = store.getCityLocation();

  if (!shouldRefreshAutoLocate(current, force)) {
    return Promise.resolve(current);
  }

  if (!privacyAllowsLocation()) {
    if (current && current.city) return Promise.resolve(current);
    return Promise.reject(new Error('privacy_not_accepted'));
  }

  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: (res) => {
        amap.reverseGeocode(res.longitude, res.latitude)
          .then((regeo) => {
            if (regeo.source === 'fallback') {
              console.warn('[city-location] reverse geocode used fallback', regeo.city);
            } else if (regeo.source === 'cache') {
              console.info('[city-location] reverse geocode from cache', regeo.city);
            }
            const cityName = (regeo.city || '').replace(/市$/, '').trim() || regeo.city;
            const result = applyCity({
              name: cityName,
              city: cityName,
              province: regeo.province,
              lat: res.latitude,
              lng: res.longitude,
              locateSource: regeo.source || '',
            }, { auto: true });
            if (!silent) {
              wx.showToast({ title: `已识别：${result.city}`, icon: 'none' });
            }
            resolve(result);
          })
          .catch(reject);
      },
      fail: (err) => {
        if (!silent && err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要位置权限',
            content: '开启位置权限后可识别您所在城市，获得同城推荐',
            confirmText: '去设置',
            success: (r) => { if (r.confirm) wx.openSetting(); },
          });
        }
        reject(err);
      },
    });
  });
}

function pickCity(cityName) {
  const found = findCityByName(cityName);
  if (!found) {
    return applyCity({ name: cityName, province: '', lat: 0, lng: 0 }, { auto: false });
  }
  return applyCity(found, { auto: false });
}

module.exports = {
  applyCity,
  autoLocateCity,
  pickCity,
};
