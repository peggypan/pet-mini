function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
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

function threadDedupeKey(thread) {
  if (!thread) return '';
  const openid = trim(thread.peerOpenid);
  if (openid) return `oid:${openid}`;
  const peerId = trim(thread.peerId);
  if (peerId && peerId.length > 20 && !peerId.startsWith('c_')) return `oid:${peerId}`;
  return peerId ? `id:${peerId}` : `tid:${thread.id || ''}`;
}

function threadSortTime(thread) {
  const u = thread && thread.updatedAt ? Date.parse(thread.updatedAt) : 0;
  if (u) return u;
  return thread && thread.lastTime === '刚刚' ? Date.now() : 0;
}

function pickRicherThread(a, b) {
  if (!a) return b;
  if (!b) return a;
  const ta = threadSortTime(a);
  const tb = threadSortTime(b);
  if (tb !== ta) return tb > ta ? b : a;
  return (b.unread || 0) > (a.unread || 0) ? b : a;
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
  };
}

function decorateChatThreadsForList(threads) {
  return dedupeChatThreads(threads).map(decorateChatThreadRow);
}

module.exports = {
  formatChatThreadTitle,
  dedupeChatThreads,
  decorateChatThreadRow,
  decorateChatThreadsForList,
};
