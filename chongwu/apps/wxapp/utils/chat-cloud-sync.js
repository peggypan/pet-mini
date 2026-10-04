const cloudApi = require('./cloud-api');
const store = require('./store');

function chatApi(module, action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi(module, action, payload);
}

const { needsCloudUpload } = require('./cloud-media');

function inferUploadExt(localPath, folder, mediaType, hintExt) {
  const hint = String(hintExt || '').trim().toLowerCase();
  if (hint && /^[a-z0-9]+$/.test(hint)) return hint;
  const m = String(localPath || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (m && m[1]) return m[1].toLowerCase();
  if (mediaType === 'voice') return 'mp3';
  if (mediaType === 'video') return 'mp4';
  if (folder === 'chat') return 'dat';
  return 'jpg';
}

function uploadOne(localPath, folder, mediaType, hintExt) {
  const ext = inferUploadExt(localPath, folder, mediaType, hintExt);
  const cloudPath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: localPath }).then((res) => res.fileID);
}

async function resolveMediaUrl(url, folder, mediaType, hintExt) {
  if (!url || !needsCloudUpload(url)) return url || '';
  return uploadOne(url, folder, mediaType, hintExt);
}

const { hasLoginToken, ensureCloudSession } = require('./cloud-session');
const {
  resolveCloudFileUrl,
  isCloudFileId,
  batchResolveCloudFileUrls,
} = require('./cloud-media');
const { decorateChatMessages } = require('./chat-time');
const { resolveVoicePlayUrl } = require('./chat-voice');

async function refreshChatThreadsFromCloud() {
  if (!cloudApi.cloudEnabled()) return store.listChatThreads();
  if (!hasLoginToken()) return store.listChatThreads();
  await ensureCloudSession();
  try {
    const data = await chatApi('chat_threads', 'listMine');
    const list = (data && data.list) || [];
    store.replaceChatThreadsFromCloud(list);
    return list;
  } catch (e) {
    console.warn('[chat-cloud-sync] listMine', e);
    return store.listChatThreads();
  }
}

async function ensureChatThreadOnCloud(thread) {
  if (!cloudApi.cloudEnabled()) {
    return store.ensureChatThread(thread);
  }
  if (!hasLoginToken()) {
    return store.ensureChatThread(thread);
  }
  await ensureCloudSession();
  try {
    const data = await chatApi('chat_threads', 'ensure', {
      peerId: thread.peerId,
      peerOpenid: thread.peerOpenid || '',
      peerName: thread.peerName,
      petName: thread.petName,
      avatar: thread.avatar,
    });
    const row = (data && data.thread) || null;
    if (row) {
      row.avatar = await resolveCloudFileUrl(row.avatar);
      store.upsertChatThreadFromCloud(row);
    }
    return row || store.ensureChatThread(thread);
  } catch (e) {
    console.warn('[chat-cloud-sync] ensure', e);
    return store.ensureChatThread(thread);
  }
}

function mergeChatMessages(current, incoming) {
  const map = new Map();
  (current || []).forEach((m) => {
    if (m && m.id != null) map.set(String(m.id), m);
  });
  (incoming || []).forEach((m) => {
    if (m && m.id != null) map.set(String(m.id), m);
  });
  return [...map.values()].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return String(a.id).localeCompare(String(b.id));
  });
}

function pickCloudFileId(m) {
  if (!m) return '';
  if (isCloudFileId(m.fileId)) return m.fileId;
  if (isCloudFileId(m.url)) return m.url;
  return '';
}

function mapCloudUrl(raw, fileId, urlMap) {
  const id = fileId || (isCloudFileId(raw) ? raw : '');
  if (id && urlMap[id]) return urlMap[id];
  if (id) return urlMap[id] || raw;
  return raw;
}

