const { ok, fail } = require('../common/response');
const { merchantApplies, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const {
  pickMerchantApplyPayload,
  validateMerchantApply,
  publicMerchantApply,
} = require('../common/merchant-apply-fields');

async function findMyApply(openid) {
  const _ = getDb().command;
  const cond = _.and([
    _.or([{ _openid: openid }, { openid }]),
    { userDeleted: _.neq(true) },
    { status: _.neq(0) },
  ]);
  try {
    const res = await merchantApplies().where(cond).orderBy('updatedAt', 'desc').limit(1).get();
    return (res.data && res.data[0]) || null;
  } catch (e) {
    const res = await merchantApplies().where(cond).limit(1).get();
    return (res.data && res.data[0]) || null;
  }
}

async function getMine(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const doc = await findMyApply(auth.openid);
  if (!doc) {
    return ok({
      apply: null,
      auditStatus: 'none',
    });
  }
  const pub = publicMerchantApply(doc, auth.openid);
  return ok({
    apply: pub,
    auditStatus: pub.auditStatus,
  });
}

async function submit(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const body = pickMerchantApplyPayload(payload);
  const msg = validateMerchantApply(body);
  if (msg) return fail(400, msg);

  const existing = await findMyApply(auth.openid);
  if (existing) {
    if (existing.auditStatus === 'pending') {
      return fail(400, '入驻申请审核中，请耐心等待');
    }
    if (existing.auditStatus === 'approved') {
      return fail(400, '已通过入驻，无需重复提交');
    }
  }

  const base = {
    ...body,
    openid: auth.openid,
    _openid: auth.openid,
    userId: auth.user._id,
    userName: auth.user.nickname || body.contact || '商家',
    auditStatus: 'pending',
    rejectReason: '',
    merchantId: '',
    submittedAt: now(),
    updatedAt: now(),
    userDeleted: false,
    status: 1,
  };

  if (existing && existing._id) {
    await merchantApplies().doc(existing._id).update({ data: base });
    const after = await merchantApplies().doc(existing._id).get();
    return ok({ apply: publicMerchantApply(after.data, auth.openid) });
  }

  const addRes = await merchantApplies().add({
    data: {
      ...base,
      createdAt: now(),
    },
  });
  const created = await merchantApplies().doc(addRes._id).get();
  return ok({ apply: publicMerchantApply(created.data, auth.openid) });
}

async function remove(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const doc = await findMyApply(auth.openid);
  if (!doc) return fail(404, '暂无申请');
  if (doc.auditStatus !== 'pending') {
    return fail(400, '仅审核中的申请可撤回');
  }
  await merchantApplies().doc(doc._id).update({
    data: {
      userDeleted: true,
      status: 0,
      updatedAt: now(),
    },
  });
  return ok({ id: doc._id });
}

module.exports = {
  getMine,
  submit,
  remove,
};
