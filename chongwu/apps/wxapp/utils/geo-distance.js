const { findCityByName } = require('./china-cities');

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValidCoord(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
}

function pickLatLngFromObject(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const lat = Number(obj.latitude != null ? obj.latitude : obj.lat);
  const lng = Number(obj.longitude != null ? obj.longitude : obj.lng);
  if (!isValidCoord(lat, lng)) return null;
  return { lat, lng };
}

function findCityCoordsFromPlaceName(place) {
  const s = String(place || '').trim();
  if (!s) return null;
  let city = findCityByName(s);
  if (city && isValidCoord(city.lat, city.lng)) return city;
  const m = s.match(/([\u4e00-\u9fa5]{2,10}?)市/);
  if (m) {
    city = findCityByName(m[1]) || findCityByName(`${m[1]}市`);
    if (city && isValidCoord(city.lat, city.lng)) return city;
  }
  return null;
}

function pickBuddyLatLng(buddy) {
  if (!buddy) return null;
  const fromLoc = pickLatLngFromObject(buddy.location);
  if (fromLoc) return fromLoc;
  const direct = pickLatLngFromObject(buddy);
  if (direct) return direct;
  const places = [
    buddy.expectPlace,
    buddy.expectPlaceAddress,
    buddy.city,
    buddy.location && buddy.location.name,
    buddy.location && buddy.location.address,
  ];
  for (let i = 0; i < places.length; i += 1) {
    const city = findCityCoordsFromPlaceName(places[i]);
    if (city) return { lat: city.lat, lng: city.lng };
  }
  return null;
}

function resolveViewerLatLng(viewer) {
  const v = viewer || {};
  const direct = pickLatLngFromObject(v);
  if (direct) return direct;
  const city = findCityByName(v.city);
  if (city && isValidCoord(city.lat, city.lng)) {
    return { lat: city.lat, lng: city.lng };
  }
  return null;
}

function formatKm(km) {
  if (km == null || !Number.isFinite(km)) return '';
  if (km < 0.05) return '<0.1km';
  if (km < 10) return `${km.toFixed(1)}km`;
  if (km < 100) return `${Math.round(km)}km`;
  return `${Math.round(km)}km`;
}

function isStoredDistanceUsable(raw) {
  const s = String(raw || '').trim();
  if (!s || s === '同城' || s === '0km' || s === '0.0km') return false;
  if (/^距您/.test(s) && /0\s*km/i.test(s)) return false;
  return true;
}

/** 相对当前用户/城市的直线距离文案（不含「距您」前缀） */
function buddyDistanceText(buddy, viewerLocation) {
  const origin = resolveViewerLatLng(viewerLocation);
  const target = pickBuddyLatLng(buddy);
  if (origin && target) {
    return formatKm(haversineKm(origin.lat, origin.lng, target.lat, target.lng));
  }
  if (isStoredDistanceUsable(buddy && buddy.distance)) {
    return String(buddy.distance).replace(/^距您/, '').trim();
  }
  return '';
}

module.exports = {
  haversineKm,
  formatKm,
  pickBuddyLatLng,
  resolveViewerLatLng,
  buddyDistanceText,
};