async function resolveMessageMediaList(list) {
  const items = list || [];
  const idSet = new Set();
  items.forEach((m) => {
    const fid = pickCloudFileId(m);
    if (fid) idSet.add(fid);
    if (m.poster && isCloudFileId(m.poster)) idSet.add(m.poster);
    if (m.posterFileId && isCloudFileId(m.posterFileId)) idSet.add(m.posterFileId);
  });
  let urlMap = {};
  try {
    urlMap = await batchResolveCloudFileUrls([...idSet]);
  } catch (e) {
    console.warn('[chat-cloud-sync] batch resolve', e);
  }
  return items.map((m) => {
    const type = m.type || 'text';
    const rawUrl = m.url || '';
    const fileId = pickCloudFileId(m);
    let url = mapCloudUrl(rawUrl, fileId, urlMap);
    if (!fileId && isCloudFileId(rawUrl) && !urlMap[rawUrl]) {
      url = rawUrl;
    }
    let poster = m.poster || '';
    const posterId = isCloudFileId(m.poster)
      ? m.poster
      : (isCloudFileId(m.posterFileId) ? m.posterFileId : '');
    if (posterId) poster = urlMap[posterId] || poster;
    const playUrl = type === 'voice' ? url : url;
    return {
      ...m,
      fileId: fileId || m.fileId || '',
      url,
      poster,
      playUrl,
    };
  });
}

const CHAT_PAGE_SIZE = 10;
const CHAT_LATEST_FETCH_LIMIT = 200;

/** 仅合并本机刚发出、云端尚未回显的消息，避免旧缓存污染首屏 */
function mergeOutboxOnly(remote, localAll) {
  const remoteList = remote || [];
  const ids = new Set(remoteList.map((m) => String(m && m.id)));
  const pending = (localAll || []).filter((m) => {
    if (!m || m.id == null || ids.has(String(m.id))) return false;
    return !!m._localPending || String(m.id).startsWith('local_');
  });
  if (!pending.length) return remoteList;
  return sortMessagesAsc(mergeChatMessages(remoteList, pending));
}

function sortMessagesAsc(list) {
  return [...(list || [])].sort((a, b) => {
    const ta = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return String((a && a.id) || '').localeCompare(String((b && b.id) || ''));
  });
}

function localLatestPage(threadId, limit = CHAT_PAGE_SIZE) {
  const all = store.getChatMessages(threadId) || [];
  return {
    list: all.slice(-limit),
    hasMore: all.length > limit,
  };
}

function localOlderPage(threadId, beforeCreatedAt, limit = CHAT_PAGE_SIZE) {
  const all = store.getChatMessages(threadId) || [];
  const beforeTs = beforeCreatedAt ? new Date(beforeCreatedAt).getTime() : NaN;
  let older = all;
  if (beforeCreatedAt && !Number.isNaN(beforeTs)) {
    older = all.filter((m) => {
      const ts = m.createdAt ? new Date(m.createdAt).getTime() : 0;
      return ts < beforeTs;
    });
  }
  const list = older.slice(-limit);
  const hasMore = older.length > limit;
  return { list, hasMore };
}

function pickLatestPage(pool, limit) {
  const sorted = sortMessagesAsc(pool);
  return {
    list: sorted.slice(-limit),
    hasMore: sorted.length > limit,
  };
}

function pickOlderPage(pool, beforeCreatedAt, limit) {
  const beforeTs = beforeCreatedAt ? new Date(beforeCreatedAt).getTime() : NaN;
  let older = sortMessagesAsc(pool);
  if (beforeCreatedAt && !Number.isNaN(beforeTs)) {
    older = older.filter((m) => {
      const ts = m.createdAt ? new Date(m.createdAt).getTime() : 0;
      return ts < beforeTs;
    });
  }
  return {
    list: older.slice(-limit),
    hasMore: older.length > limit,
  };
}

