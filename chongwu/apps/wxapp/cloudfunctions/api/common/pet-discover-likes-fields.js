function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function pickSwipePayload(raw) {
  const p = raw || {};
  const snap = p.snapshot && typeof p.snapshot === 'object' ? p.snapshot : p;
  return {
    targetId: trim(p.targetId || snap.id),
    targetType: trim(p.targetType) === 'healing' ? 'healing' : 'buddy',
    asLike: !!p.asLike,
    userName: trim(snap.userName),
    petName: trim(snap.petName),
    breed: trim(snap.breed),
    avatar: trim(snap.avatar || snap.cover),
    distance: trim(snap.distance),
  };
}

function likeDocKey(doc) {
  return trim(doc && doc.targetId);
}

function likedAtMs(doc) {
  const t = doc && doc.likedAt;
  if (!t) return 0;
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/** 同一 targetId 只保留最近一条喜欢记录 */
function dedupeLikeDocs(rows) {
  const map = new Map();
  (rows || []).forEach((doc) => {
    if (!doc || doc.status === 0) return;
    const key = likeDocKey(doc);
    if (!key) return;
    const prev = map.get(key);
    if (!prev || likedAtMs(doc) >= likedAtMs(prev)) {
      map.set(key, doc);
    }
  });
  return Array.from(map.values()).sort((a, b) => likedAtMs(b) - likedAtMs(a));
}

function publicLike(doc) {
  if (!doc || doc.status === 0) return null;
  return {
    id: trim(doc.targetId),
    targetId: trim(doc.targetId),
    targetType: doc.targetType || 'buddy',
    userName: trim(doc.userName) || '宠友',
    petName: trim(doc.petName),
    breed: trim(doc.breed),
    avatar: trim(doc.avatar),
    distance: trim(doc.distance),
    likedAt: doc.likedAt,
  };
}

module.exports = {
  pickSwipePayload,
  publicLike,
  dedupeLikeDocs,
  likeDocKey,
};
