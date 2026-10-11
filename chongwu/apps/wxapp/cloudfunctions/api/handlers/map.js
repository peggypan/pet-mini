const https = require('https');
const { ok, fail } = require('../common/response');
const { TENCENT_MAP_KEY, isConfigured } = require('../common/tencent-map');

const CACHE = new Map();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHE = 500;
function bucket(lat, lng) {
  return `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}`;
}

function parseComponent(comp) {
  if (!comp) return { province: '', city: '', district: '', adcode: '' };
  return {
    province: comp.province || '',
    city: (comp.city || '').replace(/市$/, ''),
    district: comp.district || '',
    adcode: comp.adcode || '',
  };
}

function tencentReverse(lat, lng) {
  return new Promise((resolve, reject) => {
    const location = `${lat},${lng}`;
    const path = `/ws/geocoder/v1/?location=${encodeURIComponent(location)}&key=${encodeURIComponent(TENCENT_MAP_KEY)}`;
    https.get(
      {
        hostname: 'apis.map.qq.com',
        path,
        timeout: 8000,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (Number(data.status) !== 0) {
              const msg = data.message || 'tencent geocode error';
              const status = Number(data.status);
              const err = new Error(`[${status}] ${msg}`);
              err.tencentStatus = status;
              err.tencentRequestId = data.request_id || '';
              reject(err);
              return;
            }
            resolve(data.result || {});
          } catch (e) {
            reject(e);
          }
        });
      },
    ).on('error', reject);
  });
}

async function reverseGeocode(payload) {
  const lat = Number(payload && payload.lat);
  const lng = Number(payload && payload.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return fail(400, '缺少有效 lat/lng');
  }

  const key = bucket(lat, lng);
  const hit = CACHE.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return ok({ ...hit.data, source: 'cloud_cache' });
  }

  if (!isConfigured()) {
    return fail(503, '未配置腾讯地图 Key');
  }

  try {
    const result = await tencentReverse(lat, lng);
    const comp = parseComponent(result.address_component);
    const adInfo = result.ad_info || {};
    const formatted = result.address || (result.formatted_addresses && result.formatted_addresses.recommend) || '';
    const data = {
      lat,
      lng,
      province: comp.province || adInfo.province || '',
      city: comp.city || (comp.district || '').replace(/市$/, '') || '',
      district: comp.district || adInfo.district || '',
      adcode: adInfo.adcode || comp.adcode || '',
      address: formatted,
      formattedAddress: formatted,
      source: 'cloud_tencent',
    };
    if (!data.city) {
      return fail(502, '腾讯未返回城市');
    }
    CACHE.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    if (CACHE.size > MAX_CACHE) {
      const first = CACHE.keys().next().value;
      CACHE.delete(first);
    }
    return ok(data);
  } catch (e) {
    const msg = String(e.message || e);
    const status = Number(e.tencentStatus);
    if (status === 121) return fail(429, msg);
    return fail(502, msg);
  }
}

/** 用固定坐标探测 Key 是否可用（北京天安门附近），便于对照 lbs 控制台调用量 */
async function diagnoseGeocodeKey() {
  const lat = 39.908823;
  const lng = 116.39747;
  const key = (TENCENT_MAP_KEY || '').trim();
  const keyTail = key.slice(-6);
  const keyHead = key.slice(0, 8);
  const keyFromEnv = !!(process.env.TENCENT_MAP_KEY && process.env.TENCENT_MAP_KEY.trim());
  if (!isConfigured()) {
    return ok({
      ok: false,
      keyHead,
      keyTail,
      keyFromEnv,
      message: '云函数未配置 TENCENT_MAP_KEY',
    });
  }
  try {
    const result = await tencentReverse(lat, lng);
    const comp = parseComponent(result.address_component);
    return ok({
      ok: true,
      keyHead,
      keyTail,
      keyFromEnv,
      tencentStatus: 0,
      sampleCity: comp.city || '',
      hint: '若 ok 为 true 但小程序仍 fallback，请核对 utils/amap-config.js 的 Key 是否与控制台一致',
    });
  } catch (e) {
    return ok({
      ok: false,
      keyHead,
      keyTail,
      keyFromEnv,
      tencentStatus: Number(e.tencentStatus) || null,
      tencentRequestId: e.tencentRequestId || '',
      message: String(e.message || e),
      hint:
        'Key额度页 0/6000 仍 121 时：查「账户额度」是否还有余量、额度是否刚分配需等待同步；或带 request_id 提 LBS 工单',
    });
  }
}

module.exports = {
  reverseGeocode,
  diagnoseGeocodeKey,
};