async function fetchChatMessagePage(threadId, options = {}) {
  const limit = Math.min(50, Math.max(1, Number(options.limit) || CHAT_PAGE_SIZE));
  if (!threadId) return { list: [], hasMore: false };
  const localAll = store.getChatMessages(threadId) || [];

  if (!cloudApi.cloudEnabled() || !hasLoginToken()) {
    if (options.since) {
      const sinceTs = new Date(options.since).getTime();
      const list = sortMessagesAsc(localAll).filter((m) => {
        const ts = m.createdAt ? new Date(m.createdAt).getTime() : 0;
        return ts > sinceTs;
      });
      return { list, hasMore: false };
    }
    if (options.beforeCreatedAt) {
      return pickOlderPage(localAll, options.beforeCreatedAt, limit);
    }
    return pickLatestPage(localAll, limit);
  }
  await ensureCloudSession();
  const payload = { threadId, pageSize: limit, pageMode: 'latest' };
  if (options.since) {
    payload.since = options.since;
    payload.limit = 50;
    delete payload.pageMode;
    delete payload.pageSize;
  } else if (options.beforeCreatedAt) {
    payload.beforeCreatedAt = options.beforeCreatedAt;
    payload.pageMode = 'before';
    payload.limit = limit;
  } else {
    payload.limit = CHAT_LATEST_FETCH_LIMIT;
  }
  try {
    const data = await chatApi('chat_messages', 'listByThread', payload);
    let remote = (data && data.list) || [];
    remote = await resolveMessageMediaList(remote);

    if (options.since) {
      const list = sortMessagesAsc(remote);
      return { list, hasMore: false };
    }
    if (options.beforeCreatedAt) {
      return {
        list: sortMessagesAsc(remote),
        hasMore: !!(data && data.hasMore),
      };
    }
    const sorted = sortMessagesAsc(remote);
    const total = typeof data.total === 'number' ? data.total : sorted.length;
    const list = mergeOutboxOnly(sorted.slice(-limit), localAll);
    const hasMore = total > limit || sorted.length > limit;
    console.warn('[chat] fetchLatest sorted=', sorted.length, 'total=', total, 'pick=', list.length, 'hasMore=', hasMore);
    return { list, hasMore };
  } catch (e) {
    console.warn('[chat-cloud-sync] listByThread', e);
    if (options.beforeCreatedAt) {
      return pickOlderPage(localAll, options.beforeCreatedAt, limit);
    }
    if (options.since) return { list: [], hasMore: false };
    return pickLatestPage(localAll, limit);
  }
}

async function loadLatestChatMessagesFromCloud(threadId, limit = CHAT_PAGE_SIZE) {
  const page = await fetchChatMessagePage(threadId, { limit });
  const list = sortMessagesAsc(page.list || []).slice(-limit);
  if (list.length) {
    store.setChatMessagesForThread(threadId, list);
  }
  const firstTs = list[0] && list[0].createdAt;
  const lastTs = list[list.length - 1] && list[list.length - 1].createdAt;
  console.warn('[chat] loadLatest', threadId, 'count=', list.length, 'hasMore=', !!page.hasMore, 'range=', firstTs, '->', lastTs);
  return { list, hasMore: !!page.hasMore };
}

async function loadOlderChatMessagesFromCloud(threadId, beforeCreatedAt, limit = CHAT_PAGE_SIZE) {
  const page = await fetchChatMessagePage(threadId, { limit, beforeCreatedAt });
  console.warn('[chat] loadOlder api', page.list && page.list.length, 'hasMore', page.hasMore);
  return page;
}

async function loadChatMessagesFromCloud(threadId, limit = CHAT_PAGE_SIZE) {
  const page = await loadLatestChatMessagesFromCloud(threadId, limit);
  return page.list || [];
}

/** @deprecated 会话页请用分页 + since 增量 */
async function syncChatMessagesForThread(threadId) {
  const page = await loadLatestChatMessagesFromCloud(threadId, CHAT_PAGE_SIZE);
  return page.list || [];
}

const CHAT_MESSAGE_POLL_MS = 2000;

function chatMessagesFingerprint(list) {
  return (list || []).map((m) => `${m && m.id}:${m && m.createdAt || ''}:${m && m.url || ''}`).join('|');
}
const CHAT_THREAD_POLL_MS = 4500;
const DEFAULT_PEER_AVATAR = '/assets/mock/real_avatar.jpg';

function decorateMessagesForPage(page, list) {
  const ctx = {
    myAvatar: page.data.myAvatar,
    peerAvatar: page.data.peerAvatar,
  };
  if (typeof page.decorateChatUiMessages === 'function') {
    return page.decorateChatUiMessages(list);
  }
  return decorateChatMessages(list, ctx);
}

