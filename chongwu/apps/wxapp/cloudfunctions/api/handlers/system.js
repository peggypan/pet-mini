const cloud = require('wx-server-sdk');
const { ok, fail } = require('../common/response');
const { getDb } = require('../common/db');
const { sanitizeMediaFields, isBrokenMediaUrl } = require('../common/media-urls');

const VERSION = '0.1.0';

/** 与 database/collections.json → allNames 保持一致 */
const COLLECTION_NAMES = [
  'users',
  'pets',
  'buddy_posts',
  'pet_discover_likes',
  'pet_discover_daily',
  'social_posts',
  'social_comments',
  'local_posts',
  'chat_threads',
  'chat_messages',
  'user_follows',
  'events',
  'event_signups',
  'event_interests',
  'event_qualify',
  'map_points',
  'merchants',
  'merchant_applies',
  'host_applies',
  'clubs',
  'club_members',
  'pet_certs_public',
  'banners',
  'splash_ads',
  'points_ledger',
  'sensitive_words',
  'admin_users',
];

async function ping() {
  return ok({
    version: VERSION,
    time: new Date().toISOString(),
    message: '云开发 API 已连通',
  });
}

/**
 * 无数量限制小程序码（海报、分享）
 * scene 最多 32 字符；page 不含 query，参数放 scene
 */
async function getWxacode(payload) {
  const page = (payload && payload.page) || 'pages/event-detail/event-detail';
  let scene = trim(payload && payload.scene);
  if (!scene && payload && payload.id) {
    scene = trim(payload.id);
  }
  if (!scene) return fail(400, '缺少 scene 或 id');
  if (scene.length > 32) {
    return fail(400, 'scene 不能超过 32 字符');
  }

  const envVersion = (payload && payload.envVersion) || 'release';
  const allowed = ['develop', 'trial', 'release'];
  const ver = allowed.includes(envVersion) ? envVersion : 'release';

  try {
    const res = await cloud.openapi.wxacode.getUnlimited({
      scene,
      page,
      checkPath: false,
      envVersion: ver,
    });
    const buffer = res.buffer;
    if (!buffer) return fail(500, '小程序码生成失败');
    return ok({
      base64: buffer.toString('base64'),
      contentType: res.contentType || 'image/png',
      scene,
      page,
    });
  } catch (e) {
    console.error('[system.getWxacode]', e);
    return fail(500, e.message || '小程序码生成失败');
  }
}

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

/**
 * 检测云数据库集合是否已在控制台创建（未创建会报 -502005 等）
 */
async function checkCollections(payload) {
  const phase = payload && payload.phase;
  let names = COLLECTION_NAMES;
  if (phase === 1) names = COLLECTION_NAMES.slice(0, 2);
  else if (phase === 2) names = COLLECTION_NAMES.slice(0, 11);
  else if (phase === 3) names = COLLECTION_NAMES.slice(0, 15);
  else if (phase === 4) names = COLLECTION_NAMES.slice(0, 16);
  else if (phase === 5) names = COLLECTION_NAMES.slice(0, 21);
  else if (phase === 6) names = COLLECTION_NAMES;

  const db = getDb();
  const results = [];
  for (const name of names) {
    let status = 'ok';
    let count = null;
    let error = '';
    try {
      const res = await db.collection(name).count();
      count = res.total;
    } catch (e) {
      status = 'missing';
      error = e.errMsg || e.message || String(e);
      if (/DATABASE_COLLECTION_NOT_EXIST|collection not exists|502005/i.test(error)) {
        error = '集合未创建，请在控制台添加集合';
      }
    }
    results.push({ name, status, count, error });
  }
  const missing = results.filter((r) => r.status !== 'ok').map((r) => r.name);
  return ok({
    total: results.length,
    ready: results.length - missing.length,
    missing,
    collections: results,
    hint: missing.length
      ? '微信开发者工具 → 云开发 → 数据库 → 添加集合；权限见 database/permissions-map.json'
      : '全部集合可访问',
  });
}

const MEDIA_COLLECTIONS = ['buddy_posts', 'social_posts', 'local_posts', 'events', 'pets'];

/**
 * 清理库里的 http://tmp / wxfile 等无效链接（无法自动换成 cloud://，只能删掉坏链）
 * 云函数测试：{ "module": "system", "action": "repairTmpMediaUrls", "payload": { "dryRun": true } }
 * 确认后：payload 加 "confirm": true
 */
async function repairTmpMediaUrls(payload) {
  const p = payload || {};
  const dryRun = p.dryRun !== false;
  if (!dryRun && !p.confirm) {
    return fail(400, '执行写入请传 { "dryRun": false, "confirm": true }');
  }
  const db = getDb();
  const limit = Math.min(500, Math.max(1, Number(payload.limit) || 200));
  const report = [];

  for (const name of MEDIA_COLLECTIONS) {
    let scanned = 0;
    let fixed = 0;
    const samples = [];
    try {
      const res = await db.collection(name).limit(limit).get();
      const rows = res.data || [];
      for (const doc of rows) {
        scanned += 1;
        const { patch, changed } = sanitizeMediaFields(doc);
        if (!changed) continue;
        fixed += 1;
        if (samples.length < 5) {
          samples.push({ id: doc._id, patch });
        }
        if (!dryRun) {
          await db.collection(name).doc(doc._id).update({ data: patch });
        }
      }
    } catch (e) {
      report.push({ collection: name, error: e.message || String(e) });
      continue;
    }
    report.push({ collection: name, scanned, fixed, dryRun, samples });
  }

  return ok({
    dryRun,
    hint: 'tmp 链接无法恢复为 cloud://；已清除坏链的帖子需作者重新上传图片。云存储里未关联的文件可在控制台手动清理。',
    report,
  });
}

/** 仅统计含 tmp 链接的文档数量 */
async function scanBrokenMediaUrls() {
  const db = getDb();
  const limit = 200;
  const report = [];
  for (const name of MEDIA_COLLECTIONS) {
    let broken = 0;
    const ids = [];
    try {
      const res = await db.collection(name).limit(limit).get();
      (res.data || []).forEach((doc) => {
        const { changed } = sanitizeMediaFields(doc);
        if (changed) {
          broken += 1;
          if (ids.length < 10) ids.push(doc._id);
        }
      });
    } catch (e) {
      report.push({ collection: name, error: e.message || String(e) });
      continue;
    }
    report.push({ collection: name, brokenInSample: broken, sampleLimit: limit, sampleIds: ids });
  }
  return ok({
    hint: 'brokenInSample 为抽样条数内需清理的记录；执行 repairTmpMediaUrls 前可先 dryRun',
    report,
  });
}

module.exports = {
  ping,
  getWxacode,
  checkCollections,
  repairTmpMediaUrls,
  scanBrokenMediaUrls,
  isBrokenMediaUrl,
};
