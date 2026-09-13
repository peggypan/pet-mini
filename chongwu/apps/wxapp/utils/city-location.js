const store = require('./store');
const { findCityByName } = require('./china-cities');
const amap = require('./amap');

function applyCity(cityInfo, options = {}) {
  const payload = {
    city: cityInfo.name || cityInfo.city,
    province: cityInfo.province || '',
    lat: cityInfo.lat || 0,
    lng: cityInfo.lng || 0,
    auto: !!options.auto,
    updatedAt: new Date().toISOString(),
  };
  store.setCityLocation(payload);
  return payload;
}

function autoLocateCity(options = {}) {
  const { silent = false, force = false } = options;
  const current = store.getCityLocation();

  if (!force && current.auto && current.city) {
    return Promise.resolve(current);
  }

  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: (res) => {
        amap.reverseGeocode(res.longitude, res.latitude)
          .then((regeo) => {
            const result = applyCity({
              name: regeo.city,
              city: regeo.city,
              province: regeo.province,
              lat: res.latitude,
              lng: res.longitude,
            }, { auto: true });
            if (!silent) {
              const tag = regeo.source === 'amap' ? '高德定位' : '定位';
              wx.showToast({ title: `${tag}：${result.city}`, icon: 'none' });
            }
            resolve(result);
          })
          .catch(reject);
      },
      fail: (err) => {
        if (!silent && err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要位置权限',
            content: '开启定位后可自动识别您所在城市，获得同城推荐',
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
