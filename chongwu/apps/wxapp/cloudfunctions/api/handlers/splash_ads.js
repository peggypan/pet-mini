const { ok, fail } = require('../common/response');
const { splashAds, getDb } = require('../common/db');
const {
  publicSplashAd,
  sortSplashAds,
  filterOnlineScheduled,
} = require('../common/splash-ad-fields');

async function listFeed(payload, _wxContext) {
  const limit = Math.min(10, Math.max(1, Number(payload && payload.limit) || 5));
  const nowMs = Date.now();
  const _ = getDb().command;

  let rows = [];
  try {
    const res = await splashAds()
      .where({ status: 'online' })
      .orderBy('sortOrder', 'desc')
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await splashAds().where({ status: 'online' }).limit(limit).get();
    rows = sortSplashAds(filterOnlineScheduled(res.data || [], nowMs));
  }

  rows = filterOnlineScheduled(rows, nowMs).slice(0, limit);
  return ok({ list: rows.map((d) => publicSplashAd(d)) });
}

async function getActive(_payload, _wxContext) {
  const nowMs = Date.now();
  let rows = [];
  try {
    const res = await splashAds()
      .where({ status: 'online' })
      .orderBy('sortOrder', 'desc')
      .limit(5)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await splashAds().where({ status: 'online' }).limit(5).get();
    rows = sortSplashAds(filterOnlineScheduled(res.data || [], nowMs));
  }
  rows = filterOnlineScheduled(rows, nowMs);
  const ad = rows[0] ? publicSplashAd(rows[0]) : null;
  return ok({ ad });
}

async function get(payload, _wxContext) {
  const id = payload && payload.id;
  if (!id) return fail(400, '缺少 id');
  const nowMs = Date.now();

  try {
    const got = await splashAds().doc(id).get();
    const doc = got.data;
    if (!doc || doc.status !== 'online') return fail(404, '广告不存在');
    if (!filterOnlineScheduled([doc], nowMs).length) {
      return fail(404, '广告未在投放期');
    }
    return ok({ ad: publicSplashAd(doc) });
  } catch (e) {
    return fail(404, '广告不存在');
  }
}

async function save(_payload, _wxContext) {
  return fail(403, '开屏广告由运营后台维护，请使用 admin 接口');
}

async function remove(_payload, _wxContext) {
  return fail(403, '开屏广告由运营后台维护，请使用 admin 接口');
}

module.exports = {
  listFeed,
  getActive,
  get,
  save,
  remove,
};
