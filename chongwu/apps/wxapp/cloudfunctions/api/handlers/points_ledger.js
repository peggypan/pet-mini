const { ok, fail } = require('../common/response');
const { pointsLedger, users, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const { publicLedgerEntry, pickCreditPayload } = require('../common/points-ledger-fields');

async function findByRef(openid, refId) {
  if (!refId) return null;
  const _ = getDb().command;
  const cond = _.and([
    { refId },
    _.or([{ _openid: openid }, { openid }]),
    { status: _.neq(0) },
  ]);
  const res = await pointsLedger().where(cond).limit(1).get();
  return (res.data && res.data[0]) || null;
}

/**
 * 云函数内部调用：为用户记一笔积分（refId 幂等）
 * @returns {{ duplicated?: boolean, entry?: object, balance?: number }}
 */
async function creditUserPoints(openid, userDoc, payload) {
  const body = pickCreditPayload(payload);
  const amount = Number(body.amount);
  if (!amount || Number.isNaN(amount)) {
    return { err: fail(400, '积分数量无效') };
  }

  if (body.refId) {
    const dup = await findByRef(openid, body.refId);
    if (dup) {
      const balance = userDoc.points != null ? userDoc.points : 0;
      return {
        duplicated: true,
        entry: publicLedgerEntry(dup),
        balance,
      };
    }
  }

  const entry = {
    openid,
    _openid: openid,
    userId: userDoc._id,
    userNickname: userDoc.nickname || '宠友',
    amount,
    reason: body.reason,
    type: body.type,
    refId: body.refId || '',
    refType: body.refType || '',
    status: 1,
    createdAt: now(),
  };

  const addRes = await pointsLedger().add({ data: entry });
  const _ = getDb().command;
  const nextBalance = Math.max(0, (Number(userDoc.points) || 0) + amount);
  await users().doc(userDoc._id).update({
    data: {
      points: nextBalance,
      updatedAt: now(),
    },
  });

  const created = await pointsLedger().doc(addRes._id).get();
  return {
    duplicated: false,
    entry: publicLedgerEntry(created.data),
    balance: nextBalance,
  };
}

async function listMine(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const limit = Math.min(100, Math.max(1, Number(payload && payload.limit) || 50));
  const _ = getDb().command;
  const cond = _.or([{ _openid: auth.openid }, { openid: auth.openid }]);

  let rows = [];
  try {
    const res = await pointsLedger()
      .where(_.and([cond, { status: _.neq(0) }]))
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await pointsLedger().where(cond).limit(limit).get();
    rows = (res.data || []).filter((d) => d.status !== 0);
  }

  return ok({ list: rows.map((d) => publicLedgerEntry(d)) });
}

async function getSummary(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const balance = auth.user.points != null ? Number(auth.user.points) : 0;
  const listRes = await listMine({ limit: 20 }, wxContext);
  if (listRes.code !== 0) return listRes;

  return ok({
    balance: Math.max(0, balance),
    list: (listRes.data && listRes.data.list) || [],
  });
}

async function credit(payload, wxContext) {
  return fail(403, '积分发放由系统/运营审核触发，客户端不可直接入账');
}

module.exports = {
  listMine,
  getSummary,
  credit,
  creditUserPoints,
};
