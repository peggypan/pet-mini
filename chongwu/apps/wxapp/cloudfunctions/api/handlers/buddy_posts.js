const { ok, fail } = require('../common/response');
const { buddyPosts, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const { pickBuddyPayload, validateBuddy, publicBuddy } = require('../common/buddy-fields');

function viewerOpenid(ctx) {
  return (ctx && ctx.OPENID) || '';
}

function sortByCreatedDesc(rows) {
  return (rows || []).slice().sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

async function listFeed(payload, wxContext) {
  const _ = getDb().command;
  const zone = payload && payload.zone;
  const limit = Math.min(100, Math.max(1, Number(payload && payload.limit) || 50));
  const skip = Math.max(0, Number(payload && payload.skip) || 0);

  const parts = [
    { auditStatus: 'approved' },
    { userDeleted: _.neq(true) },
    { status: _.neq(0) },
  ];
  if (zone && zone !== 'all') {
    parts.push({ zone });
  }

  let rows = [];
  try {
    let q = buddyPosts().where(_.and(parts));
    const res = await q.orderBy('createdAt', 'desc').skip(skip).limit(limit).get();
    rows = res.data || [];
  } catch (e) {
    const res = await buddyPosts().where(_.and(parts)).limit(limit).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  const openid = viewerOpenid(wxContext);
  return ok({
    list: rows.map((d) => publicBuddy(d, openid)),
    skip,
    limit,
  });
}

async function listMine(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const _ = getDb().command;
  const cond = _.or([{ _openid: auth.openid }, { openid: auth.openid }]);

  let rows = [];
  try {
    const res = await buddyPosts().where(cond).orderBy('createdAt', 'desc').limit(50).get();
    rows = res.data || [];
  } catch (e) {
    const res = await buddyPosts().where(cond).limit(50).get();
    rows = sortByCreatedDesc(res.data || []);
  }

  rows = rows.filter((d) => d.userDeleted !== true && d.status !== 0);
  return ok({ list: rows.map((d) => publicBuddy(d, auth.openid)) });
}

async function get(payload, wxContext) {
  const id = payload && payload.id;
  if (!id) return fail(400, '缺少 id');
  const openid = viewerOpenid(wxContext);

  try {
    const got = await buddyPosts().doc(id).get();
    const doc = got.data;
    if (!doc || doc.status === 0 || doc.userDeleted === true) {
      return fail(404, '搭子不存在');
    }
    if (doc.auditStatus !== 'approved' && doc.openid !== openid && doc._openid !== openid) {
      return fail(404, '搭子不存在');
    }
    return ok({ buddy: publicBuddy(doc, openid) });
  } catch (e) {
    return fail(404, '搭子不存在');
  }
}

async function save(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const body = pickBuddyPayload({
    ...payload,
    userName: (payload && payload.userName) || auth.user.nickname || '宠友',
  });
  const msg = validateBuddy(body);
  if (msg) return fail(400, msg);

  const base = {
    ...body,
    openid: auth.openid,
    _openid: auth.openid,
    userId: auth.user._id,
    userName: auth.user.nickname || body.userName || '宠友',
    auditStatus: 'approved',
    userDeleted: false,
    healingPetProfile: false,
    likes: 0,
    comments: 0,
    shares: 0,
    status: 1,
    updatedAt: now(),
  };

  const postId = payload && payload.id;
  if (postId) {
    try {
      const got = await buddyPosts().doc(postId).get();
      const prev = got.data;
      if (!prev || prev.status === 0) return fail(404, '搭子不存在');
      if (prev.openid !== auth.openid && prev._openid !== auth.openid) {
        return fail(403, '无权修改');
      }
      await buddyPosts()
        .doc(postId)
        .update({
          data: {
            ...base,
            likes: prev.likes || 0,
            comments: prev.comments || 0,
            shares: prev.shares || 0,
          },
        });
      const after = await buddyPosts().doc(postId).get();
      return ok({ buddy: publicBuddy(after.data, auth.openid) });
    } catch (e) {
      return fail(404, '搭子不存在');
    }
  }

  const addRes = await buddyPosts().add({
    data: {
      ...base,
      creditTags: body.creditTags.length ? body.creditTags : ['守约'],
      createdAt: now(),
    },
  });
  const created = await buddyPosts().doc(addRes._id).get();
  return ok({ buddy: publicBuddy(created.data, auth.openid) });
}

async function remove(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const id = payload && payload.id;
  if (!id) return fail(400, '缺少 id');

  try {
    const got = await buddyPosts().doc(id).get();
    const doc = got.data;
    if (!doc) return fail(404, '搭子不存在');
    if (doc.openid !== auth.openid && doc._openid !== auth.openid) {
      return fail(403, '无权删除');
    }
    await buddyPosts().doc(id).update({
      data: {
        userDeleted: true,
        updatedAt: now(),
      },
    });
    return ok({ id });
  } catch (e) {
    return fail(404, '搭子不存在');
  }
}

module.exports = {
  listFeed,
  listMine,
  get,
  save,
  remove,
};
