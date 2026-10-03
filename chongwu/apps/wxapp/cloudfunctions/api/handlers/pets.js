const { ok, fail } = require('../common/response');
const { pets, users, now, getDb } = require('../common/db');
const { pickPetPayload, validatePet, publicPet } = require('../common/pet-fields');
const { requireUser } = require('../common/auth-user');

function sortByUpdatedDesc(rows) {
  return (rows || []).slice().sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  });
}

async function listMine(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const _ = getDb().command;
  const cond = _.or([{ _openid: auth.openid }, { openid: auth.openid }]);

  let rows = [];
  try {
    const res = await pets().where(cond).orderBy('updatedAt', 'desc').limit(50).get();
    rows = res.data || [];
  } catch (e) {
    const res = await pets().where(cond).limit(50).get();
    rows = sortByUpdatedDesc(res.data || []);
  }

  rows = rows.filter((d) => d.status !== 0);
  return ok({
    list: rows.map(publicPet),
  });
}

async function get(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const id = payload && payload.id;
  if (!id) return fail(400, '缺少 id');

  try {
    const got = await pets().doc(id).get();
    const doc = got.data;
    if (!doc || doc.status === 0) return fail(404, '档案不存在');
    if (doc._openid !== auth.openid && doc.openid !== auth.openid) {
      return fail(403, '无权查看');
    }
    return ok({ pet: publicPet(doc) });
  } catch (e) {
    return fail(404, '档案不存在');
  }
}

async function save(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const petId = payload && payload.id;
  let source = payload || {};
  let prevDoc = null;

  if (petId) {
    try {
      const got = await pets().doc(petId).get();
      prevDoc = got.data;
      if (!prevDoc || prevDoc.status === 0) return fail(404, '档案不存在');
      if (prevDoc._openid !== auth.openid && prevDoc.openid !== auth.openid) {
        return fail(403, '无权修改');
      }
      source = { ...publicPet(prevDoc), ...payload, id: petId };
    } catch (e) {
      return fail(404, '档案不存在');
    }
  }

  const body = pickPetPayload(source);
  const msg = validatePet(body);
  if (msg) return fail(400, msg);

  const ownerPhone = auth.user.phoneMasked || auth.user.phone || '';
  const base = {
    ...body,
    openid: auth.openid,
    _openid: auth.openid,
    userId: auth.user._id,
    userNickname: auth.user.nickname || '宠友',
    ownerPhone,
    status: 1,
    updatedAt: now(),
  };

  if (petId && prevDoc) {
    base.auditStatus = prevDoc.auditStatus === 'hidden' ? 'hidden' : 'approved';
    base.rejectReason = prevDoc.auditStatus === 'rejected' ? (prevDoc.rejectReason || '') : '';
    base.certPublished = !!prevDoc.certPublished;
    if (prevDoc.createdAt) base.createdAt = prevDoc.createdAt;
    try {
      await pets().doc(petId).update({ data: base });
      const after = await pets().doc(petId).get();
      return ok({ pet: publicPet(after.data) });
    } catch (e) {
      return fail(404, '档案不存在');
    }
  }

  base.auditStatus = 'approved';
  base.rejectReason = '';
  base.certPublished = false;

  const addRes = await pets().add({
    data: {
      ...base,
      createdAt: now(),
      submittedAt: new Date().toISOString(),
    },
  });

  await users()
    .doc(auth.user._id)
    .update({
      data: {
        petCount: getDb().command.inc(1),
        updatedAt: now(),
      },
    })
    .catch(() => {});

  const created = await pets().doc(addRes._id).get();
  return ok({ pet: publicPet(created.data) });
}

module.exports = {
  listMine,
  get,
  save,
};
