const cloud = require('wx-server-sdk');
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
  merchants,
  clubs,
  clubMembers,
  eventQualify,
  banners,
  splashAds,
  pointsLedger,
  appSettings,
} = require('../common/db');
const { requireAdmin } = require('../common/auth-admin');
const {
  pickSocialPayload,
  validateSocial,
  publicSocial,
} = require('../common/social-fields');
const { publicComment } = require('../common/comment-fields');
const {
  pickBuddyPayload,
  validateBuddy,
  publicBuddy,
} = require('../common/buddy-fields');
const {
  pickEventPayload,
  validateEvent,
  publicEvent,
} = require('../common/event-fields');
const { publicSignup } = require('../common/signup-fields');
const {
  pickMapPayload,
  validateMap,
  publicMap,
} = require('../common/map-fields');
const {
  pickLocalPayload,
  validateLocal,
  publicLocal,
} = require('../common/local-fields');
const { rejectIfSensitive } = require('../common/sensitive-words');
const { publicHostApply } = require('../common/host-apply-fields');
const { publicMerchantApply } = require('../common/merchant-apply-fields');
const { pickClubPayload, validateClub, publicClub } = require('../common/club-fields');
const { publicClubMember } = require('../common/club-member-fields');
const {
  pickMerchantPayload,
  validateMerchant,
  publicMerchant,
} = require('../common/merchant-fields');
const { publicQualify } = require('../common/qualify-fields');
const { publicBanner } = require('../common/banner-fields');
const {
  publicSplashAd,
  LINK_TYPES,
  SHOW_RULES,
  STATUSES,
} = require('../common/splash-ad-fields');
const { publicLedgerEntry } = require('../common/points-ledger-fields');
const { publicPet } = require('../common/pet-fields');
const { creditUserPoints } = require('./points_ledger');
const sensitiveWordsHandler = require('./sensitive_words');
const { loadCommunityConfigRaw } = require('../common/community-config');

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

const OFFICIAL_OPENID = 'official_admin';

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
      .where({ status: _.gte(0) })
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
  return ok({
    list: rows.map((d) => ({
      ...publicBanner(d),
      status: d.status === 0 ? 0 : 1,
      startAt: d.startAt,
      endAt: d.endAt,
      updatedAt: d.updatedAt,
    })),
  });
}

function adminBannerFromDoc(doc) {
  if (!doc) return null;
  return {
    ...publicBanner(doc),
    status: doc.status === 0 ? 0 : 1,
    startAt: doc.startAt,
    endAt: doc.endAt,
    updatedAt: doc.updatedAt,
  };
}

