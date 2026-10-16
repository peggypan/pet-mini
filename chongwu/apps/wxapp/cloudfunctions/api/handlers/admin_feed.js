const { ok, fail } = require('../common/response');
const {
  getDb,
  now,
  users,
  pets,
  socialPosts,
  socialComments,
  buddyPosts,
  events,
  eventSignups,
  mapPoints,
  localPosts,
  hostApplies,
  merchantApplies,
  clubs,
  clubMembers,
  banners,
  splashAds,
  pointsLedger,
} = require('../common/db');
const { requireAdmin } = require('../common/auth-admin');
const { publicSocial } = require('../common/social-fields');
const { publicComment } = require('../common/comment-fields');
const { publicBuddy } = require('../common/buddy-fields');
const { publicEvent } = require('../common/event-fields');
const { publicSignup } = require('../common/signup-fields');
const { publicMap } = require('../common/map-fields');
const { publicLocal } = require('../common/local-fields');
const { publicHostApply } = require('../common/host-apply-fields');
const { publicMerchantApply } = require('../common/merchant-apply-fields');
const { publicClub } = require('../common/club-fields');
const { publicClubMember } = require('../common/club-member-fields');
const { publicBanner } = require('../common/banner-fields');
const { publicSplashAd } = require('../common/splash-ad-fields');
const { publicLedgerEntry } = require('../common/points-ledger-fields');
const { publicPet } = require('../common/pet-fields');
const { creditUserPoints } = require('./points_ledger');
const sensitiveWordsHandler = require('./sensitive_words');

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function sortByCreatedDesc(rows) {
  return (rows || []).slice().sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

function paging(payload) {
  const limit = Math.min(100, Math.max(1, Number(payload && payload.limit) || 50));
  const skip = Math.max(0, Number(payload && payload.skip) || 0);
  return { limit, skip };
}

function auditFilterParts(_, payload) {
  const auditStatus = trim(payload && payload.auditStatus);
  const parts = [{ status: _.neq(0) }];
  if (auditStatus && auditStatus !== 'all') {
    parts.push({ auditStatus });
  }
  return parts;
}

async function listUsers(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit, skip } = paging(payload);
  const _ = getDb().command;
  const keyword = trim(payload && payload.keyword).toLowerCase();

  let rows = [];
  try {
    const res = await users()
      .where({ status: _.neq(0) })
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await users().limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  if (keyword) {
    rows = rows.filter(
      (d) =>
        String(d.nickname || '').toLowerCase().includes(keyword)
        || String(d.phone || '').includes(keyword)
        || String(d.openid || '').includes(keyword),
    );
  }

  const list = rows.map((d) => ({
    id: d._id,
    openid: d.openid || d._openid || '',
    nickname: d.nickname || '宠友',
    phone: d.phone || '',
    city: d.city || '',
    deviceModel: d.deviceModel || '',
    ipRegion: d.ipRegion || '',
    petCount: d.petCount != null ? d.petCount : 0,
    points: d.points != null ? d.points : 0,
    status: d.status === 0 ? 0 : 1,
    lastLoginAt: d.lastLoginAt || '',
    createdAt: d.createdAt || '',
    avatarUrl: d.avatarUrl || '',
  }));
  return ok({ list, skip, limit });
}

async function listPets(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit, skip } = paging(payload);
  const _ = getDb().command;
  const parts = auditFilterParts(_, payload);
  parts.push({ userDeleted: _.neq(true) });

  let rows = [];
  try {
    const res = await pets()
      .where(_.and(parts))
      .orderBy('updatedAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await pets().where(_.and(parts)).limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  const list = rows.map((d) => {
    const p = publicPet(d);
    return {
      ...p,
      auditStatus: d.auditStatus || 'approved',
      rejectReason: d.rejectReason || '',
      userNickname: d.userName || d.ownerName || '',
      ownerPhone: d.ownerPhone || '',
    };
  });
  return ok({ list, skip, limit });
}

async function listSocialPosts(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit, skip } = paging(payload);
  const _ = getDb().command;
  const parts = auditFilterParts(_, payload);
  parts.push({ userDeleted: _.neq(true) });
  const lostType = trim(payload && payload.lostType);
  if (lostType) parts.push({ lostType });

  let rows = [];
  try {
    const res = await socialPosts()
      .where(_.and(parts))
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await socialPosts().where(_.and(parts)).limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  return ok({
    list: rows.map((d) => ({
      ...publicSocial(d, ''),
      status: d.auditStatus || 'approved',
      userDeleted: !!d.userDeleted,
    })),
    skip,
    limit,
  });
}

