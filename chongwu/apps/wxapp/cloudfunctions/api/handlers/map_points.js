const { ok, fail } = require('../common/response');
const { mapPoints, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const { pickMapPayload, validateMap, publicMap } = require('../common/map-fields');

const DEFAULT_POINTS_REWARD = 5;

function viewerOpenid(ctx) {
  return (ctx && ctx.OPENID) || '';
}

function sortByCreatedDesc(rows) {
  return (rows || []).slice().sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

async function listFeed(payload, wxContext) {
  const _ = getDb().command;
  const city = payload && payload.city;
  const limit = Math.min(200, Math.max(1, Number(payload && payload.limit) || 80));
  const skip = Math.max(0, Number(payload && payload.skip) || 0);

  const parts = [
    { auditStatus: 'approved' },
    { userDeleted: _.neq(true) },
    { status: _.neq(0) },
  ];
  if (city) {
    parts.push({ city });
  }

  let rows = [];
  try {
    const res = await mapPoints()
      .where(_.and(parts))
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await mapPoints().where(_.and(parts)).limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  const openid = viewerOpenid(wxContext);
  return ok({
    list: rows.map((d) => publicMap(d, openid)),
    skip,
    limit,
  });
}

async function listMine(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const _ = getDb().command;
  const cond = _.or([{ _openid: auth.openid }, { openid: auth.openid }]);

  let rows = [];
  try {
    const res = await mapPoints()
      .where(_.and([cond, { userDeleted: _.neq(true) }, { status: _.neq(0) }]))
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await mapPoints().where(cond).limit(50).get();
    rows = sortByCreatedDesc(res.data || []).filter(
      (d) => d.userDeleted !== true && d.status !== 0,
    );
  }

  return ok({ list: rows.map((d) => publicMap(d, auth.openid)) });
}

async function get(payload, wxContext) {
  const id = payload && payload.id;
  if (!id) return fail(400, '缺少 id');
  const openid = viewerOpenid(wxContext);

  try {
    const got = await mapPoints().doc(id).get();
    const doc = got.data;
    if (!doc || doc.status === 0 || doc.userDeleted === true) {
      return fail(404, '点位不存在');
    }
    if (doc.auditStatus !== 'approved' && doc.openid !== openid && doc._openid !== openid) {
      return fail(404, '点位不存在');
    }
    return ok({ point: publicMap(doc, openid) });
  } catch (e) {
    return fail(404, '点位不存在');
  }
}

async function save(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const body = pickMapPayload(payload);
  const msg = validateMap(body);
  if (msg) return fail(400, msg);

  const base = {
    ...body,
    openid: auth.openid,
    _openid: auth.openid,
    userId: auth.user._id,
    userName: auth.user.nickname || '宠友',
    auditStatus: 'pending',
    rejectReason: '',
    pointsReward: DEFAULT_POINTS_REWARD,
    pointsGranted: false,
    userDeleted: false,
    status: 1,
    updatedAt: now(),
  };

  const pointId = payload && payload.id;
  if (pointId) {
    try {
      const got = await mapPoints().doc(pointId).get();
      const prev = got.data;
      if (!prev || prev.status === 0) return fail(404, '点位不存在');
      if (prev.openid !== auth.openid && prev._openid !== auth.openid) {
        return fail(403, '无权修改');
      }
      if (prev.auditStatus === 'pending') {
        return fail(400, '审核中，暂不可修改');
      }
      await mapPoints().doc(pointId).update({
        data: {
          ...base,
          auditStatus: 'pending',
          pointsGranted: false,
          createdAt: prev.createdAt,
        },
      });
      const after = await mapPoints().doc(pointId).get();
      return ok({ point: publicMap(after.data, auth.openid) });
    } catch (e) {
      return fail(404, '点位不存在');
    }
  }

  const addRes = await mapPoints().add({
    data: {
      ...base,
      createdAt: now(),
    },
  });
  const created = await mapPoints().doc(addRes._id).get();
  return ok({ point: publicMap(created.data, auth.openid) });
}

async function remove(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const id = payload && payload.id;
  if (!id) return fail(400, '缺少 id');

  try {
    const got = await mapPoints().doc(id).get();
    const doc = got.data;
    if (!doc) return fail(404, '点位不存在');
    if (doc.openid !== auth.openid && doc._openid !== auth.openid) {
      return fail(403, '无权删除');
    }
    await mapPoints().doc(id).update({
      data: {
        userDeleted: true,
        updatedAt: now(),
      },
    });
    return ok({ id });
  } catch (e) {
    return fail(404, '点位不存在');
  }
}

module.exports = {
  listFeed,
  listMine,
  get,
  save,
  remove,
};
