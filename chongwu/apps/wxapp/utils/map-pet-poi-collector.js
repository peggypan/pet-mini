const amap = require('./amap');
const { MOCK_PET_SERVICE_POIS } = require('./mock-pet-service-pois');

function parseLocation(locStr) {
  const [lng, lat] = String(locStr || '').split(',').map(Number);
  if (!lng || !lat) return null;
  return { longitude: lng, latitude: lat };
}

function normalizePoi(poi, category, city) {
  const loc = parseLocation(poi.location);
  if (!loc) return null;
  const type = category === 'petHospital' ? '宠物医院' : '宠物门店';
  return {
    id: `poi_${category}_${poi.id || poi.name}`,
    name: poi.name || type,
    type,
    category,
    allowPet: true,
    autoCollected: true,
    petFriendly: true,
    address: poi.address || poi.pname || '',
    city: city || poi.cityname || '',
    latitude: loc.latitude,
    longitude: loc.longitude,
    distance: poi.distance ? `${(Number(poi.distance) / 1000).toFixed(1)}km` : '',
    rating: poi.biz_ext && poi.biz_ext.rating ? Number(poi.biz_ext.rating) : 4.5,
    source: 'amap',
  };
}

async function searchCategory(keywords, category, city, latitude, longitude) {
  const list = Array.isArray(keywords) ? keywords : [keywords];
  const seen = new Set();
  const out = [];
  for (const kw of list) {
    const pois = await amap.searchPlaceAround({
      keywords: kw,
      city,
      latitude,
      longitude,
      radius: 8000,
      pageSize: 15,
    });
    pois.forEach((poi) => {
      const id = poi.id || poi.name;
      if (seen.has(id)) return;
      seen.add(id);
      const norm = normalizePoi(poi, category, city);
      if (norm) out.push(norm);
    });
  }
  return out;
}

function fallbackNear(latitude, longitude, city) {
  return MOCK_PET_SERVICE_POIS.filter((p) => !city || !p.city || p.city === city).map((p, i) => ({
    ...p,
    id: p.id || `mock_poi_${i}`,
    latitude: p.latitude || latitude + (i % 3) * 0.012 - 0.012,
    longitude: p.longitude || longitude + (Math.floor(i / 3) % 3) * 0.012 - 0.012,
    autoCollected: true,
    petFriendly: true,
    allowPet: true,
  }));
}

/**
 * 自动采集附近宠物医院、宠物门店，并标记为宠物友好
 */
async function collectPetServicePOIs(options) {
  const { city = '', latitude = 39.9042, longitude = 116.4074 } = options || {};
  if (!amap.isAmapConfigured()) {
    return fallbackNear(latitude, longitude, city);
  }
  try {
    const [hospitals, stores] = await Promise.all([
      searchCategory(['宠物医院', '动物医院'], 'petHospital', city, latitude, longitude),
      searchCategory(['宠物店', '宠物用品'], 'petStore', city, latitude, longitude),
    ]);
    const merged = [...hospitals, ...stores];
    if (merged.length) return merged;
  } catch (e) {
    /* 降级 mock */
  }
  return fallbackNear(latitude, longitude, city);
}

function mergeMapPoints(localPoints, collectedPoints) {
  const map = new Map();
  const keyOf = (p) => `${(p.name || '').trim()}_${Number(p.latitude).toFixed(4)}_${Number(p.longitude).toFixed(4)}`;
  (localPoints || []).forEach((p) => map.set(keyOf(p), p));
  (collectedPoints || []).forEach((p) => {
    const k = keyOf(p);
    if (!map.has(k)) map.set(k, p);
  });
  return Array.from(map.values());
}

module.exports = {
  collectPetServicePOIs,
  mergeMapPoints,
};
