const { clubs, hostApplies, now } = require('./db');

/**
 * 从 host_applies 文档创建或更新 clubs，并回写 host_applies.clubId
 * @param {object} applyDoc host_applies 原始文档（含 _id）
 * @param {object} auth requireUser 结果
 * @param {{ makeOnline?: boolean, auditStatus?: string }} options
 * @returns {Promise<{ clubId: string, clubDoc: object }|null>}
 */
async function upsertClubFromHostApply(applyDoc, auth, options = {}) {
  if (!applyDoc || !applyDoc._id) return null;

  const makeOnline = !!options.makeOnline;
  const auditStatus = options.auditStatus || applyDoc.auditStatus || 'pending';
  const onlineStatus = makeOnline || auditStatus === 'approved' ? 'online' : 'pending';

  const clubPayload = {
    name: applyDoc.clubName || '',
    city: applyDoc.city || '',
    intro: applyDoc.intro || '',
    cover: applyDoc.cover || '',
    updatedAt: now(),
  };

  let clubId = applyDoc.clubId ? String(applyDoc.clubId) : '';
  let clubDoc = null;

  if (clubId) {
    try {
      const got = await clubs().doc(clubId).get();
      clubDoc = got.data;
    } catch (e) {
      clubDoc = null;
      clubId = '';
    }
  }

  if (clubDoc && clubDoc.status !== 0 && clubDoc.userDeleted !== true) {
    await clubs().doc(clubId).update({
      data: {
        ...clubPayload,
        cover: clubPayload.cover || clubDoc.cover,
        onlineStatus,
        sourceApplyId: String(applyDoc._id),
        memberCount: clubDoc.memberCount != null ? clubDoc.memberCount : 0,
        eventCount: clubDoc.eventCount != null ? clubDoc.eventCount : 0,
        openid: clubDoc.openid || auth.openid,
        _openid: clubDoc._openid || auth.openid,
        ownerId: clubDoc.ownerId || auth.user._id,
        ownerNickname: clubDoc.ownerNickname || auth.user.nickname || '主理人',
        createdAt: clubDoc.createdAt || now(),
      },
    });
    const after = await clubs().doc(clubId).get();
    clubDoc = after.data;
  } else {
    const addRes = await clubs().add({
      data: {
        ...clubPayload,
        openid: auth.openid,
        _openid: auth.openid,
        ownerId: auth.user._id,
        ownerNickname: auth.user.nickname || '主理人',
        memberCount: 0,
        eventCount: 0,
        onlineStatus,
        sourceApplyId: String(applyDoc._id),
        userDeleted: false,
        status: 1,
        createdAt: now(),
      },
    });
    clubId = addRes._id;
    const created = await clubs().doc(clubId).get();
    clubDoc = created.data;
  }

  const applyPatch = {
    clubId,
    updatedAt: now(),
  };
  if (makeOnline) {
    applyPatch.auditStatus = 'approved';
    applyPatch.approvedAt = applyDoc.approvedAt || now();
    applyPatch.rejectReason = '';
  }

  await hostApplies().doc(applyDoc._id).update({ data: applyPatch });

  return { clubId, clubDoc };
}

module.exports = {
  upsertClubFromHostApply,
};
