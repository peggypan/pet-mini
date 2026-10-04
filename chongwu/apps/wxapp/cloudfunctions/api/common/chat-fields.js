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
    lastTime: trim(doc.lastTime) || '刚刚',
    unread: Number(doc.unread) || 0,
    updatedAt: doc.updatedAt,
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
    time: '刚刚',
    createdAt: doc.createdAt,
  };
}

module.exports = {
  messagePreview,
  pickEnsureThreadPayload,
  pickMessagePayload,
  publicThread,
  publicMessage,
};
