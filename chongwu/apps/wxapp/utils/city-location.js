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

/** 自动定位结果缓存（跨城后应更快失效） */
const AUTO_LOCATE_MAX_AGE_MS = 20 * 60 * 1000;
/** 相对上次坐标移动超过该距离则强制逆地理更新城市 */
const MOVED_CITY_THRESHOLD_KM = 25;

function distanceKm(lat1, lng1, lat2, lng2) {
  const a1 = Number(lat1);
  const o1 = Number(lng1);
  const a2 = Number(lat2);
  const o2 = Number(lng2);
  if (![a1, o1, a2, o2].every(Number.isFinite)) return Infinity;
  const R = 6371;
  const dLat = ((a2 - a1) * Math.PI) / 180;
  const dLng = ((o2 - o1) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos((a1 * Math.PI) / 180) * Math.cos((a2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

function cacheAgeMs(current) {
  if (!current || !current.updatedAt) return Infinity;
  const t = new Date(current.updatedAt).getTime();
  return Number.isFinite(t) ? Date.now() - t : Infinity;
}

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

function shouldSkipRegeoAfterGps(current, force, gps) {
  if (force) return false;
  if (!current || !current.auto || !current.city) return false;
  if (cacheCityMismatch(current)) return false;
  if (!Number.isFinite(Number(current.lat)) || !Number.isFinite(Number(current.lng))) return false;
  const moved = distanceKm(current.lat, current.lng, gps.latitude, gps.longitude);
  if (moved >= MOVED_CITY_THRESHOLD_KM) return false;
  return cacheAgeMs(current) <= AUTO_LOCATE_MAX_AGE_MS;
}

/** 部分安卓机 isHighAccuracy 易失败，失败后降级再试一次 */
function getLocationGcj02() {
  return new Promise((resolve, reject) => {
    const run = (highAccuracy) => {
      wx.getLocation({
        type: 'gcj02',
        isHighAccuracy: !!highAccuracy,
        highAccuracyExpireTime: highAccuracy ? 5000 : undefined,
        success: resolve,
        fail: (err) => {
          if (highAccuracy) {
            run(false);
            return;
          }
          reject(err);
        },
      });
    };
    run(true);
  });
}

function autoLocateCity(options = {}) {
  const { silent = false, force = false } = options;
  const current = store.getCityLocation();

  if (!force && current && current.city && current.auto === false) {
    return Promise.resolve(current);
  }

  if (!privacyAllowsLocation()) {
    if (current && current.city) return Promise.resolve(current);
    return Promise.reject(new Error('privacy_not_accepted'));
  }

  return getLocationGcj02()
    .then((res) => {
      if (shouldSkipRegeoAfterGps(current, force, res)) {
        return current;
      }
      return amap.reverseGeocode(res.longitude, res.latitude)
        .then((regeo) => {
          if (regeo.source === 'fallback') {
            console.warn('[city-location] reverse geocode used fallback', regeo.city);
            if (!silent) {
              wx.showToast({
                title: '定位服务异常，城市为估算值',
                icon: 'none',
                duration: 2500,
              });
            }
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
          if (!silent && result.city !== (current && current.city)) {
            wx.showToast({ title: `已识别：${result.city}`, icon: 'none' });
          }
          return result;
        });
    })
    .catch((err) => {
      if (!silent && err.errMsg && err.errMsg.includes('auth deny')) {
        wx.showModal({
          title: '需要位置权限',
          content: '开启位置权限后可识别您所在城市，获得同城推荐',
          confirmText: '去设置',
          success: (r) => { if (r.confirm) wx.openSetting(); },
        });
      }
      if (current && current.city) return current;
      return Promise.reject(err);
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
  distanceKm,
};
