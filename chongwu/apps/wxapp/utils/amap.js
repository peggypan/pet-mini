/**
 * 腾讯地图 WebService 封装（逆地理、地理编码、POI 搜索、导航）
 * 小程序地图组件与选点均走腾讯地图。
 */
const { TENCENT_MAP_KEY, isTencentMapConfigured, isAmapConfigured } = require('./amap-config');
const { findNearestCity, findCityByName, findNearestCitySmart, resolvePrefectureCity } = require('./china-cities');
const reverseGeocodeCache = require('./reverse-geocode-cache');

const BASE = 'https://apis.map.qq.com/ws';

function request(path, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE}${path}`,
      data: { key: TENCENT_MAP_KEY, ...data },
      success: (res) => {
        if (res.statusCode !== 200 || !res.data) {
          reject(new Error('腾讯地图请求失败'));
          return;
        }
        if (Number(res.data.status) !== 0) {
          reject(new Error(res.data.message || '腾讯地图接口错误'));
          return;
        }
        resolve(res.data);
      },
      fail: reject,
    });
  });
}

function parseTencentAddressComponent(comp) {
  if (!comp) return { province: '', city: '', district: '', adcode: '' };
  return {
    province: comp.province || '',
    city: (comp.city || '').replace(/市$/, ''),
    district: comp.district || '',
    adcode: comp.adcode || '',
  };
}

function packReverseResult(lng, lat, payload) {
  return {
    lng,
    lat,
    province: payload.province || '',
    city: payload.city,
    district: payload.district || '',
    adcode: payload.adcode || '',
    address: payload.address || payload.formattedAddress || '',
    formattedAddress: payload.formattedAddress || payload.address || '',
    source: payload.source || 'fallback',
  };
}

function fallbackReverseGeocode(lng, lat, err) {
  const msg = (err && err.message) || '';
  if (msg.includes('上限') || msg.includes('quota') || msg.includes('配额')) {
    console.warn('[amap] 腾讯逆地理当日配额已用尽，已改用本地推断；可在 lbs.qq.com 查看用量或次日重置');
  } else {
    console.warn('[amap] reverseGeocode tencent failed, fallback', msg);
  }
  const cached = reverseGeocodeCache.get(lat, lng);
  if (cached && cached.city) {
    return packReverseResult(lng, lat, { ...cached, source: 'cache' });
  }
  const nearest = findNearestCitySmart(lat, lng);
  return packReverseResult(lng, lat, {
    province: nearest.province || '',
    city: nearest.name,
    district: '',
    adcode: '',
    address: `${nearest.province || ''}${nearest.name}`,
    formattedAddress: `${nearest.province || ''}${nearest.name}`,
    source: 'fallback',
  });
}

/** 逆地理编码：坐标 → 地址与城市（location 为 lat,lng） */
function reverseGeocode(lng, lat) {
  const cached = reverseGeocodeCache.get(lat, lng);
  if (cached && cached.city) {
    return Promise.resolve(packReverseResult(lng, lat, { ...cached, source: 'cache' }));
  }
  if (!isTencentMapConfigured()) {
    return Promise.resolve(fallbackReverseGeocode(lng, lat, new Error('no_key')));
  }
  return request('/geocoder/v1/', {
    location: `${lat},${lng}`,
  }).then((data) => {
    const result = data.result || {};
    const comp = parseTencentAddressComponent(result.address_component);
    const adInfo = result.ad_info || {};
    const adcode = adInfo.adcode || comp.adcode || '';
    const resolved = resolvePrefectureCity({
      province: comp.province || adInfo.province || '',
      city: comp.city,
      district: comp.district || adInfo.district || '',
      adcode,
      lat,
      lng,
    });
    const formatted = result.address || result.formatted_addresses?.recommend || '';
    const packed = packReverseResult(lng, lat, {
      province: resolved.province || comp.province || '',
      city: resolved.name,
      district: comp.district,
      adcode,
      address: formatted,
      formattedAddress: formatted,
      source: 'tencent',
    });
    reverseGeocodeCache.set(lat, lng, packed);
    return packed;
  }).catch((err) => fallbackReverseGeocode(lng, lat, err));
}

/** 地理编码：地址 → 坐标 */
function geocode(address, city) {
  const addr = (address || '').trim();
  if (!addr) return Promise.reject(new Error('地址为空'));
  if (!isTencentMapConfigured()) {
    const found = findCityByName(city || addr) || findNearestCity(39.9, 116.4);
    return Promise.resolve({
      lng: found.lng,
      lat: found.lat,
      province: found.province || '',
      city: found.name,
      formattedAddress: addr,
      source: 'fallback',
    });
  }
  return request('/geocoder/v1/', {
    address: addr,
    region: city || '',
  }).then((data) => {
    const result = (data.result || {});
    const loc = result.location || {};
    if (!loc.lat || !loc.lng) throw new Error('未解析到坐标');
    const comp = parseTencentAddressComponent(result.address_components);
    return {
      lng: loc.lng,
      lat: loc.lat,
      province: comp.province,
      city: comp.city,
      district: comp.district,
      formattedAddress: result.title || addr,
      source: 'tencent',
    };
  });
}

/** POI 关键词提示（地点搜索） */
function searchTips(keyword, city) {
  const kw = (keyword || '').trim();
  if (!kw) return Promise.resolve([]);
  if (!isTencentMapConfigured()) {
    return Promise.resolve([{ name: kw, address: city || '', district: '' }]);
  }
  return request('/place/v1/suggestion', {
    keyword: kw,
    region: city || '',
    region_fix: city ? 1 : 0,
  }).then((data) => (data.data || [])
    .filter((t) => t.location && t.location.lat && t.location.lng)
    .map((t) => ({
      id: t.id,
      name: t.title,
      address: t.address || t.category || '',
      district: t.ad_info && t.ad_info.district ? t.ad_info.district : '',
      location: `${t.location.lng},${t.location.lat}`,
    })));
}

/** 周边 POI 搜索 */
function searchPlaceAround(options = {}) {
  const {
    keywords = '',
    city = '',
    latitude,
    longitude,
    radius = 8000,
    page = 1,
    pageSize = 20,
  } = options;
  if (!latitude || !longitude) return Promise.resolve([]);
  if (!isTencentMapConfigured()) return Promise.resolve([]);
  const boundary = `nearby(${latitude},${longitude},${Math.min(Number(radius) || 8000, 50000)},1)`;
  return request('/place/v1/search', {
    boundary,
    keyword: keywords || undefined,
    page_size: Math.min(Number(pageSize) || 20, 20),
    page_index: page || 1,
    orderby: '_distance',
  }).then((data) => (data.data || []).map((poi) => ({
    id: poi.id,
    name: poi.title,
    address: poi.address || '',
    location: poi.location ? `${poi.location.lng},${poi.location.lat}` : '',
    distance: poi._distance,
    cityname: (poi.ad_info && poi.ad_info.city) || city || '',
  })));
}

function toCoord(value) {
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? n : 0;
}

function extractPlace(options = {}) {
  const rawLoc = options.location || options.geoLocation || {};
  const loc = typeof rawLoc === 'string'
    ? { name: rawLoc, address: rawLoc }
    : (rawLoc || {});
  const name = String(options.name || loc.name || options.place || options.expectPlace || '').trim();
  const address = String(
    options.address
    || loc.address
    || options.placeAddress
    || options.expectPlaceAddress
    || name
    || '',
  ).trim();
  return {
    lat: toCoord(options.lat || options.latitude || loc.latitude),
    lng: toCoord(options.lng || options.longitude || loc.longitude),
    name: name || '地点',
    address,
    city: options.city || loc.city || '',
  };
}

/** 打开地图导航（微信 openLocation → 腾讯地图） */
function openNavigation(options) {
  const { lat, lng, name, address, scale } = options;
  if (!lat || !lng) {
    wx.showToast({ title: '缺少坐标，无法导航', icon: 'none' });
    return Promise.reject(new Error('no coords'));
  }
  return new Promise((resolve, reject) => {
    wx.openLocation({
      latitude: Number(lat),
      longitude: Number(lng),
      name: name || '目的地',
      address: address || '',
      scale: scale || 16,
      success: resolve,
      fail: reject,
    });
  });
}

function openPlace(options = {}) {
  const place = extractPlace(options);
  if (place.lat && place.lng) {
    return openNavigation(place);
  }
  if (!place.address || place.address === '同城') {
    wx.showToast({ title: '暂无地点坐标', icon: 'none' });
    return Promise.reject(new Error('no place'));
  }
  wx.showLoading({ title: '定位中' });
  return geocode(place.address, place.city)
    .then((geo) => {
      wx.hideLoading();
      return openNavigation({
        lat: geo.lat,
        lng: geo.lng,
        name: place.name,
        address: geo.formattedAddress || place.address,
      });
    })
    .catch((err) => {
      wx.hideLoading();
      wx.showToast({ title: '暂无法打开地图', icon: 'none' });
      return Promise.reject(err);
    });
}

function openPlaceFromTap(e) {
  const d = (e && e.currentTarget && e.currentTarget.dataset) || {};
  return openPlace({
    lat: d.lat,
    lng: d.lng,
    name: d.name || d.place,
    address: d.address,
    city: d.city,
  });
}

/** 选点：微信腾讯地图选点 + 逆地理补全 */
function choosePoint(options = {}) {
  return new Promise((resolve, reject) => {
    wx.chooseLocation({
      ...options,
      success: async (res) => {
        try {
          const regeo = await reverseGeocode(res.longitude, res.latitude);
          resolve({
            name: res.name,
            address: res.address || regeo.formattedAddress,
            latitude: res.latitude,
            longitude: res.longitude,
            city: regeo.city,
            province: regeo.province,
            district: regeo.district,
            adcode: regeo.adcode,
            source: regeo.source || 'tencent',
          });
        } catch (e) {
          resolve({
            name: res.name,
            address: res.address,
            latitude: res.latitude,
            longitude: res.longitude,
            city: '',
            province: '',
            district: '',
            source: 'wechat',
          });
        }
      },
      fail: reject,
    });
  });
}

async function enrichPointsWithCoords(points, city) {
  const list = [];
  for (const p of points) {
    if (p.latitude && p.longitude) {
      list.push({ ...p });
      continue;
    }
    try {
      const geo = await geocode(p.address || p.name, city || p.city);
      list.push({
        ...p,
        latitude: geo.lat,
        longitude: geo.lng,
        city: p.city || geo.city,
      });
    } catch (e) {
      list.push({ ...p });
    }
  }
  return list;
}

const { getPetSentiment } = require('./map-pet-filter');

const MARKER_ICONS = {
  friendly: '/assets/map-markers/pin-friendly.png',
  unfriendly: '/assets/map-markers/pin-unfriendly.png',
  danger: '/assets/map-markers/pin-danger.png',
};

function formatMarkerCallout(point) {
  const name = (point.name || '点位').trim();
  const addr = (point.address || '暂无地址').trim();
  const shortAddr = addr.length > 26 ? `${addr.slice(0, 26)}…` : addr;
  return `${name}\n${shortAddr}`;
}

function buildMapMarkers(points, options = {}) {
  const { calloutMode = 'BYCLICK', activePointId, mapScale = 14 } = options;
  const zoomedIn = Number(mapScale) >= 14;
  return points
    .filter((p) => p.latitude && p.longitude)
    .map((p, index) => {
      const sentiment = getPetSentiment(p);
      const isActive = activePointId && String(p.id) === String(activePointId);
      const display = isActive || zoomedIn ? 'ALWAYS' : calloutMode;
      const marker = {
        id: index,
        pointId: p.id,
        latitude: p.latitude,
        longitude: p.longitude,
        title: p.name,
        iconPath: MARKER_ICONS[sentiment] || MARKER_ICONS.friendly,
        width: 44,
        height: 54,
        anchor: { x: 0.5, y: 1 },
      };
      if (display === 'ALWAYS' || calloutMode === 'BYCLICK') {
        marker.callout = {
          content: formatMarkerCallout(p),
          display,
          padding: 8,
          borderRadius: 10,
          fontSize: 11,
          bgColor: '#FFFFFF',
          color: '#333333',
          borderWidth: 1,
          borderColor: '#E5E5E5',
          textAlign: 'left',
        };
      }
      return marker;
    });
}

module.exports = {
  isTencentMapConfigured,
  isAmapConfigured,
  reverseGeocode,
  geocode,
  searchTips,
  searchPlaceAround,
  extractPlace,
  openNavigation,
  openPlace,
  openPlaceFromTap,
  choosePoint,
  enrichPointsWithCoords,
  buildMapMarkers,
};
