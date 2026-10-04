const { ok, fail } = require('../common/response');
const { events, eventInterests, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const { pickEventPayload, validateEvent, publicEvent } = require('../common/event-fields');

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
    { auditStatus: 'approved' },
    { userDeleted: _.neq(true) },
    { status: _.neq('user_deleted') },
  ];
  if (city) {
    parts.push({ city });
  }

  let rows = [];
  try {
    const res = await events()
      .where(_.and(parts))
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await events().where(_.and(parts)).limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  const openid = viewerOpenid(wxContext);
  return ok({
    list: rows.map((d) => publicEvent(d, openid)),
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
    const res = await events().where(cond).orderBy('createdAt', 'desc').limit(50).get();
    rows = res.data || [];
  } catch (e) {
    const res = await events().where(cond).limit(50).get();
    rows = sortByCreatedDesc(res.data || []);
  }

  rows = rows.filter((d) => d.userDeleted !== true && d.status !== 'user_deleted');
  return ok({ list: rows.map((d) => publicEvent(d, auth.openid)) });
}

async function get(payload, wxContext) {
  const id = payload && payload.id;
  if (!id) return fail(400, '缺少 id');
  const openid = viewerOpenid(wxContext);

  try {
    const got = await events().doc(id).get();
    const doc = got.data;
    if (!doc || doc.userDeleted === true || doc.status === 'user_deleted') {
      return fail(404, '活动不存在');
    }
    if (doc.auditStatus !== 'approved' && doc.openid !== openid && doc._openid !== openid) {
      return fail(404, '活动不存在');
    }
    return ok({ event: publicEvent(doc, openid) });
  } catch (e) {
    return fail(404, '活动不存在');
  }
}

async function save(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const body = pickEventPayload(payload);
  const msg = validateEvent(body);
  if (msg) return fail(400, msg);

  const publisherName = body.publisherName || auth.user.nickname || '宠友';
  const base = {
    ...body,
    openid: auth.openid,
    _openid: auth.openid,
    userId: auth.user._id,
    publisherName,
    host: body.host || publisherName,
    hostAvatar: body.hostAvatar || auth.user.avatarUrl || auth.user.avatar || '',
    auditStatus: 'approved',
    userDeleted: false,
    status: 'published',
    signupCount: 0,
    interestCount: 0,
    updatedAt: now(),
  };

  const eventId = payload && payload.id;
  if (eventId) {
    try {
      const got = await events().doc(eventId).get();
      const prev = got.data;
      if (!prev || prev.userDeleted) return fail(404, '活动不存在');
      if (prev.openid !== auth.openid && prev._openid !== auth.openid) {
        return fail(403, '无权修改');
      }
      await events()
        .doc(eventId)
        .update({
          data: {
            ...base,
            signupCount: prev.signupCount || 0,
            interestCount: prev.interestCount || 0,
            remain: prev.remain != null ? prev.remain : base.remain,
          },
        });
      const after = await events().doc(eventId).get();
      return ok({ event: publicEvent(after.data, auth.openid) });
    } catch (e) {
      return fail(404, '活动不存在');
    }
  }

  const addRes = await events().add({
    data: {
      ...base,
      createdAt: now(),
    },
  });
  const created = await events().doc(addRes._id).get();
  return ok({ event: publicEvent(created.data, auth.openid) });
}

async function remove(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const id = payload && payload.id;
  if (!id) return fail(400, '缺少 id');

  try {
    const got = await events().doc(id).get();
    const doc = got.data;
    if (!doc) return fail(404, '活动不存在');
    if (doc.openid !== auth.openid && doc._openid !== auth.openid) {
      return fail(403, '无权删除');
    }
    await events().doc(id).update({
      data: {
        userDeleted: true,
        status: 'user_deleted',
        updatedAt: now(),
      },
    });
    return ok({ id });
  } catch (e) {
    return fail(404, '活动不存在');
  }
}

/** 用户打开活动详情计一次关注（同一微信用户同一活动仅计一次，无需业务登录） */
async function recordInterest(payload, wxContext) {
  const openid = viewerOpenid(wxContext);
  if (!openid) return fail(401, '无法识别用户');
  const eventId = payload && payload.eventId;
  if (!eventId) return fail(400, '缺少 eventId');

  try {
    const got = await events().doc(String(eventId)).get();
    const doc = got.data;
    if (!doc || doc.userDeleted || doc.auditStatus !== 'approved') {
      return fail(404, '活动不存在');
    }
    if (doc.openid === openid || doc._openid === openid) {
      return ok({
        interestCount: Number(doc.interestCount) || 0,
        alreadyInterested: true,
      });
    }

    const _ = getDb().command;
    const dup = await eventInterests()
      .where(
        _.and([
          { eventId: String(eventId) },
          _.or([{ openid }, { _openid: openid }]),
        ]),
      )
      .limit(1)
      .get();
    if (dup.data && dup.data.length) {
      return ok({
        interestCount: Number(doc.interestCount) || 0,
        alreadyInterested: true,
      });
    }

    await eventInterests().add({
      data: {
        eventId: String(eventId),
        openid,
        _openid: openid,
        createdAt: now(),
      },
    });
    await events()
      .doc(String(eventId))
      .update({
        data: {
          interestCount: _.inc(1),
          updatedAt: now(),
        },
      });
    const after = await events().doc(String(eventId)).get();
    return ok({
      interestCount: Number(after.data && after.data.interestCount) || 0,
      alreadyInterested: false,
    });
  } catch (e) {
    return fail(500, '记录关注失败');
  }
}

module.exports = {
  listFeed,
  listMine,
  get,
  save,
  remove,
  recordInterest,
};
