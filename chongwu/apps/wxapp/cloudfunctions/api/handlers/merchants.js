const { ok, fail } = require('../common/response');
const { merchants, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const { pickMerchantPayload, validateMerchant, publicMerchant } = require('../common/merchant-fields');

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
  const city = payload && payload.city;
  const type = payload && payload.type;
  const limit = Math.min(100, Math.max(1, Number(payload && payload.limit) || 50));
  const skip = Math.max(0, Number(payload && payload.skip) || 0);

  const parts = [
    { bizStatus: 1 },
    { userDeleted: _.neq(true) },
    { status: _.neq(0) },
  ];
  if (city) parts.push({ city });
  if (type) {
    parts.push(_.or([{ type }, { category: type }]));
  }

  let rows = [];
  try {
    const res = await merchants()
      .where(_.and(parts))
      .orderBy('updatedAt', 'desc')
      .skip(skip)
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await merchants().where(_.and(parts)).limit(limit + skip).get();
    rows = sortByCreatedDesc(res.data || []).slice(skip, skip + limit);
  }

  const openid = viewerOpenid(wxContext);
  return ok({
    list: rows.map((d) => publicMerchant(d, openid)),
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
    const res = await merchants()
      .where(_.and([cond, { userDeleted: _.neq(true) }, { status: _.neq(0) }]))
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await merchants().where(cond).limit(20).get();
    rows = sortByCreatedDesc(res.data || []).filter(
      (d) => d.userDeleted !== true && d.status !== 0,
    );
  }

  return ok({ list: rows.map((d) => publicMerchant(d, auth.openid)) });
}

async function get(payload, wxContext) {
  const id = payload && payload.id;
  if (!id) return fail(400, '缺少 id');
  const openid = viewerOpenid(wxContext);

  try {
    const got = await merchants().doc(id).get();
    const doc = got.data;
    if (!doc || doc.status === 0 || doc.userDeleted === true) {
      return fail(404, '门店不存在');
    }
    if (doc.bizStatus !== 1 && doc.openid !== openid && doc._openid !== openid) {
      return fail(404, '门店不存在');
    }
    return ok({ merchant: publicMerchant(doc, openid) });
  } catch (e) {
    return fail(404, '门店不存在');
  }
}

async function save(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const body = pickMerchantPayload(payload);
  const merchantId = payload && payload.id;
  const msg = validateMerchant(body, !merchantId);
  if (msg) return fail(400, msg);

  const base = {
    ...body,
    openid: auth.openid,
    _openid: auth.openid,
    userId: auth.user._id,
    userName: auth.user.nickname || body.contactName || '商家',
    userDeleted: false,
    status: 1,
    updatedAt: now(),
  };

  if (merchantId) {
    try {
      const got = await merchants().doc(merchantId).get();
      const prev = got.data;
      if (!prev || prev.status === 0) return fail(404, '门店不存在');
      if (prev.openid !== auth.openid && prev._openid !== auth.openid) {
        return fail(403, '无权修改');
      }
      const nextBiz = prev.bizStatus === 2 ? 0 : prev.bizStatus;
      await merchants().doc(merchantId).update({
        data: {
          ...base,
          bizStatus: nextBiz,
          rejectReason: prev.bizStatus === 2 ? '' : prev.rejectReason || '',
          createdAt: prev.createdAt,
          rating: body.rating != null ? body.rating : prev.rating,
        },
      });
      const after = await merchants().doc(merchantId).get();
      return ok({ merchant: publicMerchant(after.data, auth.openid) });
    } catch (e) {
      return fail(404, '门店不存在');
    }
  }

  const addRes = await merchants().add({
    data: {
      ...base,
      bizStatus: 0,
      rejectReason: '',
      rating: body.rating != null ? body.rating : 5,
      createdAt: now(),
    },
  });
  const created = await merchants().doc(addRes._id).get();
  return ok({ merchant: publicMerchant(created.data, auth.openid) });
}

async function remove(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const id = payload && payload.id;
  if (!id) return fail(400, '缺少 id');

  try {
    const got = await merchants().doc(id).get();
    const doc = got.data;
    if (!doc) return fail(404, '门店不存在');
    if (doc.openid !== auth.openid && doc._openid !== auth.openid) {
      return fail(403, '无权删除');
    }
    await merchants().doc(id).update({
      data: {
        userDeleted: true,
        status: 0,
        updatedAt: now(),
      },
    });
    return ok({ id });
  } catch (e) {
    return fail(404, '门店不存在');
  }
}

module.exports = {
  listFeed,
  listMine,
  get,
  save,
  remove,
};