async function applyChatMessagesToPage(page, threadId, options = {}) {
  if (!page || String(page.data.threadId) !== String(threadId)) return;
  const prev = page.data.messages || [];
  let next = prev;
  let hasMore = page.data.chatHasMore;
  let newCount = 0;

  if (!prev.length) {
    if (page._chatInitialLoaded) return;
    const pageData = await loadLatestChatMessagesFromCloud(threadId, CHAT_PAGE_SIZE);
    next = sortMessagesAsc(pageData.list || []);
    hasMore = !!pageData.hasMore;
    newCount = next.length;
  } else {
    const sortedPrev = sortMessagesAsc(prev);
    const last = sortedPrev[sortedPrev.length - 1];
    const since = last && last.createdAt ? last.createdAt : '';
    const { list: incoming } = since
      ? await fetchChatMessagePage(threadId, { since, limit: 50 })
      : { list: [] };
    if (incoming.length) {
      next = sortMessagesAsc(mergeChatMessages(sortedPrev, incoming));
      newCount = next.length - sortedPrev.length;
      store.setChatMessagesForThread(threadId, next);
    } else {
      next = sortedPrev;
    }
  }

  const decorated = decorateMessagesForPage(page, next);
  const changed = chatMessagesFingerprint(prev) !== chatMessagesFingerprint(decorated);
  if (!changed && !options.force && newCount === 0) return;

  const pinBottom = newCount > 0 || !!options.forceScroll;

  const patch = {
    messages: decorated,
    chatHasMore: hasMore,
  };

  if (typeof page.patchChatData === 'function') {
    page.patchChatData(patch, { pinBottom });
  } else if (pinBottom && typeof page.setMessagesAndScroll === 'function') {
    page.setMessagesAndScroll(decorated, false, { chatHasMore: hasMore });
  } else if (pinBottom) {
    page.setData({ ...patch });
    if (typeof page.scrollToLatest === 'function') page.scrollToLatest(false);
  } else {
    patch.scrollTop = page._lastScrollTop != null ? page._lastScrollTop : page.data.scrollTop;
    page.setData(patch);
  }
  if (typeof page.syncLimitState === 'function') page.syncLimitState(decorated);
  if (newCount > 0 || options.forceScroll) {
    markChatThreadReadOnCloud(threadId).catch(() => {});
  }
}

function startChatMessagePolling(page, threadId) {
  if (!page || !threadId) return null;
  stopChatMessagePolling(page);
  const tick = () => {
    applyChatMessagesToPage(page, threadId).catch(() => {});
  };
  tick();
  page._chatPollTimer = setInterval(tick, CHAT_MESSAGE_POLL_MS);
  return page._chatPollTimer;
}

function stopChatMessagePolling(page) {
  if (page && page._chatPollTimer) {
    clearInterval(page._chatPollTimer);
    page._chatPollTimer = null;
  }
}

function stopChatMessageWatch(page) {
  if (page && page._chatWatcher && typeof page._chatWatcher.close === 'function') {
    try {
      page._chatWatcher.close();
    } catch (e) {
      // ignore
    }
    page._chatWatcher = null;
  }
}

/** 会话内收消息：轮询云函数（chat_messages 客户端无读权限，不用 database.watch） */
function startChatRealtime(page, threadId) {
  if (!page || !threadId) return;
  stopChatRealtime(page);
  startChatMessagePolling(page, threadId);
}

function stopChatRealtime(page) {
  stopChatMessagePolling(page);
  stopChatMessageWatch(page);
}

async function resolvePeerAvatarUrl(avatar) {
  const raw = (avatar || '').trim();
  if (!raw) return DEFAULT_PEER_AVATAR;
  if (raw.startsWith('/assets/')) return raw;
  try {
    const resolved = await resolveCloudFileUrl(raw);
    return resolved || DEFAULT_PEER_AVATAR;
  } catch (e) {
    return DEFAULT_PEER_AVATAR;
  }
}

async function resolveMyAvatarUrl() {
  const userInfo = wx.getStorageSync('userInfo') || {};
  let raw = (userInfo.avatarUrl || '').trim();
  if (!raw || raw.includes('/assets/mock/')) {
    const store = require('./store');
    const pets = store.listPets();
    const pet = pets[0] || {};
    raw = (pet.avatarUrl || pet.avatar || '').trim();
  }
  if (!raw) return DEFAULT_PEER_AVATAR;
  if (raw.startsWith('/assets/')) return raw;
  try {
    return (await resolveCloudFileUrl(raw)) || DEFAULT_PEER_AVATAR;
  } catch (e) {
    return DEFAULT_PEER_AVATAR;
  }
}

