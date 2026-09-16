/**
 * 高德地图 Web 服务封装（逆地理、地理编码、POI 搜索、导航）
 */
const { AMAP_WEB_KEY, isAmapConfigured } = require('./amap-config');
const { findNearestCity, findCityByName } = require('./china-cities');

const BASE = 'https://restapi.amap.com';

function request(path, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE}${path}`,
      data: { key: AMAP_WEB_KEY, ...data },
      success: (res) => {
        if (res.statusCode !== 200 || !res.data) {
          reject(new Error('高德请求失败'));
          return;
        }
        if (String(res.data.status) !== '1') {
          reject(new Error(res.data.info || '高德接口错误'));
          return;
        }
        resolve(res.data);
      },
      fail: reject,
    });
  });
}

function parseAddressComponent(comp) {
  if (!comp) return { province: '', city: '', district: '' };
  let city = comp.city;
  if (Array.isArray(city)) city = city[0] || '';
  if (!city) {
    city = (comp.province || '').replace(/(市|省|自治区|特别行政区)$/, '');
  }
  return {
    province: comp.province || '',
    city: (city || '').replace(/市$/, ''),
    district: comp.district || '',
    adcode: comp.adcode || '',
  };
}

/** 逆地理编码：坐标 → 地址与城市 */
function reverseGeocode(lng, lat) {
  if (!isAmapConfigured()) {
    const nearest = findNearestCity(lat, lng);
    return Promise.resolve({
      lng,
      lat,
      province: nearest.province || '',
      city: nearest.name,
      district: '',
      address: `${nearest.province || ''}${nearest.name}`,
      adcode: '',
      formattedAddress: `${nearest.province || ''}${nearest.name}`,
      source: 'fallback',
    });
  }
  return request('/v3/geocode/regeo', {
    location: `${lng},${lat}`,
    extensions: 'base',
  }).then((data) => {
    const regeo = data.regeocode || {};
    const comp = parseAddressComponent(regeo.addressComponent);
    return {
      lng,
      lat,
      ...comp,
      address: regeo.formatted_address || '',
      formattedAddress: regeo.formatted_address || '',
      source: 'amap',
    };
  });
}

/** 地理编码：地址 → 坐标 */
function geocode(address, city) {
  const addr = (address || '').trim();
  if (!addr) return Promise.reject(new Error('地址为空'));
  if (!isAmapConfigured()) {
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
  return request('/v3/geocode/geo', {
    address: addr,
    city: city || '',
  }).then((data) => {
    const geo = (data.geocodes || [])[0];
    if (!geo) throw new Error('未解析到坐标');
    const [lng, lat] = (geo.location || '').split(',').map(Number);
    return {
      lng,
      lat,
      province: geo.province || '',
      city: (geo.city || '').replace(/市$/, ''),
      district: geo.district || '',
      formattedAddress: geo.formatted_address || addr,
      source: 'amap',
    };
  });
}

/** POI 关键词提示 */
function searchTips(keyword, city) {
  const kw = (keyword || '').trim();
  if (!kw) return Promise.resolve([]);
  if (!isAmapConfigured()) {
    return Promise.resolve([{ name: kw, address: city || '', district: '' }]);
  }
  return request('/v3/assistant/inputtips', {
    keywords: kw,
    city: city || '',
    citylimit: city ? 'true' : 'false',
  }).then((data) => (data.tips || []).filter((t) => t.location).map((t) => ({
    id: t.id,
    name: t.name,
    address: t.address || t.district || '',
    district: t.district || '',
    location: t.location,
  })));
}

/** 周边 POI 搜索（宠物医院/门店等） */
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
  if (!isAmapConfigured()) return Promise.resolve([]);
  return request('/v3/place/around', {
    location: `${longitude},${latitude}`,
    keywords: keywords || undefined,
    city: city || undefined,
    radius: Math.min(Number(radius) || 8000, 50000),
    offset: Math.min(Number(pageSize) || 20, 25),
    page: page || 1,
    extensions: 'all',
  }).then((data) => data.pois || []);
}

/** 打开地图导航（系统地图，可唤起高德 App） */
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

/** 选点：微信选点 + 高德逆地理补全 */
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
            source: regeo.source,
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

/** 批量补全点位坐标（无 lat/lng 时地理编码） */
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
  isAmapConfigured,
  reverseGeocode,
  geocode,
  searchTips,
  searchPlaceAround,
  openNavigation,
  choosePoint,
  enrichPointsWithCoords,
  buildMapMarkers,
};
