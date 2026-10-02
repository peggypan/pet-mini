const { ok, fail } = require('../common/response');
const { banners, getDb } = require('../common/db');
const { publicBanner, sortBanners, isWithinSchedule } = require('../common/banner-fields');

async function listFeed(payload, _wxContext) {
  const _ = getDb().command;
  const city = payload && payload.city;
  const limit = Math.min(20, Math.max(1, Number(payload && payload.limit) || 10));
  const nowMs = Date.now();

  const parts = [{ status: 1 }];
  if (city) {
    parts.push(_.or([{ city: '' }, { city }]));
  }

  let rows = [];
  try {
    const res = await banners()
      .where(_.and(parts))
      .orderBy('sortOrder', 'asc')
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await banners().where(_.and(parts)).limit(limit).get();
    rows = sortBanners(res.data || []);
  }

  rows = rows.filter((d) => isWithinSchedule(d, nowMs));
  return ok({ list: rows.map((d) => publicBanner(d)) });
}

async function get(payload, _wxContext) {
  const id = payload && payload.id;
  if (!id) return fail(400, '缺少 id');
  const nowMs = Date.now();

  try {
    const got = await banners().doc(id).get();
    const doc = got.data;
    if (!doc || doc.status !== 1) return fail(404, 'Banner 不存在');
    if (!isWithinSchedule(doc, nowMs)) return fail(404, 'Banner 未在投放期');
    return ok({ banner: publicBanner(doc) });
  } catch (e) {
    return fail(404, 'Banner 不存在');
  }
}

async function save(payload, _wxContext) {
  return fail(403, 'Banner 由运营后台维护，请使用 admin 接口');
}

async function remove(_payload, _wxContext) {
  return fail(403, 'Banner 由运营后台维护，请使用 admin 接口');
}

module.exports = {
  listFeed,
  get,
  save,
  remove,
};
