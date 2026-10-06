const { ok, fail } = require('../common/response');
const { hostApplies, clubs, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const {
  pickHostApplyPayload,
  validateHostApply,
  publicHostApply,
} = require('../common/host-apply-fields');
const { upsertClubFromHostApply } = require('../common/club-from-apply');
const { publicClub } = require('../common/club-fields');

async function findMyApply(openid) {
  const _ = getDb().command;
  const cond = _.and([
    _.or([{ _openid: openid }, { openid }]),
    { userDeleted: _.neq(true) },
    { status: _.neq(0) },
  ]);
  try {
    const res = await hostApplies().where(cond).orderBy('updatedAt', 'desc').limit(1).get();
    return (res.data && res.data[0]) || null;
  } catch (e) {
    const res = await hostApplies().where(cond).limit(1).get();
    return (res.data && res.data[0]) || null;
  }
}

async function reloadApply(applyId) {
  const got = await hostApplies().doc(applyId).get();
  return got.data;
}

async function finishApplyResponse(applyDoc, openid, extra = {}) {
  const pub = publicHostApply(applyDoc, openid);
  return ok({
    apply: pub,
    auditStatus: pub.auditStatus,
    clubId: pub.clubId || extra.clubId || '',
    club: extra.club || null,
  });
}

async function getMine(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  let doc = await findMyApply(auth.openid);
  if (!doc) {
    return ok({
      apply: null,
      auditStatus: 'none',
    });
  }

  if (!doc.clubId && doc.auditStatus === 'pending') {
    await upsertClubFromHostApply(doc, auth, { makeOnline: false });
    doc = await reloadApply(doc._id);
  }

  return finishApplyResponse(doc, auth.openid);
}

async function ensureClub(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const doc = await findMyApply(auth.openid);
  if (!doc) return fail(404, '暂无入驻申请');

  const synced = await upsertClubFromHostApply(doc, auth, {
    makeOnline: false,
    auditStatus: doc.auditStatus,
  });
  if (!synced) return fail(500, '同步俱乐部失败');

  const afterApply = await reloadApply(doc._id);
  const club = publicClub(synced.clubDoc, auth.openid);
  return finishApplyResponse(afterApply, auth.openid, { clubId: synced.clubId, club });
}

async function submit(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const body = pickHostApplyPayload(payload);
  const msg = validateHostApply(body);
  if (msg) return fail(400, msg);

  const existing = await findMyApply(auth.openid);
  if (existing && existing.auditStatus === 'approved') {
    return fail(400, '已成为主理人，无需重复提交');
  }

  let applyDoc = null;

  if (existing && existing.auditStatus === 'pending') {
    const merged = {
      clubName: body.clubName || existing.clubName,
      city: body.city || existing.city,
      intro: body.intro || existing.intro,
      contact: body.contact || existing.contact,
      cover: body.cover || existing.cover,
      entityType: body.entityType || existing.entityType || 'personal',
      realName: body.realName || existing.realName,
      idCard: body.idCard && !body.idCard.includes('*') ? body.idCard : existing.idCard,
      idFrontImage: body.idFrontImage || existing.idFrontImage,
      idBackImage: body.idBackImage || existing.idBackImage,
      companyName: body.companyName || existing.companyName,
      licenseNo: body.licenseNo || existing.licenseNo,
      legalPerson: body.legalPerson || existing.legalPerson,
      licenseImage: body.licenseImage || existing.licenseImage,
    };
    const pendingMsg = validateHostApply(merged);
    if (pendingMsg) return fail(400, pendingMsg);
    await hostApplies().doc(existing._id).update({
      data: {
        ...merged,
        auditStatus: 'pending',
        updatedAt: now(),
      },
    });
    applyDoc = await reloadApply(existing._id);
  } else {
    const base = {
      ...body,
      openid: auth.openid,
      _openid: auth.openid,
      userId: auth.user._id,
      userName: auth.user.nickname || '宠友',
      auditStatus: 'pending',
      rejectReason: '',
      clubId: existing && existing.clubId ? existing.clubId : '',
      submittedAt: now(),
      updatedAt: now(),
      userDeleted: false,
      status: 1,
    };

    if (existing && existing._id) {
      await hostApplies().doc(existing._id).update({ data: base });
      applyDoc = await reloadApply(existing._id);
    } else {
      const addRes = await hostApplies().add({
        data: {
          ...base,
          createdAt: now(),
        },
      });
      applyDoc = await reloadApply(addRes._id);
    }
  }

  try {
    await upsertClubFromHostApply(applyDoc, auth, { makeOnline: false });
    applyDoc = await reloadApply(applyDoc._id);
  } catch (e) {
    console.error('[host_applies.submit] club sync failed', e);
  }
  return finishApplyResponse(applyDoc, auth.openid);
}

async function remove(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const doc = await findMyApply(auth.openid);
  if (!doc) return fail(404, '暂无申请');
  if (doc.auditStatus !== 'pending') {
    return fail(400, '仅审核中的申请可撤回');
  }
  await hostApplies().doc(doc._id).update({
    data: {
      userDeleted: true,
      status: 0,
      updatedAt: now(),
    },
  });
  if (doc.clubId) {
    try {
      await clubs().doc(String(doc.clubId)).update({
        data: {
          userDeleted: true,
          onlineStatus: 'offline',
          status: 0,
          updatedAt: now(),
        },
      });
    } catch (e) {
      // ignore missing club
    }
  }
  return ok({ id: doc._id });
}

module.exports = {
  getMine,
  submit,
  remove,
  ensureClub,
};
