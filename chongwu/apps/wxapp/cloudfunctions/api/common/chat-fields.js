const { formatPublishTime } = require('./relative-time');

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function messagePreview(message) {
  const type = (message && message.type) || 'text';
  if (type === 'image') return '[图片]';
  if (type === 'video') return '[视频]';
  if (type === 'voice') return message.content || '[语音]';
  if (type === 'location') {
    return `[位置] ${(message.location && message.location.name) || '位置分享'}`;
  }
  if (type === 'aa') return `[AA收款] ¥${message.aaAmount || message.content || ''}`;
  if (type === 'event') return `[活动] ${message.eventTitle || message.content || ''}`;
  if (type === 'call') {
    if (message.callStatus === 'missed') return '[未接视频通话]';
    if (message.duration) return `[视频通话] ${message.duration}s`;
    return '[视频通话]';
  }
  if (type === 'shareComment') {
    return `[分享] ${message.shareTitle || message.content || '评论'}`;
  }
  return (message && message.content) || '';
}

function pickEnsureThreadPayload(raw) {
  const p = raw || {};
  return {
    peerId: trim(p.peerId),
    peerOpenid: trim(p.peerOpenid),
    peerName: trim(p.peerName) || '宠友',
    petName: trim(p.petName) || '宠物',
    avatar: trim(p.avatar),
  };
}

function pickMessagePayload(raw) {
  const p = raw || {};
  const msg = p.message && typeof p.message === 'object' ? p.message : p;
  const sender = msg.from === 'peer' || msg.sender === 'peer' ? 'peer' : 'me';
  return {
    threadId: trim(p.threadId || msg.threadId),
    sender,
    type: trim(msg.type) || 'text',
    content: trim(msg.content),
    url: trim(msg.url),
    poster: trim(msg.poster),
    location: msg.location && typeof msg.location === 'object' ? msg.location : null,
    callStatus: trim(msg.callStatus),
    duration: Number(msg.duration) || 0,
    eventId: trim(msg.eventId),
    eventTitle: trim(msg.eventTitle),
    aaAmount: Number(msg.aaAmount) || 0,
    aaPeople: Number(msg.aaPeople) || 0,
    aaPer: Number(msg.aaPer) || 0,
    shareTitle: trim(msg.shareTitle),
    shareRef: trim(msg.shareRef),
  };
}

function formatChatThreadTitle(peerName, petName) {
  const name = trim(peerName) || '宠友';
  const pet = trim(petName);
  if (!pet || pet === '宠物') return name;
  if (name === pet) return name;
  const suffix = `· ${pet}`;
  if (name.endsWith(suffix) || name.includes(suffix)) return name;
  return `${name} · ${pet}`;
}

function normalizePeerOpenid(raw) {
  const s = trim(raw);
  if (!s) return '';
  if (s.startsWith('oid:')) return s.slice(4);
  if (s.startsWith('c_') && s.length > 22) return s.slice(2);
  return s;
}

function threadDedupeKey(thread) {
  if (!thread) return '';
  let oid = normalizePeerOpenid(thread.peerOpenid);
  const peerId = trim(thread.peerId);
  if (!oid && peerId && peerId.length >= 26) oid = peerId;
  if (oid) return `oid:${oid}`;
  const title = formatChatThreadTitle(thread.peerName, thread.petName);
  if (title && title.length >= 5 && title !== '宠友 · 宠物') return `name:${title}`;
  return peerId ? `id:${peerId}` : `tid:${thread.id || ''}`;
}

function threadSortTime(thread) {
  const keys = ['updatedAt', 'createdAt'];
  for (let i = 0; i < keys.length; i += 1) {
    const t = Date.parse(thread[keys[i]]);
    if (!Number.isNaN(t) && t > 0) return t;
  }
  return 0;
}

function pickRicherThread(a, b) {
  if (!a) return b;
  if (!b) return a;
  const ta = threadSortTime(a);
  const tb = threadSortTime(b);
  if (tb !== ta) return tb > ta ? b : a;
  return (b.unread || 0) > (a.unread || 0) ? b : a;
}

function dedupePublicThreads(rows) {
  const map = new Map();
  (rows || []).forEach((doc) => {
    const row = publicThread(doc);
    if (!row) return;
    const key = threadDedupeKey(row);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, row);
      return;
    }
    const winner = pickRicherThread(prev, row);
    const loser = winner === prev ? row : prev;
    map.set(key, {
      ...winner,
      unread: (prev.unread || 0) + (row.unread || 0),
      peerOpenid: normalizePeerOpenid(winner.peerOpenid)
        || normalizePeerOpenid(loser.peerOpenid)
        || winner.peerOpenid,
      peerId: normalizePeerOpenid(winner.peerOpenid)
        || winner.peerId
        || normalizePeerOpenid(loser.peerOpenid)
        || loser.peerId,
    });
  });
  return [...map.values()].sort((a, b) => threadSortTime(b) - threadSortTime(a));
}

function publicThread(doc) {
  if (!doc || doc.status === 0) return null;
  return {
    id: doc._id,
    peerId: trim(doc.peerId),
    peerOpenid: trim(doc.peerOpenid),
    peerName: trim(doc.peerName) || '宠友',
    petName: trim(doc.petName) || '宠物',
    avatar: trim(doc.avatar),
    lastMessage: trim(doc.lastMessage),
    unread: Number(doc.unread) || 0,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
    lastTime: formatPublishTime(doc.updatedAt || doc.createdAt) || trim(doc.lastTime) || '',
  };
}

function publicMessage(doc) {
  if (!doc || doc.status === 0) return null;
  return {
    id: doc._id,
    from: doc.sender === 'peer' ? 'peer' : 'me',
    type: doc.type || 'text',
    content: doc.content || '',
    url: doc.url || '',
    poster: doc.poster || '',
    location: doc.location || null,
    callStatus: doc.callStatus || '',
    duration: doc.duration || 0,
    eventId: doc.eventId || '',
    eventTitle: doc.eventTitle || '',
    aaAmount: doc.aaAmount || 0,
    aaPeople: doc.aaPeople || 0,
    aaPer: doc.aaPer || 0,
    shareTitle: doc.shareTitle || '',
    shareRef: doc.shareRef || '',
    createdAt: doc.createdAt,
    time: formatPublishTime(doc.createdAt),
  };
}

module.exports = {
  messagePreview,
  pickEnsureThreadPayload,
  pickMessagePayload,
  publicThread,
  publicMessage,
  dedupePublicThreads,
};
