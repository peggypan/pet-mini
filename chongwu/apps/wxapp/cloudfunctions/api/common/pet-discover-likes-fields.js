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
};