async function listBuddyPosts(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit, skip } = paging(payload);
  const _ = getDb().command;
  const parts = auditFilterParts(_, payload);
  parts.push({ userDeleted: _.neq(true) });

  let rows = [];
  try {
    const res = await buddyPosts()
      .where(_.and(parts))
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await buddyPosts().where(_.and(parts)).limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  return ok({
    list: rows.map((d) => ({
      ...publicBuddy(d, ''),
      status: d.auditStatus || 'approved',
      title: d.buddyType || d.title || '找搭子',
      userDeleted: !!d.userDeleted,
    })),
    skip,
    limit,
  });
}

async function listEvents(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit, skip } = paging(payload);
  const _ = getDb().command;
  const parts = auditFilterParts(_, payload);
  parts.push({ userDeleted: _.neq(true) });

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

  return ok({
    list: rows.map((d) => ({
      ...publicEvent(d, ''),
      status: d.auditStatus || 'approved',
    })),
    skip,
    limit,
  });
}

async function listEventSignups(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit, skip } = paging(payload);
  const _ = getDb().command;
  const eventId = trim(payload && payload.eventId);

  const parts = [{ status: _.neq(0) }];
  if (eventId) parts.push({ eventId });

  let rows = [];
  try {
    const res = await eventSignups()
      .where(_.and(parts))
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await eventSignups().where(_.and(parts)).limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  return ok({ list: rows.map((d) => publicSignup(d, '')), skip, limit });
}

async function listMapPoints(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit, skip } = paging(payload);
  const _ = getDb().command;
  const parts = auditFilterParts(_, payload);
  parts.push({ userDeleted: _.neq(true) });

  let rows = [];
  try {
    const res = await mapPoints()
      .where(_.and(parts))
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await mapPoints().where(_.and(parts)).limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  return ok({ list: rows.map((d) => publicMap(d, '')), skip, limit });
}

async function listLocalPosts(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit, skip } = paging(payload);
  const _ = getDb().command;
  const parts = auditFilterParts(_, payload);
  parts.push({ userDeleted: _.neq(true) });

  let rows = [];
  try {
    const res = await localPosts()
      .where(_.and(parts))
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await localPosts().where(_.and(parts)).limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  return ok({
    list: rows.map((d) => ({
      ...publicLocal(d, ''),
      status: d.auditStatus || 'approved',
    })),
    skip,
    limit,
  });
}

async function listHostApplies(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit, skip } = paging(payload);
  const _ = getDb().command;
  const parts = auditFilterParts(_, payload);
  parts.push({ userDeleted: _.neq(true) });

  let rows = [];
  try {
    const res = await hostApplies()
      .where(_.and(parts))
      .orderBy('updatedAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await hostApplies().where(_.and(parts)).limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  return ok({
    list: rows.map((d) => ({
      ...publicHostApply(d, ''),
      status: d.auditStatus || d.status || 'pending',
    })),
    skip,
    limit,
  });
}

async function listMerchantApplies(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit, skip } = paging(payload);
  const _ = getDb().command;
  const parts = auditFilterParts(_, payload);
  parts.push({ userDeleted: _.neq(true) });

  let rows = [];
  try {
    const res = await merchantApplies()
      .where(_.and(parts))
      .orderBy('updatedAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await merchantApplies().where(_.and(parts)).limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  return ok({
    list: rows.map((d) => ({
      ...publicMerchantApply(d, ''),
      status: d.auditStatus || 'pending',
    })),
    skip,
    limit,
  });
}

async function listPointsLedger(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit, skip } = paging(payload);
  const _ = getDb().command;

  let rows = [];
  try {
    const res = await pointsLedger()
      .where({ status: _.neq(0) })
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await pointsLedger().limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  return ok({ list: rows.map((d) => publicLedgerEntry(d)), skip, limit });
}

async function listBanners(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit } = paging(payload);
  let rows = [];
  try {
    const res = await banners().orderBy('sortOrder', 'asc').limit(limit).get();
    rows = res.data || [];
  } catch (e) {
    const res = await banners().limit(limit).get();
    rows = res.data || [];
  }
  return ok({ list: rows.map((d) => publicBanner(d)) });
}

async function listSplashAds(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit } = paging(payload);
  let rows = [];
  try {
    const res = await splashAds().orderBy('updatedAt', 'desc').limit(limit).get();
    rows = res.data || [];
  } catch (e) {
    const res = await splashAds().limit(limit).get();
    rows = res.data || [];
  }
  return ok({ list: rows.map((d) => publicSplashAd(d)) });
}