async function saveBanner(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const id = trim(payload && payload.id);
  const remove = !!(payload && (payload.remove || payload.delete));
  const ts = now();

  if (remove) {
    if (!id) return fail(400, '缺少 id');
    try {
      await banners().doc(id).remove();
      return ok({ id, removed: true });
    } catch (e) {
      return fail(404, 'Banner 不存在');
    }
  }

  const title = trim(payload && payload.title);
  const cover = trim(payload && payload.cover);
  const link = trim(payload && payload.link);
  if (!title) return fail(400, '缺少 title');
  if (!cover) return fail(400, '缺少 cover');
  if (!link) return fail(400, '缺少 link');

  const type = trim(payload && payload.type) || 'official';
  const sortOrder = Number(payload && payload.sortOrder);
  const statusRaw = payload && payload.status;
  const status =
    statusRaw === 0 || statusRaw === '0' || statusRaw === false ? 0 : 1;
  const subtitle = trim(payload && payload.subtitle);
  const tag = trim(payload && payload.tag);
  const city = trim(payload && payload.city);
  const startAt = payload && payload.startAt;
  const endAt = payload && payload.endAt;

  const data = {
    title,
    type,
    cover,
    link,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    status,
    updatedAt: ts,
  };
  if (subtitle) data.subtitle = subtitle;
  if (tag) data.tag = tag;
  data.city = city || '';
  if (startAt) data.startAt = startAt;
  if (endAt) data.endAt = endAt;

  if (id) {
    try {
      await banners()
        .doc(id)
        .update({ data });
      const got = await banners().doc(id).get();
      return ok({ banner: adminBannerFromDoc(got.data) });
    } catch (e) {
      return fail(404, 'Banner 不存在');
    }
  }

  const addRes = await banners().add({
    data: { ...data, createdAt: ts },
  });
  const got = await banners().doc(addRes._id).get();
  return ok({ banner: adminBannerFromDoc(got.data) });
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

async function saveSplashAd(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const id = trim(payload && payload.id);
  const remove = !!(payload && (payload.remove || payload.delete));
  const ts = now();

  if (remove) {
    if (!id) return fail(400, '缺少 id');
    try {
      await splashAds().doc(id).remove();
      return ok({ id, removed: true });
    } catch (e) {
      return fail(404, '开屏广告不存在');
    }
  }

  const name = trim(payload && payload.name);
  const imageUrl = trim(payload && payload.imageUrl);
  if (!name) return fail(400, '缺少 name');
  if (!imageUrl) return fail(400, '缺少 imageUrl');

  const linkTypeRaw = trim(payload && payload.linkType) || 'none';
  const linkType = LINK_TYPES.includes(linkTypeRaw) ? linkTypeRaw : 'none';
  const linkTarget = trim(payload && payload.linkTarget);
  const durationSec = Math.max(1, Number(payload && payload.durationSec) || 5);
  const skippable = payload && payload.skippable !== false;
  const skipAfterSec = Math.max(0, Number(payload && payload.skipAfterSec) || 0);
  const showRuleRaw = trim(payload && payload.showRule) || 'oncePerDay';
  const showRule = SHOW_RULES.includes(showRuleRaw) ? showRuleRaw : 'oncePerDay';
  const sortOrder = Number(payload && payload.sortOrder);
  const statusRaw = trim(payload && payload.status) || 'draft';
  const status = STATUSES.includes(statusRaw) ? statusRaw : 'draft';
  const startAt = payload && payload.startAt;
  const endAt = payload && payload.endAt;

  const data = {
    name,
    imageUrl,
    linkType,
    linkTarget,
    durationSec,
    skippable,
    skipAfterSec,
    showRule,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    status,
    updatedAt: ts,
  };
  if (startAt) data.startAt = startAt;
  if (endAt) data.endAt = endAt;

  if (id) {
    try {
      await splashAds()
        .doc(id)
        .update({ data });
      const got = await splashAds().doc(id).get();
      return ok({ ad: publicSplashAd(got.data) });
    } catch (e) {
      return fail(404, '开屏广告不存在');
    }
  }

  const addRes = await splashAds().add({
    data: { ...data, createdAt: ts },
  });
  const got = await splashAds().doc(addRes._id).get();
  return ok({ ad: publicSplashAd(got.data) });
}

async function checkInSignup(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const signupId = trim(payload && (payload.signupId || payload.id));
  const eventId = trim(payload && payload.eventId);
  const ticketCode = String((payload && payload.ticketCode) || '')
    .trim()
    .toUpperCase();

  let doc = null;
  if (signupId) {
    try {
      const got = await eventSignups().doc(signupId).get();
      doc = got.data;
    } catch (e) {
      doc = null;
    }
  } else if (eventId && ticketCode) {
    const res = await eventSignups()
      .where({ eventId: String(eventId), ticketCode })
      .limit(1)
      .get();
    doc = (res.data && res.data[0]) || null;
  } else {
    return fail(400, '请提供 signupId 或 eventId + ticketCode');
  }

  if (!doc || doc.userDeleted === true || doc.status === 0) {
    return fail(404, '未找到该报名');
  }

  if (doc.checkedIn) {
    return ok({
      signup: publicSignup(doc, ''),
      alreadyCheckedIn: true,
    });
  }

  await eventSignups().doc(doc._id).update({
    data: {
      checkedIn: true,
      checkedInAt: now(),
      updatedAt: now(),
    },
  });
  const got = await eventSignups().doc(doc._id).get();
  return ok({
    signup: publicSignup(got.data, ''),
    alreadyCheckedIn: false,
  });
}

async function getCommunityConfig(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const cfg = await loadCommunityConfigRaw();
  return ok({
    hotTopics: cfg.hotTopics,
    zones: cfg.zones,
    updatedAt: cfg.updatedAt,
  });
}

async function saveCommunityConfig(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const hotTopics = payload && payload.hotTopics;
  const zones = payload && payload.zones;
  if (!Array.isArray(hotTopics) || !Array.isArray(zones)) {
    return fail(400, 'hotTopics / zones 须为数组');
  }

  const ts = now();
  const data = {
    hotTopics,
    zones,
    updatedAt: ts,
  };

  try {
    await appSettings().doc('community').update({ data });
  } catch (e) {
    await appSettings().doc('community').set({ data: { ...data, createdAt: ts } });
  }
  return ok({ hotTopics, zones, updatedAt: ts });
}

async function setUserStatus(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const id = trim(payload && payload.id);
  const statusRaw = payload && payload.status;
  if (!id) return fail(400, '缺少 id');
  if (statusRaw !== 0 && statusRaw !== 1 && statusRaw !== '0' && statusRaw !== '1') {
    return fail(400, 'status 须为 0（禁用）或 1（正常）');
  }
  const status = statusRaw === 0 || statusRaw === '0' ? 0 : 1;

  try {
    await users().doc(id).update({
      data: { status, updatedAt: now() },
    });
    const got = await users().doc(id).get();
    const d = got.data;
    return ok({
      user: {
        id: d._id,
        openid: d.openid || d._openid || '',
        nickname: d.nickname || '宠友',
        status: d.status === 0 ? 0 : 1,
      },
    });
  } catch (e) {
    return fail(404, '用户不存在');
  }
}

async function listSocialComments(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const postId = trim(payload && payload.postId);
  const { limit, skip } = paging(payload);
  const _ = getDb().command;
  const parts = [{ status: _.neq(0) }, { userDeleted: _.neq(true) }];
  if (postId) parts.unshift({ postId });
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

async function updatePetAudit(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const id = trim(payload && payload.id);
  const auditStatus = trim(payload && payload.auditStatus);
  const rejectReason = trim(payload && payload.rejectReason);
  if (!id) return fail(400, '缺少 id');
  if (!['approved', 'rejected', 'hidden', 'pending'].includes(auditStatus)) {
    return fail(400, 'auditStatus 无效');
  }
  try {
    await pets().doc(id).update({
      data: {
        auditStatus,
        rejectReason: auditStatus === 'approved' ? '' : rejectReason || '未通过审核',
        updatedAt: now(),
      },
    });
    const got = await pets().doc(id).get();
    return ok({ pet: publicPet(got.data) });
  } catch (e) {
    return fail(404, '宠物档案不存在');
  }
}

async function listMerchants(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit, skip } = paging(payload);
  const _ = getDb().command;
  let rows = [];
  try {
    const res = await merchants()
      .where({ status: _.neq(0) })
      .orderBy('updatedAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await merchants().limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }
  return ok({
    list: rows.map((d) => {
      const m = publicMerchant(d, '');
      const biz = d.bizStatus != null ? d.bizStatus : 1;
      return { ...m, status: biz };
    }),
    skip,
    limit,
  });
}

async function listClubs(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit, skip } = paging(payload);
  let rows = [];
  try {
    const res = await clubs()
      .orderBy('updatedAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await clubs().limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }
  return ok({ list: rows.map((d) => publicClub(d, '')), skip, limit });
}

async function listClubMembers(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit, skip } = paging(payload);
  const clubId = trim(payload && payload.clubId);
  const _ = getDb().command;
  const parts = [{ status: _.neq(0) }];
  if (clubId) parts.push({ clubId });

  let rows = [];
  try {
    const res = await clubMembers()
      .where(_.and(parts))
      .orderBy('joinedAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await clubMembers().where(_.and(parts)).limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }
  return ok({ list: rows.map((d) => publicClubMember(d, '')), skip, limit });
}

async function listEventQualify(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const { limit, skip } = paging(payload);
  const _ = getDb().command;
  const verifyStatus = trim(payload && payload.verifyStatus);
  const parts = [{ userDeleted: _.neq(true) }, { status: _.neq(0) }];
  if (verifyStatus && verifyStatus !== 'all') parts.push({ verifyStatus });

  let rows = [];
  try {
    const res = await eventQualify()
      .where(_.and(parts))
      .orderBy('updatedAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await eventQualify().where(_.and(parts)).limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  return ok({
    list: rows.map((d) => ({
      ...publicQualify(d, ''),
      verifyStatus: d.verifyStatus || 'none',
      userName: d.userName || '',
    })),
    skip,
    limit,
  });
}

async function reviewEventQualify(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const id = trim(payload && payload.id);
  const decision = trim(payload && payload.decision);
  const rejectReason = trim(payload && payload.rejectReason);
  if (!id) return fail(400, '缺少 id');
  if (decision !== 'approve' && decision !== 'reject') {
    return fail(400, 'decision 须为 approve 或 reject');
  }
  const verifyStatus = decision === 'approve' ? 'approved' : 'rejected';
  try {
    await eventQualify().doc(id).update({
      data: {
        verifyStatus,
        rejectReason: decision === 'approve' ? '' : rejectReason || '未通过审核',
        updatedAt: now(),
        ...(decision === 'approve' ? { approvedAt: now() } : {}),
      },
    });
    const got = await eventQualify().doc(id).get();
    return ok({ qualify: publicQualify(got.data, '') });
  } catch (e) {
    return fail(404, '资质记录不存在');
  }
}

async function reviewMerchantApply(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const applyId = trim(payload && payload.applyId);
  const decision = trim(payload && payload.decision);
  const rejectReason = trim(payload && payload.rejectReason);
  if (!applyId) return fail(400, '缺少 applyId');
  if (decision !== 'approve' && decision !== 'reject') {
    return fail(400, 'decision 须为 approve 或 reject');
  }

  let doc;
  try {
    const got = await merchantApplies().doc(applyId).get();
    doc = got.data;
  } catch (e) {
    return fail(404, '申请不存在');
  }
  if (!doc || doc.userDeleted) return fail(404, '申请不存在');

  if (decision === 'reject') {
    await merchantApplies().doc(applyId).update({
      data: {
        auditStatus: 'rejected',
        rejectReason: rejectReason || '未通过审核',
        updatedAt: now(),
      },
    });
    const after = await merchantApplies().doc(applyId).get();
    return ok({ apply: publicMerchantApply(after.data, '') });
  }

  await merchantApplies().doc(applyId).update({
    data: {
      auditStatus: 'approved',
      rejectReason: '',
      updatedAt: now(),
      approvedAt: now(),
    },
  });

  let merchantId = doc.merchantId || '';
  if (!merchantId) {
    const addRes = await merchants().add({
      data: {
        name: doc.shopName || doc.companyName || '商家门店',
        city: doc.city || '',
        type: doc.type || '其他',
        category: doc.category || doc.type || '其他',
        rating: 5,
        cover: doc.shopFrontImage || doc.licenseImage || '',
        intro: doc.intro || '',
        address: doc.address || '',
        contactName: doc.contact || doc.legalPerson || '',
        contactPhone: doc.contactPhone || doc.phone || '',
        openid: doc.openid || doc._openid,
        _openid: doc.openid || doc._openid,
        userId: doc.userId,
        bizStatus: 1,
        status: 1,
        createdAt: now(),
        updatedAt: now(),
      },
    });
    merchantId = addRes._id;
    await merchantApplies().doc(applyId).update({
      data: { merchantId, updatedAt: now() },
    });
  }

  const after = await merchantApplies().doc(applyId).get();
  return ok({
    apply: publicMerchantApply(after.data, ''),
    merchantId,
  });
}

async function saveClubAdmin(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const id = trim(payload && payload.id);
  if (!id) return fail(400, '缺少俱乐部 id');

  const body = pickClubPayload(payload);
  const msg = validateClub(body, true);
  if (msg) return fail(400, msg);

  const ts = now();
  try {
    const got = await clubs().doc(id).get();
    const prev = got.data;
    if (!prev || prev.status === 0) return fail(404, '俱乐部不存在');
    await clubs().doc(id).update({
      data: {
        name: body.name,
        city: body.city,
        intro: body.intro,
        cover: body.cover || prev.cover,
        updatedAt: ts,
      },
    });
    const after = await clubs().doc(id).get();
    return ok({ club: publicClub(after.data, '') });
  } catch (e) {
    return fail(404, '俱乐部不存在');
  }
}

async function updateClubOnlineStatus(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const id = trim(payload && payload.id);
  const onlineStatus = trim(payload && payload.onlineStatus);
  if (!id) return fail(400, '缺少 id');
  if (!['online', 'offline', 'pending'].includes(onlineStatus)) {
    return fail(400, 'onlineStatus 无效');
  }
  try {
    await clubs().doc(id).update({
      data: { onlineStatus, updatedAt: now() },
    });
    const got = await clubs().doc(id).get();
    return ok({ club: publicClub(got.data, '') });
  } catch (e) {
    return fail(404, '俱乐部不存在');
  }
}

async function summaryCounts(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const _ = getDb().command;

  async function countWhere(col, parts) {
    try {
      const res = await col().where(_.and(parts)).count();
      return (res && res.total) || 0;
    } catch (e) {
      return 0;
    }
  }

  const base = [{ userDeleted: _.neq(true) }, { status: _.neq(0) }];
  const [
    usersTotal,
    petsPending,
    socialPending,
    commentsPending,
    buddyPending,
    hostPending,
    qualifyPending,
    mapPending,
    merchantApplyPending,
    localPending,
  ] = await Promise.all([
    countWhere(users, [{ status: _.neq(0) }]),
    countWhere(pets, [...base, { auditStatus: 'pending' }]),
    countWhere(socialPosts, [...base, { auditStatus: 'pending' }]),
    countWhere(socialComments, [...base, { auditStatus: 'pending' }]),
    countWhere(buddyPosts, [...base, { auditStatus: 'pending' }]),
    countWhere(hostApplies, [...base, { auditStatus: 'pending' }]),
    countWhere(eventQualify, [...base, { verifyStatus: 'pending' }]),
    countWhere(mapPoints, [...base, { auditStatus: 'pending' }]),
    countWhere(merchantApplies, [...base, { auditStatus: 'pending' }]),
    countWhere(localPosts, [...base, { auditStatus: 'pending' }]),
  ]);

  return ok({
    users: usersTotal,
    petsPending,
    socialPending,
    commentsPending,
    buddyPending,
    hostPending,
    qualifyPending,
    mapPending,
    merchantApplyPending,
    localPending,
    rescuePending: socialPending,
  });
}

async function uploadMedia(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  let raw = payload && (payload.base64 || payload.content);
  if (!raw || typeof raw !== 'string') return fail(400, '缺少 base64');
  const m = /^data:image\/(\w+);base64,(.+)$/i.exec(raw);
  let ext = trim(payload && payload.ext) || 'jpg';
  let b64 = raw;
  if (m) {
    ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
    b64 = m[2];
  } else if (raw.includes(',')) {
    b64 = raw.split(',').pop();
  }

  let buf;
  try {
    buf = Buffer.from(b64, 'base64');
  } catch (e) {
    return fail(400, 'base64 无效');
  }
  if (!buf.length) return fail(400, '文件为空');
  if (buf.length > 8 * 1024 * 1024) return fail(400, '图片不能超过 8MB');

  const folder = trim(payload && payload.folder) || 'admin';
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '').slice(0, 48) || 'admin';
  const cloudPath = `${safeFolder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  let fileID;
  try {
    const up = await cloud.uploadFile({ cloudPath, fileContent: buf });
    fileID = up.fileID;
  } catch (e) {
    return fail(500, (e && e.message) || '上传云存储失败');
  }

  let url = fileID;
  try {
    const urlRes = await cloud.getTempFileURL({ fileList: [fileID] });
    const item = urlRes.fileList && urlRes.fileList[0];
    if (item && item.tempFileURL) url = item.tempFileURL;
  } catch (e) {
    /* keep fileID */
  }

  return ok({ fileID, url, cloudPath });
}

async function createOfficialContent(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const kind = trim(payload && payload.kind) || 'social';
  const ts = now();

  if (kind === 'social') {
    const body = pickSocialPayload({
      ...payload,
      userName: trim(payload && payload.userName) || '宠头头官方',
    });
    const msg = validateSocial(body);
    if (msg) return fail(400, msg);
    const sens = await rejectIfSensitive(body.content || body.title);
    if (sens) return fail(400, sens);
    const addRes = await socialPosts().add({
      data: {
        ...body,
        openid: OFFICIAL_OPENID,
        _openid: OFFICIAL_OPENID,
        auditStatus: 'approved',
        source: 'official',
        userDeleted: false,
        likes: 0,
        comments: 0,
        shares: 0,
        status: 1,
        essence: !!payload.essence,
        createdAt: ts,
        updatedAt: ts,
      },
    });
    const got = await socialPosts().doc(addRes._id).get();
    return ok({ kind, id: addRes._id, post: publicSocial(got.data, '') });
  }

  if (kind === 'buddy') {
    const body = pickBuddyPayload({
      ...payload,
      userName: trim(payload && payload.userName) || '宠头头官方',
      title: trim(payload && payload.title) || trim(payload && payload.desc),
    });
    const msg = validateBuddy(body);
    if (msg) return fail(400, msg);
    const sens = await rejectIfSensitive(`${body.title}\n${body.desc}`);
    if (sens) return fail(400, sens);
    const addRes = await buddyPosts().add({
      data: {
        ...body,
        openid: OFFICIAL_OPENID,
        _openid: OFFICIAL_OPENID,
        auditStatus: 'approved',
        source: 'official',
        userDeleted: false,
        status: 1,
        createdAt: ts,
        updatedAt: ts,
      },
    });
    const got = await buddyPosts().doc(addRes._id).get();
    return ok({ kind, id: addRes._id, post: publicBuddy(got.data, '') });
  }

  if (kind === 'event') {
    const body = pickEventPayload({
      ...payload,
      host: trim(payload && payload.hostName) || trim(payload && payload.host) || '宠头头官方',
      publisherName: trim(payload && payload.hostName) || '宠头头官方',
      time: trim(payload && payload.startAt) || trim(payload && payload.time),
      role: trim(payload && payload.role) || 'personal',
    });
    const msg = validateEvent(body);
    if (msg) return fail(400, msg);
    const addRes = await events().add({
      data: {
        ...body,
        openid: OFFICIAL_OPENID,
        _openid: OFFICIAL_OPENID,
        auditStatus: 'approved',
        source: 'official',
        userDeleted: false,
        status: 'published',
        signupCount: 0,
        interestCount: 0,
        createdAt: ts,
        updatedAt: ts,
      },
    });
    const got = await events().doc(addRes._id).get();
    return ok({ kind, id: addRes._id, event: publicEvent(got.data, '') });
  }

  if (kind === 'local') {
    const body = pickLocalPayload({
      ...payload,
      userName: trim(payload && payload.userName) || '宠头头官方',
      desc: trim(payload && payload.preview) || trim(payload && payload.desc),
    });
    const msg = validateLocal(body);
    if (msg) return fail(400, msg);
    const sens = await rejectIfSensitive(`${body.title}\n${body.desc}`);
    if (sens) return fail(400, sens);
    const addRes = await localPosts().add({
      data: {
        ...body,
        openid: OFFICIAL_OPENID,
        _openid: OFFICIAL_OPENID,
        auditStatus: 'approved',
        source: 'official',
        userDeleted: false,
        status: 1,
        createdAt: ts,
        updatedAt: ts,
      },
    });
    const got = await localPosts().doc(addRes._id).get();
    return ok({ kind, id: addRes._id, post: publicLocal(got.data, '') });
  }

  return fail(400, 'kind 须为 social / buddy / event / local');
}

const MAP_POINTS_REWARD_DEFAULT = 5;

function validateMapAdmin(body) {
  if (!body.name) return '请填写点位名称';
  if (!body.address) return '请填写地址';
  if (!body.city) return '请填写城市';
  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '请填写纬度、经度';
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return '请填写有效坐标';
  if (body.type === '宠物毒点' && !trim(body.dangerDesc)) return '请填写毒点说明';
  return '';
}

async function createOfficialMapPoint(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const body = pickMapPayload({
    ...payload,
    type: trim(payload && payload.type) || trim(payload && payload.category) || '其他',
  });
  const msg = validateMapAdmin(body);
  if (msg) return fail(400, msg);

  const submitter = trim(payload && payload.submitter) || '宠头头官方';
  const pointsReward = Math.min(
    100,
    Math.max(0, Number(payload && payload.pointsReward) || MAP_POINTS_REWARD_DEFAULT),
  );
  const autoApprove = payload && payload.autoApprove !== false;
  const ts = now();

  const addRes = await mapPoints().add({
    data: {
      ...body,
      openid: OFFICIAL_OPENID,
      _openid: OFFICIAL_OPENID,
      userName: submitter,
      auditStatus: autoApprove ? 'approved' : 'pending',
      rejectReason: '',
      pointsReward,
      pointsGranted: false,
      userDeleted: false,
      status: 1,
      source: 'official',
      createdAt: ts,
      updatedAt: ts,
    },
  });

  if (autoApprove) {
    await mapPoints().doc(addRes._id).update({
      data: { pointsGranted: true, updatedAt: now() },
    });
  }

  const got = await mapPoints().doc(addRes._id).get();
  return ok({ point: publicMap(got.data, '') });
}

async function saveMerchantAdmin(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const id = trim(payload && payload.id);
  const body = pickMerchantPayload(payload);
  const msg = validateMerchant(body, !id);
  if (msg) return fail(400, msg);

  const ts = now();
  const bizStatusRaw = payload && payload.bizStatus;
  const bizStatus =
    bizStatusRaw === 0 || bizStatusRaw === 1 || bizStatusRaw === 2
      ? Number(bizStatusRaw)
      : undefined;

  if (id) {
    try {
      const got = await merchants().doc(id).get();
      const prev = got.data;
      if (!prev || prev.status === 0) return fail(404, '门店不存在');
      await merchants().doc(id).update({
        data: {
          ...body,
          ...(bizStatus != null ? { bizStatus } : {}),
          updatedAt: ts,
        },
      });
      const after = await merchants().doc(id).get();
      const m = publicMerchant(after.data, '');
      return ok({ merchant: m });
    } catch (e) {
      return fail(404, '门店不存在');
    }
  }

  const addRes = await merchants().add({
    data: {
      ...body,
      openid: OFFICIAL_OPENID,
      _openid: OFFICIAL_OPENID,
      userName: trim(payload && payload.userName) || '宠头头官方',
      userDeleted: false,
      status: 1,
      bizStatus: bizStatus != null ? bizStatus : 1,
      rejectReason: '',
      createdAt: ts,
      updatedAt: ts,
    },
  });
  const created = await merchants().doc(addRes._id).get();
  return ok({ merchant: publicMerchant(created.data, '') });
}

async function setMerchantBizStatus(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const id = trim(payload && payload.id);
  const bizStatus = Number(payload && payload.bizStatus);
  if (!id) return fail(400, '缺少 id');
  if (![0, 1, 2].includes(bizStatus)) {
    return fail(400, 'bizStatus 须为 0（下架/待营业）、1（营业）、2（拒绝）');
  }

  try {
    await merchants().doc(id).update({
      data: {
        bizStatus,
        updatedAt: now(),
        ...(bizStatus === 2 ? { rejectReason: trim(payload.rejectReason) || '运营下架' } : {}),
      },
    });
    const got = await merchants().doc(id).get();
    const m = publicMerchant(got.data, '');
    return ok({ merchant: { ...m, status: bizStatus } });
  } catch (e) {
    return fail(404, '门店不存在');
  }
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
  saveBanner,
  saveSplashAd,
  checkInSignup,
  getCommunityConfig,
  saveCommunityConfig,
  setUserStatus,
  moderatePost,
  reviewMapPoint,
  saveSensitiveWord,
  updatePetAudit,
  listMerchants,
  listClubs,
  listClubMembers,
  listEventQualify,
  reviewEventQualify,
  reviewMerchantApply,
  saveClubAdmin,
  updateClubOnlineStatus,
  summaryCounts,
  uploadMedia,
  createOfficialContent,
  createOfficialMapPoint,
  saveMerchantAdmin,
  setMerchantBizStatus,
};
