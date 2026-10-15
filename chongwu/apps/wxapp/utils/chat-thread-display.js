const { displayPublishTime } = require('./relative-time');

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function formatThreadLastTime(thread) {
  if (!thread) return '';
  const fromInstant = displayPublishTime(thread, ['updatedAt', 'createdAt', 'lastMessageAt']);
  if (fromInstant) return fromInstant;
  const raw = trim(thread.lastTime);
  if (raw && raw !== '刚刚') return raw;
  return '';
}

/** 列表/顶栏展示：避免 peerName 已含「· 宠物名」再拼一次 */
function formatChatThreadTitle(peerName, petName) {
  const name = trim(peerName) || '宠友';
  const pet = trim(petName);
  if (!pet || pet === '宠物') return name;
  if (name === pet) return name;
  const suffix = `· ${pet}`;
  if (name.endsWith(suffix) || name.includes(`${suffix}`)) return name;
  if (name.includes('·')) {
    const parts = name.split('·').map((p) => p.trim()).filter(Boolean);
    if (parts.some((p) => p === pet)) return name;
  }
  return `${name} · ${pet}`;
}

function normalizePeerOpenid(raw) {
  const s = trim(raw);
  if (!s) return '';
  if (s.startsWith('oid:')) return s.slice(4);
  if (s.startsWith('c_') && s.length > 22) return s.slice(2);
  return s;
}

/** 会话去重键：优先 openid，避免同一宠友因帖子 id / openid 各建一条 */
function resolveThreadOpenid(thread) {
  if (!thread) return '';
  let oid = normalizePeerOpenid(thread.peerOpenid);
  const peerId = trim(thread.peerId);
  if (!oid && peerId) {
    if (peerId.length >= 26 && /^[a-zA-Z0-9_-]+$/.test(peerId)) {
      oid = peerId;
    } else {
      oid = normalizePeerOpenid(peerId);
    }
  }
  return oid;
}

function threadDisplayTitle(thread) {
  if (!thread) return '';
  return formatChatThreadTitle(thread.peerName, thread.petName);
}

function isStableChatTitle(title) {
  const t = trim(title);
  if (!t || t === '宠友' || t === '宠友 · 宠物' || t === '用户 · 宠物') return false;
  return t.length >= 5;
}

function threadDedupeKey(thread) {
  if (!thread) return '';
  const oid = resolveThreadOpenid(thread);
  if (oid) return `oid:${oid}`;
  const title = threadDisplayTitle(thread);
  if (isStableChatTitle(title)) return `name:${title}`;
  const peerId = trim(thread.peerId);
  return peerId ? `id:${peerId}` : `tid:${thread.id || ''}`;
}

function threadsSamePeer(a, b) {
  if (!a || !b) return false;
  const ka = threadDedupeKey(a);
  const kb = threadDedupeKey(b);
  if (ka && kb && ka === kb && !ka.startsWith('tid:')) return true;
  const ta = threadDisplayTitle(a);
  const tb = threadDisplayTitle(b);
  if (isStableChatTitle(ta) && ta === tb) return true;
  const oa = resolveThreadOpenid(a);
  const ob = resolveThreadOpenid(b);
  if (oa && ob && oa === ob) return true;
  return false;
}

function threadSortTime(thread) {
  if (!thread) return 0;
  const keys = ['updatedAt', 'createdAt', 'lastMessageAt'];
  for (let i = 0; i < keys.length; i += 1) {
    const t = Date.parse(thread[keys[i]]);
    if (!Number.isNaN(t) && t > 0) return t;
  }
  return 0;
}

function isCloudThreadId(id) {
  const s = String(id || '');
  return s.length >= 20 && !s.startsWith('c_');
}

function pickRicherThread(a, b) {
  if (!a) return b;
  if (!b) return a;
  const cloudA = isCloudThreadId(a.id);
  const cloudB = isCloudThreadId(b.id);
  if (cloudA !== cloudB) return cloudB ? b : a;
  const ta = threadSortTime(a);
  const tb = threadSortTime(b);
  if (tb !== ta) return tb > ta ? b : a;
  if ((b.unread || 0) !== (a.unread || 0)) {
    return (b.unread || 0) > (a.unread || 0) ? b : a;
  }
  return cloudB ? b : a;
}

function dedupeChatThreads(threads) {
  const map = new Map();
  (threads || []).forEach((raw) => {
    if (!raw) return;
    const key = threadDedupeKey(raw);
    if (!key) return;
    const row = decorateChatThreadRow(raw);
    const prev = map.get(key);
    map.set(key, prev ? pickRicherThread(prev, row) : row);
  });
  return [...map.values()].sort((a, b) => threadSortTime(b) - threadSortTime(a));
}

function decorateChatThreadRow(thread) {
  const title = formatChatThreadTitle(thread.peerName, thread.petName);
  return {
    ...thread,
    displayTitle: title,
    lastTime: formatThreadLastTime(thread),
    dedupeKey: threadDedupeKey(thread),
  };
}

function decorateChatThreadsForList(threads) {
  return dedupeChatThreads(threads).map(decorateChatThreadRow);
}

module.exports = {
  formatChatThreadTitle,
  formatThreadLastTime,
  normalizePeerOpenid,
  resolveThreadOpenid,
  threadDedupeKey,
  threadsSamePeer,
  dedupeChatThreads,
  decorateChatThreadRow,
  decorateChatThreadsForList,
  pickRicherThread,
};
