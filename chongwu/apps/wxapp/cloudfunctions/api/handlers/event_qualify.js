const { ok, fail } = require('../common/response');
const { eventQualify, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const { pickQualifyPayload, validateQualify, publicQualify } = require('../common/qualify-fields');

async function findQualify(openid, role) {
  const _ = getDb().command;
  const cond = _.and([
    _.or([{ _openid: openid }, { openid }]),
    { role },
    { userDeleted: _.neq(true) },
    { status: _.neq(0) },
  ]);
  try {
    const res = await eventQualify().where(cond).orderBy('updatedAt', 'desc').limit(1).get();
    return (res.data && res.data[0]) || null;
  } catch (e) {
    const res = await eventQualify().where(cond).limit(1).get();
    return (res.data && res.data[0]) || null;
  }
}

async function getMine(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const role = payload && payload.role === 'merchant' ? 'merchant' : 'personal';
  const doc = await findQualify(auth.openid, role);
  if (!doc) {
    return ok({
      role,
      verifyStatus: 'none',
      verify: null,
      canPublish: false,
    });
  }
  const pub = publicQualify(doc, auth.openid);
  return ok({
    qualify: pub,
    role: pub.role,
    verifyStatus: pub.verifyStatus,
    canPublish: pub.canPublish,
  });
}

async function submit(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const body = pickQualifyPayload(payload);
  const msg = validateQualify(body);
  if (msg) return fail(400, msg);

  const existing = await findQualify(auth.openid, body.role);
  if (existing) {
    if (existing.verifyStatus === 'pending') {
      return fail(400, '审核中，请耐心等待');
    }
    if (existing.verifyStatus === 'approved') {
      return fail(400, '资质已通过，无需重复提交');
    }
  }

  const base = {
    ...body,
    openid: auth.openid,
    _openid: auth.openid,
    userId: auth.user._id,
    userName: auth.user.nickname || body.realName || body.companyName || '宠友',
    verifyStatus: 'pending',
    rejectReason: '',
    submittedAt: now(),
    updatedAt: now(),
    userDeleted: false,
    status: 1,
  };

  if (existing && existing._id) {
    await eventQualify().doc(existing._id).update({ data: base });
    const after = await eventQualify().doc(existing._id).get();
    return ok({ qualify: publicQualify(after.data, auth.openid) });
  }

  const addRes = await eventQualify().add({
    data: {
      ...base,
      createdAt: now(),
    },
  });
  const created = await eventQualify().doc(addRes._id).get();
  return ok({ qualify: publicQualify(created.data, auth.openid) });
}

module.exports = {
  getMine,
  submit,
};
