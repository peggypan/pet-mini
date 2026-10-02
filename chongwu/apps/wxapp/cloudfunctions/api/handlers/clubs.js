const { ok, fail } = require('../common/response');
const { clubs, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const { pickClubPayload, validateClub, publicClub } = require('../common/club-fields');

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
  const limit = Math.min(100, Math.max(1, Number(payload && payload.limit) || 50));
  const skip = Math.max(0, Number(payload && payload.skip) || 0);

  const parts = [
    { onlineStatus: 'online' },
    { userDeleted: _.neq(true) },
    { status: _.neq(0) },
  ];
  if (city) parts.push({ city });

  let rows = [];
  try {
    const res = await clubs()
      .where(_.and(parts))
      .orderBy('updatedAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await clubs().where(_.and(parts)).limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  const openid = viewerOpenid(wxContext);
  return ok({
    list: rows.map((d) => publicClub(d, openid)),
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
    const res = await clubs()
      .where(_.and([cond, { userDeleted: _.neq(true) }, { status: _.neq(0) }]))
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await clubs().where(cond).limit(20).get();
    rows = sortByCreatedDesc(res.data || []).filter(
      (d) => d.userDeleted !== true && d.status !== 0,
    );
  }

  return ok({ list: rows.map((d) => publicClub(d, auth.openid)) });
}

async function get(payload, wxContext) {
  const id = payload && payload.id;
  if (!id) return fail(400, '缺少 id');
  const openid = viewerOpenid(wxContext);

  try {
    const got = await clubs().doc(id).get();
    const doc = got.data;
    if (!doc || doc.status === 0 || doc.userDeleted === true) {
      return fail(404, '俱乐部不存在');
    }
    if (doc.onlineStatus !== 'online' && doc.openid !== openid && doc._openid !== openid) {
      return fail(404, '俱乐部不存在');
    }
    return ok({ club: publicClub(doc, openid) });
  } catch (e) {
    return fail(404, '俱乐部不存在');
  }
}

async function save(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const clubId = payload && payload.id;
  const body = pickClubPayload(payload);
  const msg = validateClub(body, !!clubId);
  if (msg) return fail(400, msg);

  const base = {
    name: body.name,
    city: body.city,
    intro: body.intro,
    cover: body.cover,
    updatedAt: now(),
  };

  if (clubId) {
    try {
      const got = await clubs().doc(clubId).get();
      const prev = got.data;
      if (!prev || prev.status === 0) return fail(404, '俱乐部不存在');
      if (prev.openid !== auth.openid && prev._openid !== auth.openid) {
        return fail(403, '无权修改');
      }
      await clubs().doc(clubId).update({
        data: {
          ...base,
          cover: body.cover || prev.cover,
          memberCount: prev.memberCount != null ? prev.memberCount : 0,
          eventCount: prev.eventCount != null ? prev.eventCount : 0,
          onlineStatus: prev.onlineStatus || 'pending',
          sourceApplyId: prev.sourceApplyId || '',
          openid: prev.openid,
          _openid: prev._openid,
          ownerId: prev.ownerId,
          ownerNickname: prev.ownerNickname,
          createdAt: prev.createdAt,
        },
      });
      const after = await clubs().doc(clubId).get();
      return ok({ club: publicClub(after.data, auth.openid) });
    } catch (e) {
      return fail(404, '俱乐部不存在');
    }
  }

  const addRes = await clubs().add({
    data: {
      ...base,
      openid: auth.openid,
      _openid: auth.openid,
      ownerId: auth.user._id,
      ownerNickname: auth.user.nickname || '主理人',
      memberCount: 0,
      eventCount: 0,
      onlineStatus: 'pending',
      sourceApplyId: body.sourceApplyId || '',
      userDeleted: false,
      status: 1,
      createdAt: now(),
    },
  });
  const created = await clubs().doc(addRes._id).get();
  return ok({ club: publicClub(created.data, auth.openid) });
}

async function remove(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const id = payload && payload.id;
  if (!id) return fail(400, '缺少 id');

  try {
    const got = await clubs().doc(id).get();
    const doc = got.data;
    if (!doc) return fail(404, '俱乐部不存在');
    if (doc.openid !== auth.openid && doc._openid !== auth.openid) {
      return fail(403, '无权删除');
    }
    await clubs().doc(id).update({
      data: {
        userDeleted: true,
        onlineStatus: 'offline',
        status: 0,
        updatedAt: now(),
      },
    });
    return ok({ id });
  } catch (e) {
    return fail(404, '俱乐部不存在');
  }
}

module.exports = {
  listFeed,
  listMine,
  get,
  save,
  remove,
};
