const { findBuddy, listAllBuddies } = require('./catalog');
const store = require('./store');

function trim(s) {
  return (s || '').trim();
}

function likedAtMs(item) {
  const t = item && item.likedAt;
  if (!t) return 0;
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function snapshotFingerprint(item) {
  const petName = trim(item && item.petName);
  const userName = trim(item && item.userName);
  const breed = trim(item && item.breed);
  if (!petName) return '';
  return `${petName}|${userName}|${breed}`.toLowerCase();
}

function matchBuddyIdFromSnapshot(item) {
  const petName = trim(item && item.petName);
  if (!petName) return '';

  const userName = trim(item && item.userName);
  const breed = trim(item && item.breed);
  const list = listAllBuddies();
  let matches = list.filter((b) => trim(b.petName) === petName);
  if (userName) {
    const byUser = matches.filter((b) => trim(b.userName) === userName);
    if (byUser.length) matches = byUser;
  }
  if (breed && matches.length > 1) {
    const byBreed = matches.filter((b) => trim(b.breed) === breed);
    if (byBreed.length) matches = byBreed;
  }
  if (!matches.length) return '';
  return String(matches[0].id);
}

/**
 * 解析跳转用 id：优先本地帖 id，其次广场快照匹配；仍保留原 targetId（详情页可走云端拉取）
 */
function resolveLikedBuddyId(item) {
  const rawId = trim(item && (item.id != null ? item.id : item.targetId));
  if (rawId) {
    const hit = findBuddy(rawId);
    if (hit && hit.id) return String(hit.id);
  }
  const matched = matchBuddyIdFromSnapshot(item);
  if (matched) return matched;
  return rawId;
}

function enrichLikeItem(item, displayId) {
  const buddy = displayId ? findBuddy(displayId) : null;
  return {
    ...item,
    id: displayId || trim(item.id),
    userName: (buddy && buddy.userName) || item.userName || '宠友',
    petName: (buddy && buddy.petName) || item.petName || '',
    breed: (buddy && buddy.breed) || item.breed || '',
    avatar: (buddy && (buddy.cover || buddy.avatar)) || item.avatar || '',
    distance: item.distance || '',
    likedAt: item.likedAt || new Date().toISOString(),
  };
}

/**
 * 合并同一宠物（快照指纹 / 同一 canonical id），不丢弃「本地 feed 未加载但 id 仍有效」的记录
 */
function reconcilePetLikeItems(items) {
  const input = store.dedupePetLikeItems(items || []);
  const map = new Map();

  input.forEach((item) => {
    if (!item) return;
    const rawId = trim(item.id != null ? item.id : item.targetId);
    const matchedId = matchBuddyIdFromSnapshot(item);
    let displayId = rawId;
    if (rawId && findBuddy(rawId)) {
      displayId = String(findBuddy(rawId).id);
    } else if (matchedId) {
      displayId = matchedId;
    }
    if (!displayId && !snapshotFingerprint(item)) return;

    const fp = snapshotFingerprint(item);
    const mapKey = fp || `id:${displayId || rawId}`;
    const next = enrichLikeItem(item, displayId || rawId);

    const prev = map.get(mapKey);
    if (!prev) {
      map.set(mapKey, next);
      return;
    }

    const prevWorks = prev.id && findBuddy(prev.id);
    const nextWorks = next.id && findBuddy(next.id);
    if (nextWorks && !prevWorks) {
      map.set(mapKey, next);
      return;
    }
    if (prevWorks && !nextWorks) {
      return;
    }
    if (likedAtMs(next) >= likedAtMs(prev)) {
      map.set(mapKey, next);
    }
  });

  return Array.from(map.values()).sort((a, b) => likedAtMs(b) - likedAtMs(a));
}

/** 仅清理「已合并到另一条 canonical id」的旧 targetId，避免误删仍有效的喜欢记录 */
function collectSupersededLikeTargetIds(before, after) {
  const superseded = [];
  const afterByFp = new Map();
  (after || []).forEach((item) => {
    const fp = snapshotFingerprint(item);
    if (fp) afterByFp.set(fp, trim(item.id));
  });

  (before || []).forEach((item) => {
    const raw = trim(item && (item.id != null ? item.id : item.targetId));
    if (!raw) return;
    const fp = snapshotFingerprint(item);
    const canon = fp ? afterByFp.get(fp) : trim((after || []).find((a) => trim(a.id) === raw)?.id);
    if (canon && raw !== canon) {
      superseded.push(raw);
    }
  });

  return [...new Set(superseded)];
}

module.exports = {
  resolveLikedBuddyId,
  reconcilePetLikeItems,
  collectSupersededLikeTargetIds,
  snapshotFingerprint,
};