async function listSocialComments(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const postId = trim(payload && payload.postId);
  if (!postId) return fail(400, '缺少 postId');
  const { limit, skip } = paging(payload);
  const _ = getDb().command;
  const parts = [
    { postId },
    { status: _.neq(0) },
    { userDeleted: _.neq(true) },
  ];
  const auditStatus = trim(payload && payload.auditStatus);
  if (auditStatus && auditStatus !== 'all') parts.push({ auditStatus });

  let rows = [];
  try {
    const res = await socialComments()
      .where(_.and(parts))
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await socialComments().where(_.and(parts)).limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  return ok({
    list: rows.map((d) => ({
      ...publicComment(d, ''),
      status: d.auditStatus || 'approved',
    })),
    skip,
    limit,
  });
}

const MODERATE_COLLECTIONS = {
  social: socialPosts,
  buddy: buddyPosts,
  local: localPosts,
  event: events,
  comment: socialComments,
};

async function moderatePost(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const kind = trim(payload && payload.kind) || 'social';
  const id = trim(payload && payload.id);
  const decision = trim(payload && payload.decision);
  const rejectReason = trim(payload && payload.rejectReason);
  const essence = payload && payload.essence;

  if (!id) return fail(400, '缺少 id');
  if (!['approve', 'reject', 'hide'].includes(decision)) {
    return fail(400, 'decision 须为 approve / reject / hide');
  }

  const factory = MODERATE_COLLECTIONS[kind];
  if (!factory) return fail(400, '未知 kind');

  const col = factory();
  let doc;
  try {
    const got = await col.doc(id).get();
    doc = got.data;
  } catch (e) {
    return fail(404, '记录不存在');
  }
  if (!doc) return fail(404, '记录不存在');

  const auditStatus =
    decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'hidden';
  const patch = {
    auditStatus,
    rejectReason: decision === 'approve' ? '' : rejectReason || '未通过审核',
    updatedAt: now(),
  };
  if (kind === 'social' && typeof essence === 'boolean') {
    patch.essence = essence;
  }

  await col.doc(id).update({ data: patch });
  const after = await col.doc(id).get();
  return ok({ id, auditStatus, doc: after.data });
}

async function reviewMapPoint(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const id = trim(payload && payload.id);
  const decision = trim(payload && payload.decision);
  const rejectReason = trim(payload && payload.rejectReason);
  if (!id) return fail(400, '缺少 id');
  if (decision !== 'approve' && decision !== 'reject') {
    return fail(400, 'decision 须为 approve 或 reject');
  }

  let doc;
  try {
    const got = await mapPoints().doc(id).get();
    doc = got.data;
  } catch (e) {
    return fail(404, '点位不存在');
  }
  if (!doc || doc.userDeleted) return fail(404, '点位不存在');

  if (decision === 'reject') {
    await mapPoints().doc(id).update({
      data: {
        auditStatus: 'rejected',
        rejectReason: rejectReason || '未通过审核',
        updatedAt: now(),
      },
    });
    const after = await mapPoints().doc(id).get();
    return ok({ point: publicMap(after.data, '') });
  }

  await mapPoints().doc(id).update({
    data: {
      auditStatus: 'approved',
      rejectReason: '',
      updatedAt: now(),
    },
  });

  let creditResult = null;
  const openid = doc.openid || doc._openid;
  if (openid && !doc.pointsGranted) {
    const userRes = await users()
      .where({ openid })
      .limit(1)
      .get();
    const userDoc = userRes.data && userRes.data[0];
    if (userDoc) {
      const amount = Number(doc.pointsReward) || 5;
      creditResult = await creditUserPoints(openid, userDoc, {
        amount,
        reason: '友好地图标点审核通过',
        type: 'map_point',
        refId: `map_point_${id}`,
        refType: 'map_points',
      });
      await mapPoints().doc(id).update({
        data: { pointsGranted: true, updatedAt: now() },
      });
    }
  }

  const after = await mapPoints().doc(id).get();
  return ok({ point: publicMap(after.data, ''), credit: creditResult });
}

async function saveSensitiveWord(payload, wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  return sensitiveWordsHandler.upsertWord(payload);
}

module.exports = {
  listUsers,
  listPets,
  listSocialPosts,
  listSocialComments,
  listBuddyPosts,
  listEvents,
  listEventSignups,
  listMapPoints,
  listLocalPosts,
  listHostApplies,
  listMerchantApplies,
  listPointsLedger,
  listBanners,
  listSplashAds,
  moderatePost,
  reviewMapPoint,
  saveSensitiveWord,
};
