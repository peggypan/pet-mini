const STORAGE_KEY = 'mvp_reverse_geocode_cache_v1';
const MAX_ENTRIES = 40;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function bucket(lat, lng) {
  return `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}`;
}

function readAll() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || {};
  } catch (e) {
    return {};
  }
}

function writeAll(map) {
  try {
    wx.setStorageSync(STORAGE_KEY, map);
  } catch (e) {
    /* ignore */
  }
}

function get(lat, lng) {
  const key = bucket(lat, lng);
  const row = readAll()[key];
  if (!row || !row.data) return null;
  if (row.expiresAt && row.expiresAt < Date.now()) return null;
  return row.data;
}

function set(lat, lng, data) {
  if (!data || !data.city) return;
  const key = bucket(lat, lng);
  const map = readAll();
  map[key] = {
    data: {
      city: data.city,
      province: data.province || '',
      district: data.district || '',
      adcode: data.adcode || '',
      address: data.address || data.formattedAddress || '',
      formattedAddress: data.formattedAddress || data.address || '',
      source: data.source || 'tencent',
    },
    expiresAt: Date.now() + TTL_MS,
  };
  const keys = Object.keys(map);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => (map[a].expiresAt || 0) - (map[b].expiresAt || 0))
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((k) => delete map[k]);
  }
  writeAll(map);
}

module.exports = {
  get,
  set,
};
