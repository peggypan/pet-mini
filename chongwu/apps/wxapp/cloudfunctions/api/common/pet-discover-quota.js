const { petDiscoverDaily, now } = require('./db');

const DAILY_BASE = 20;
const SHARE_BONUS = 10;
const SHARE_MAX = 3;

function todayStr() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function dailyLimit(row) {
  return DAILY_BASE + (Number(row && row.bonus) || 0);
}

function quotaView(row, likedCount) {
  const used = Number(row.used) || 0;
  const bonus = Number(row.bonus) || 0;
  const shareCount = Number(row.shareCount) || 0;
  const limit = dailyLimit(row);
  return {
    date: row.date || todayStr(),
    used,
    limit,
    left: Math.max(0, limit - used),
    likedCount: likedCount != null ? likedCount : 0,
    base: DAILY_BASE,
    bonus,
    shareCount,
    shareMax: SHARE_MAX,
    shareLeft: Math.max(0, SHARE_MAX - shareCount),
  };
}

async function getOrCreateDaily(auth) {
  const date = todayStr();
  const res = await petDiscoverDaily()
    .where({ openid: auth.openid, date })
    .limit(1)
    .get();
  let doc = (res.data && res.data[0]) || null;
  if (doc) return doc;

  const ts = now();
  const addRes = await petDiscoverDaily().add({
    data: {
      openid: auth.openid,
      _openid: auth.openid,
      userId: auth.user._id,
      date,
      used: 0,
      bonus: 0,
      shareCount: 0,
      createdAt: ts,
      updatedAt: ts,
    },
  });
  const got = await petDiscoverDaily().doc(addRes._id).get();
  return got.data;
}

async function incrementShareBonus(auth) {
  const row = await getOrCreateDaily(auth);
  const shareCount = Number(row.shareCount) || 0;
  if (shareCount >= SHARE_MAX) {
    return { ok: false, capped: true, row, added: 0 };
  }
  const nextShare = shareCount + 1;
  const nextBonus = (Number(row.bonus) || 0) + SHARE_BONUS;
  await petDiscoverDaily().doc(row._id).update({
    data: {
      shareCount: nextShare,
      bonus: nextBonus,
      updatedAt: now(),
    },
  });
  const got = await petDiscoverDaily().doc(row._id).get();
  return { ok: true, added: SHARE_BONUS, row: got.data };
}

module.exports = {
  DAILY_BASE,
  SHARE_BONUS,
  SHARE_MAX,
  todayStr,
  dailyLimit,
  quotaView,
  getOrCreateDaily,
  incrementShareBonus,
};