async function lookupPeerAvatarRaw(peerId, fallbacks = []) {
  const candidates = [...fallbacks].filter(Boolean);
  if (peerId) {
    const store = require('./store');
    const { listAllBuddies } = require('./catalog');
    const buddies = [...store.listBuddyPosts(), ...listAllBuddies()];
    const buddy = buddies.find(
      (b) => String(b.id) === String(peerId)
        || String(b.openid || b._openid || '') === String(peerId),
    );
    if (buddy) candidates.unshift(buddy.avatar || buddy.cover);
  }
  return candidates.find((u) => !!String(u || '').trim()) || '';
}

async function markChatThreadReadOnCloud(threadId) {
  if (!threadId) return;
  if (!cloudApi.cloudEnabled()) {
    store.markThreadRead(threadId);
    return;
  }
  if (!hasLoginToken()) {
    store.markThreadRead(threadId);
    return;
  }
  await ensureCloudSession();
  try {
    const data = await chatApi('chat_threads', 'markRead', { threadId });
    if (data && data.thread) store.upsertChatThreadFromCloud(data.thread);
    else store.markThreadRead(threadId);
  } catch (e) {
    store.markThreadRead(threadId);
  }
}

async function prepareMessageForCloud(message) {
  const next = { ...message };
  if (next.type === 'image' || next.type === 'video' || next.type === 'voice') {
    if (!next.url) {
      throw new Error(next.type === 'voice' ? '语音文件无效，请重新录制' : '媒体文件无效');
    }
    const voiceExt = next.type === 'voice' ? (next.audioFormat || 'mp3') : '';
    const uploaded = await resolveMediaUrl(next.url, 'chat', next.type, voiceExt);
    if (!uploaded) {
      throw new Error(next.type === 'voice' ? '语音上传失败' : '文件上传失败');
    }
    next.url = uploaded;
    if (next.type === 'video') {
      next.poster = await resolveMediaUrl(next.poster || next.url, 'chat', 'image');
    }
  }
  return next;
}

async function sendChatMessageOnCloud(threadId, message) {
  if (!threadId) {
    wx.showToast({ title: '会话未就绪，请返回重进', icon: 'none' });
    return null;
  }
  if (!cloudApi.cloudEnabled()) {
    return store.addChatMessage(threadId, message);
  }
  if (!hasLoginToken()) {
    return store.addChatMessage(threadId, message);
  }
  await ensureCloudSession();
  const needsUpload = message
    && ['image', 'video', 'voice'].includes(message.type)
    && message.url
    && needsCloudUpload(message.url);
  if (needsUpload) {
    wx.showLoading({ title: message.type === 'voice' ? '语音上传中…' : '发送中…', mask: true });
  }
  try {
    const body = await prepareMessageForCloud(message);
    const data = await chatApi('chat_messages', 'send', {
      threadId,
      message: body,
    });
    let saved = null;
    if (data && data.message) {
      saved = (await resolveMessageMediaList([data.message]))[0] || data.message;
      if (saved.type === 'voice') {
        saved.playUrl = saved.playUrl || saved.url;
      }
      store.appendChatMessageFromCloud(threadId, saved);
    }
    if (data && data.thread) {
      const row = { ...data.thread };
      row.avatar = await resolvePeerAvatarUrl(row.avatar);
      store.upsertChatThreadFromCloud(row);
    }
    return saved;
  } catch (e) {
    console.warn('[chat-cloud-sync] send', e);
    wx.showToast({
      title: (e && e.message) || '消息发送失败，请检查网络或重新登录',
      icon: 'none',
    });
    return null;
  } finally {
    if (needsUpload) wx.hideLoading();
  }
}

module.exports = {
  refreshChatThreadsFromCloud,
  ensureChatThreadOnCloud,
  loadChatMessagesFromCloud,
  loadLatestChatMessagesFromCloud,
  loadOlderChatMessagesFromCloud,
  fetchChatMessagePage,
  syncChatMessagesForThread,
  mergeChatMessages,
  CHAT_PAGE_SIZE,
  startChatMessagePolling,
  stopChatMessagePolling,
  startChatRealtime,
  stopChatRealtime,
  resolvePeerAvatarUrl,
  resolveMyAvatarUrl,
  lookupPeerAvatarRaw,
  markChatThreadReadOnCloud,
  sendChatMessageOnCloud,
  DEFAULT_PEER_AVATAR,
  CHAT_MESSAGE_POLL_MS,
  CHAT_THREAD_POLL_MS,
};
