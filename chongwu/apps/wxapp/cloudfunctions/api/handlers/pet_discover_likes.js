const { ok, fail } = require('../common/response');
const { petDiscoverLikes, petDiscoverDaily, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const { pickSwipePayload, publicLike } = require('../common/pet-discover-likes-fields');
const {
  quotaView,
  getOrCreateDaily,
  incrementShareBonus,
  dailyLimit,
} = require('../common/pet-discover-quota');

async function countMyLikes(openid) {
  const _ = getDb().command;
  try {
    const res = await petDiscoverLikes()
      .where(_.and([{ openid }, { status: 1 }]))
      .count();
    return (res && res.total) || 0;
  } catch (e) {
    const res = await petDiscoverLikes().where({ openid }).limit(100).get();
    return (res.data || []).filter((d) => d.status !== 0).length;
  }
}

async function listMineRows(openid, limit) {
  const _ = getDb().command;
  const cond = _.and([{ openid }, { status: 1 }]);
  let rows = [];
  try {
    const res = await petDiscoverLikes()
      .where(cond)
      .orderBy('likedAt', 'desc')
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await petDiscoverLikes().where(cond).limit(limit).get();
    rows = (res.data || []).sort((a, b) => {
      const ta = a.likedAt ? new Date(a.likedAt).getTime() : 0;
      const tb = b.likedAt ? new Date(b.likedAt).getTime() : 0;
      return tb - ta;
    });
  }
  return rows;
}

async function getSummary(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const limit = 80;
  const [daily, rows] = await Promise.all([
    getOrCreateDaily(auth),
    listMineRows(auth.openid, limit),
  ]);
  const items = rows.map((d) => publicLike(d)).filter(Boolean);
  const quota = quotaView(daily, items.length);
  return ok({ items, quota });
}

async function listMine(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const limit = Math.min(100, Math.max(1, Number(payload && payload.limit) || 80));
  const rows = await listMineRows(auth.openid, limit);
  return ok({ list: rows.map((d) => publicLike(d)).filter(Boolean) });
}

async function getQuota(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const daily = await getOrCreateDaily(auth);
  const likedCount = await countMyLikes(auth.openid);
  return ok({ quota: quotaView(daily, likedCount) });
}

async function findLike(openid, targetId) {
  if (!targetId) return null;
  const res = await petDiscoverLikes()
    .where({ openid, targetId, status: 1 })
    .limit(1)
    .get();
  return (res.data && res.data[0]) || null;
}

async function swipe(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const body = pickSwipePayload(payload);
  if (!body.targetId) return fail(400, '缺少 targetId');

  const daily = await getOrCreateDaily(auth);
  const limit = dailyLimit(daily);
  const used = Number(daily.used) || 0;
  if (used >= limit) {
    return fail(429, '今日滑动次数已用完', { quota: true });
  }

  const nextUsed = used + 1;
  await petDiscoverDaily().doc(daily._id).update({
    data: { used: nextUsed, updatedAt: now() },
  });

  let likeDoc = null;
  if (body.asLike) {
    const existing = await findLike(auth.openid, body.targetId);
    if (existing) {
      likeDoc = existing;
    } else {
      const ts = now();
      const addRes = await petDiscoverLikes().add({
        data: {
          openid: auth.openid,
          _openid: auth.openid,
          userId: auth.user._id,
          targetId: body.targetId,
          targetType: body.targetType,
          userName: body.userName || '宠友',
          petName: body.petName,
          breed: body.breed,
          avatar: body.avatar,
          distance: body.distance,
          status: 1,
          likedAt: ts,
          createdAt: ts,
          updatedAt: ts,
        },
      });
      const got = await petDiscoverLikes().doc(addRes._id).get();
      likeDoc = got.data;
    }
  }

  const freshDaily = await getOrCreateDaily(auth);
  const rows = await listMineRows(auth.openid, 80);
  const items = rows.map((d) => publicLike(d)).filter(Boolean);
  const quota = quotaView(freshDaily, items.length);

  return ok({
    ok: true,
    like: likeDoc ? publicLike(likeDoc) : null,
    items,
    quota,
  });
}

async function addShareBonus(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const res = await incrementShareBonus(auth);
  const daily = res.row;
  const likedCount = await countMyLikes(auth.openid);
  const quota = quotaView(daily, likedCount);
  if (!res.ok) {
    return ok({ ok: false, capped: true, added: 0, quota });
  }
  return ok({ ok: true, added: res.added, quota });
}

async function remove(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const targetId = (payload && payload.targetId) || (payload && payload.id);
  if (!targetId) return fail(400, '缺少 targetId');

  const existing = await findLike(auth.openid, String(targetId));
  if (!existing) return ok({ removed: false });

  await petDiscoverLikes().doc(existing._id).update({
    data: { status: 0, updatedAt: now() },
  });
  const rows = await listMineRows(auth.openid, 80);
  const items = rows.map((d) => publicLike(d)).filter(Boolean);
  const daily = await getOrCreateDaily(auth);
  return ok({ removed: true, items, quota: quotaView(daily, items.length) });
}

module.exports = {
  getSummary,
  listMine,
  getQuota,
  swipe,
  addShareBonus,
  remove,
};
