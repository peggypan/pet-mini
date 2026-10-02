const { ok, fail } = require('../common/response');
const { clubMembers, clubs, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const {
  snapshotFromClub,
  publicClubMember,
} = require('../common/club-member-fields');

async function findActiveMembership(clubId, openid) {
  const _ = getDb().command;
  const cond = _.and([
    { clubId: String(clubId) },
    _.or([{ _openid: openid }, { openid }]),
    { userDeleted: _.neq(true) },
    { status: _.neq(0) },
  ]);
  const res = await clubMembers().where(cond).limit(1).get();
  return (res.data && res.data[0]) || null;
}

async function getClubOnline(clubId) {
  try {
    const got = await clubs().doc(String(clubId)).get();
    const doc = got.data;
    if (!doc || doc.status === 0 || doc.userDeleted === true) return null;
    if (doc.onlineStatus !== 'online') return null;
    return doc;
  } catch (e) {
    return null;
  }
}

async function listMine(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const _ = getDb().command;
  const cond = _.or([{ _openid: auth.openid }, { openid: auth.openid }]);

  let rows = [];
  try {
    const res = await clubMembers()
      .where(_.and([cond, { userDeleted: _.neq(true) }, { status: _.neq(0) }]))
      .orderBy('joinedAt', 'desc')
      .limit(50)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await clubMembers().where(cond).limit(50).get();
    rows = (res.data || []).filter((d) => d.userDeleted !== true && d.status !== 0);
  }

  return ok({ list: rows.map((d) => publicClubMember(d, auth.openid)) });
}

async function listByClub(payload, wxContext) {
  const clubId = payload && payload.clubId;
  if (!clubId) return fail(400, '缺少 clubId');
  const clubDoc = await getClubOnline(clubId);
  if (!clubDoc) return fail(404, '俱乐部不存在或未上线');

  const _ = getDb().command;
  const limit = Math.min(100, Math.max(1, Number(payload && payload.limit) || 50));
  let rows = [];
  try {
    const res = await clubMembers()
      .where(_.and([
        { clubId: String(clubId) },
        { userDeleted: _.neq(true) },
        { status: _.neq(0) },
      ]))
      .orderBy('joinedAt', 'desc')
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await clubMembers().where({ clubId: String(clubId) }).limit(limit).get();
    rows = (res.data || []).filter((d) => d.userDeleted !== true && d.status !== 0);
  }

  const openid = (wxContext && wxContext.OPENID) || '';
  return ok({ list: rows.map((d) => publicClubMember(d, openid)) });
}

async function join(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const clubId = payload && payload.clubId;
  if (!clubId) return fail(400, '缺少 clubId');

  const clubDoc = await getClubOnline(clubId);
  if (!clubDoc) return fail(404, '俱乐部不存在或未上线');

  const existed = await findActiveMembership(clubId, auth.openid);
  if (existed) {
    return ok({
      member: publicClubMember(existed, auth.openid),
      duplicated: true,
    });
  }

  const snap = snapshotFromClub(clubDoc, payload);
  const isOwner = clubDoc.openid === auth.openid || clubDoc._openid === auth.openid;
  const base = {
    ...snap,
    openid: auth.openid,
    _openid: auth.openid,
    userId: auth.user._id,
    userNickname: auth.user.nickname || '宠友',
    role: isOwner ? 'owner' : 'member',
    userDeleted: false,
    status: 1,
    joinedAt: now(),
    updatedAt: now(),
  };

  const addRes = await clubMembers().add({
    data: {
      ...base,
      createdAt: now(),
    },
  });

  if (!isOwner) {
    const _ = getDb().command;
    try {
      await clubs().doc(String(clubId)).update({
        data: {
          memberCount: _.inc(1),
          updatedAt: now(),
        },
      });
    } catch (e) {
      // ignore counter
    }
  }

  const created = await clubMembers().doc(addRes._id).get();
  return ok({
    member: publicClubMember(created.data, auth.openid),
    duplicated: false,
  });
}

async function leave(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const clubId = payload && payload.clubId;
  const memberId = payload && payload.id;
  if (!clubId && !memberId) return fail(400, '缺少 clubId');

  let doc = null;
  if (memberId) {
    try {
      const got = await clubMembers().doc(memberId).get();
      doc = got.data;
    } catch (e) {
      doc = null;
    }
  } else {
    doc = await findActiveMembership(clubId, auth.openid);
  }

  if (!doc || doc.status === 0) return fail(404, '未加入该俱乐部');
  if (doc.openid !== auth.openid && doc._openid !== auth.openid) {
    return fail(403, '无权操作');
  }
  if (doc.role === 'owner') {
    return fail(400, '主理人请通过俱乐部管理下线，不能直接退出');
  }

  await clubMembers().doc(doc._id).update({
    data: {
      userDeleted: true,
      status: 0,
      updatedAt: now(),
    },
  });

  const _ = getDb().command;
  try {
    await clubs().doc(String(doc.clubId)).update({
      data: {
        memberCount: _.inc(-1),
        updatedAt: now(),
      },
    });
  } catch (e) {
    // ignore
  }

  return ok({ clubId: doc.clubId, id: doc._id });
}

module.exports = {
  listMine,
  listByClub,
  join,
  leave,
};
