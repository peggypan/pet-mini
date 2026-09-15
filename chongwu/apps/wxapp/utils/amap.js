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

function buildMapMarkers(points, options = {}) {
  const { onCallout } = options;
  return points
    .filter((p) => p.latitude && p.longitude)
    .map((p, index) => {
      const isDanger = p.danger || /毒|危险/.test(p.type || '');
      const unfriendly = !isDanger && p.allowPet === false;
      const marker = {
        id: index,
        pointId: p.id,
        latitude: p.latitude,
        longitude: p.longitude,
        title: p.name,
        width: 28,
        height: 36,
        callout: {
          content: isDanger
            ? `⚠ ${p.name}\n${p.dangerDesc || '危险区域，请远离'}`
            : `${p.name}\n${p.allowPet === false ? '禁止携宠' : '允许携宠'}`,
          display: onCallout || 'BYCLICK',
          padding: 8,
          borderRadius: 8,
          fontSize: 12,
        },
      };
      if (isDanger) {
        marker.label = {
          content: '☠ 危险',
          color: '#FFFFFF',
          bgColor: '#E5484D',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#FFFFFF',
          padding: 5,
          fontSize: 11,
          anchorX: -22,
          anchorY: 0,
        };
      } else if (unfriendly) {
        marker.label = {
          content: '✕ 不友好',
          color: '#666666',
          bgColor: '#E8E8E8',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#FFFFFF',
          padding: 5,
          fontSize: 11,
          anchorX: -26,
          anchorY: 0,
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
  openNavigation,
  choosePoint,
  enrichPointsWithCoords,
  buildMapMarkers,
};
