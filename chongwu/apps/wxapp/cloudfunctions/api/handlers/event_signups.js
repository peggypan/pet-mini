const { ok, fail } = require('../common/response');
const { eventSignups, events, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const {
  pickSignupPayload,
  validateSignup,
  makeTicketCode,
  publicSignup,
  snapshotFromEvent,
} = require('../common/signup-fields');

function viewerOpenid(ctx) {
  return (ctx && ctx.OPENID) || '';
}

async function findMySignup(eventId, openid) {
  const _ = getDb().command;
  const cond = _.and([
    { eventId: String(eventId) },
    _.or([{ _openid: openid }, { openid }]),
    { userDeleted: _.neq(true) },
    { status: _.neq(0) },
  ]);
  const res = await eventSignups().where(cond).limit(1).get();
  return (res.data && res.data[0]) || null;
}

async function assertEventJoinable(eventId) {
  try {
    const got = await events().doc(eventId).get();
    const doc = got.data;
    if (!doc || doc.userDeleted === true || doc.status === 'user_deleted') {
      return { err: fail(404, '活动不存在') };
    }
    if (doc.auditStatus !== 'approved') {
      return { err: fail(404, '活动不存在') };
    }
    const remain = doc.remain != null ? Number(doc.remain) : Number(doc.maxPeople) || 0;
    if (remain <= 0) {
      return { err: fail(400, '名额已满') };
    }
    return { doc, remain };
  } catch (e) {
    return { err: fail(404, '活动不存在') };
  }
}

async function listMine(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const _ = getDb().command;
  const cond = _.or([{ _openid: auth.openid }, { openid: auth.openid }]);

  let rows = [];
  try {
    const res = await eventSignups()
      .where(_.and([cond, { userDeleted: _.neq(true) }, { status: _.neq(0) }]))
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await eventSignups().where(cond).limit(100).get();
    rows = (res.data || []).filter((d) => d.userDeleted !== true && d.status !== 0);
  }

  return ok({ list: rows.map((d) => publicSignup(d, auth.openid)) });
}

async function getMyByEvent(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const eventId = payload && payload.eventId;
  if (!eventId) return fail(400, '缺少 eventId');

  const doc = await findMySignup(eventId, auth.openid);
  if (!doc) return ok({ signup: null });
  return ok({ signup: publicSignup(doc, auth.openid) });
}

async function get(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const id = payload && payload.id;
  if (!id) return fail(400, '缺少 id');

  try {
    const got = await eventSignups().doc(id).get();
    const doc = got.data;
    if (!doc || doc.userDeleted === true || doc.status === 0) {
      return fail(404, '报名不存在');
    }
    if (doc.openid !== auth.openid && doc._openid !== auth.openid) {
      return fail(403, '无权查看');
    }
    return ok({ signup: publicSignup(doc, auth.openid) });
  } catch (e) {
    return fail(404, '报名不存在');
  }
}

async function save(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const body = pickSignupPayload({
    ...payload,
    contactName: (payload && payload.contactName) || auth.user.nickname || '宠友',
  });
  const msg = validateSignup(body);
  if (msg) return fail(400, msg);

  const existed = await findMySignup(body.eventId, auth.openid);
  if (existed) {
    return ok({
      signup: publicSignup(existed, auth.openid),
      duplicated: true,
    });
  }

  const joinable = await assertEventJoinable(body.eventId);
  if (joinable.err) return joinable.err;
  const eventDoc = joinable.doc;

  let ticketCode = makeTicketCode();
  for (let i = 0; i < 5; i += 1) {
    const dup = await eventSignups().where({ ticketCode }).limit(1).get();
    if (!dup.data || !dup.data.length) break;
    ticketCode = makeTicketCode();
  }

  const snap = snapshotFromEvent(eventDoc, {
    ...body,
    contactName: body.contactName || auth.user.nickname || '宠友',
  });

  const base = {
    ...snap,
    eventId: String(body.eventId),
    openid: auth.openid,
    _openid: auth.openid,
    userId: auth.user._id,
    userName: auth.user.nickname || body.contactName || '宠友',
    ticketCode,
    checkedIn: false,
    userDeleted: false,
    status: 1,
    createdAt: now(),
    updatedAt: now(),
  };

  const addRes = await eventSignups().add({ data: base });
  const _ = getDb().command;
  await events()
    .doc(body.eventId)
    .update({
      data: {
        signupCount: _.inc(1),
        remain: _.inc(-1),
        updatedAt: now(),
      },
    });

  const created = await eventSignups().doc(addRes._id).get();
  let eventPatch = null;
  try {
    const ev = await events().doc(body.eventId).get();
    eventPatch = ev.data
      ? { remain: ev.data.remain, signupCount: ev.data.signupCount }
      : null;
  } catch (e) {
    // ignore
  }

  return ok({
    signup: publicSignup(created.data, auth.openid),
    duplicated: false,
    event: eventPatch,
  });
}

async function remove(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const id = payload && payload.id;
  const eventId = payload && payload.eventId;
  if (!id && !eventId) return fail(400, '缺少 id 或 eventId');

  let doc = null;
  try {
    if (id) {
      const got = await eventSignups().doc(id).get();
      doc = got.data;
    } else {
      doc = await findMySignup(eventId, auth.openid);
    }
  } catch (e) {
    return fail(404, '报名不存在');
  }

  if (!doc || doc.userDeleted === true) return fail(404, '报名不存在');
  if (doc.openid !== auth.openid && doc._openid !== auth.openid) {
    return fail(403, '无权取消');
  }
  if (doc.checkedIn) return fail(400, '已核销，无法取消');

  await eventSignups().doc(doc._id).update({
    data: {
      userDeleted: true,
      status: 0,
      updatedAt: now(),
    },
  });

  const _ = getDb().command;
  if (doc.eventId) {
    await events()
      .doc(doc.eventId)
      .update({
        data: {
          signupCount: _.inc(-1),
          remain: _.inc(1),
          updatedAt: now(),
        },
      })
      .catch(() => {});
  }

  return ok({ id: doc._id });
}

module.exports = {
  listMine,
  getMyByEvent,
  get,
  save,
  remove,
};
