const { ok, fail } = require('../common/response');
const { petCertsPublic, pets, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const {
  buildPublicPetCertSnapshot,
  isPetCertPublishable,
  publicPetCert,
} = require('../common/pet-cert-public-fields');

async function findCertByPetId(petId) {
  const _ = getDb().command;
  const cond = _.and([
    { petId: String(petId) },
    { userDeleted: _.neq(true) },
    { status: _.neq(0) },
  ]);
  const res = await petCertsPublic().where(cond).limit(1).get();
  return (res.data && res.data[0]) || null;
}

async function get(payload, _wxContext) {
  const petId = payload && payload.petId;
  if (!petId) return fail(400, '缺少 petId');

  const doc = await findCertByPetId(petId);
  if (!doc) return fail(404, '宠证不存在或未发布');

  const audit = doc.auditStatus || 'approved';
  if (audit === 'hidden' || audit === 'rejected') {
    return fail(404, '宠证不可用');
  }

  return ok({ cert: publicPetCert(doc) });
}

async function listMine(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const _ = getDb().command;
  const cond = _.or([{ _openid: auth.openid }, { openid: auth.openid }]);

  let rows = [];
  try {
    const res = await petCertsPublic()
      .where(_.and([cond, { userDeleted: _.neq(true) }, { status: _.neq(0) }]))
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await petCertsPublic().where(cond).limit(20).get();
    rows = (res.data || []).filter((d) => d.userDeleted !== true && d.status !== 0);
  }

  return ok({ list: rows.map((d) => publicPetCert(d)) });
}

async function publish(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const petId = payload && payload.petId;
  if (!petId) return fail(400, '缺少 petId');

  let petDoc = null;
  try {
    const got = await pets().doc(String(petId)).get();
    petDoc = got.data;
  } catch (e) {
    return fail(404, '宠物档案不存在');
  }

  if (!petDoc || petDoc.status === 0) return fail(404, '宠物档案不存在');
  if (petDoc.openid !== auth.openid && petDoc._openid !== auth.openid) {
    return fail(403, '无权发布该宠证');
  }
  if (!isPetCertPublishable(petDoc)) {
    return fail(400, '档案未通过审核或信息不完整，暂无法发布宠证');
  }

  const snapshot = buildPublicPetCertSnapshot({ ...petDoc, id: petId, _id: petId });
  const base = {
    petId: String(petId),
    petName: petDoc.name || snapshot.n,
    snapshot,
    openid: auth.openid,
    _openid: auth.openid,
    userId: auth.user._id,
    auditStatus: petDoc.auditStatus || 'approved',
    userDeleted: false,
    status: 1,
    publishedAt: now(),
    updatedAt: now(),
  };

  const existing = await findCertByPetId(petId);
  if (existing && existing._id) {
    await petCertsPublic().doc(existing._id).update({
      data: {
        ...base,
        createdAt: existing.createdAt,
      },
    });
    const after = await petCertsPublic().doc(existing._id).get();
    await pets().doc(String(petId)).update({
      data: { certPublished: true, updatedAt: now() },
    }).catch(() => {});
    return ok({ cert: publicPetCert(after.data) });
  }

  const addRes = await petCertsPublic().add({
    data: {
      ...base,
      createdAt: now(),
    },
  });
  const created = await petCertsPublic().doc(addRes._id).get();
  await pets().doc(String(petId)).update({
    data: { certPublished: true, updatedAt: now() },
  }).catch(() => {});
  return ok({ cert: publicPetCert(created.data) });
}

async function remove(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const petId = payload && payload.petId;
  if (!petId) return fail(400, '缺少 petId');

  const doc = await findCertByPetId(petId);
  if (!doc) return fail(404, '宠证不存在');
  if (doc.openid !== auth.openid && doc._openid !== auth.openid) {
    return fail(403, '无权操作');
  }

  await petCertsPublic().doc(doc._id).update({
    data: {
      userDeleted: true,
      status: 0,
      updatedAt: now(),
    },
  });
  await pets().doc(String(petId)).update({
    data: { certPublished: false, updatedAt: now() },
  }).catch(() => {});

  return ok({ petId: String(petId) });
}

module.exports = {
  get,
  listMine,
  publish,
  remove,
};
