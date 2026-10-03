const cloudApi = require('./cloud-api');
const store = require('./store');

function chatApi(module, action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi(module, action, payload);
}

const { needsCloudUpload } = require('./cloud-media');

function inferUploadExt(localPath, folder, mediaType) {
  const m = String(localPath || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (m && m[1]) return m[1].toLowerCase();
  if (mediaType === 'voice') return 'mp3';
  if (mediaType === 'video') return 'mp4';
  if (folder === 'chat') return 'dat';
  return 'jpg';
}

function uploadOne(localPath, folder, mediaType) {
  const ext = inferUploadExt(localPath, folder, mediaType);
  const cloudPath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: localPath }).then((res) => res.fileID);
}

async function resolveMediaUrl(url, folder, mediaType) {
  if (!url || !needsCloudUpload(url)) return url || '';
  return uploadOne(url, folder, mediaType);
}

const { hasLoginToken, ensureCloudSession } = require('./cloud-session');
const { resolveCloudFileUrl } = require('./cloud-media');
const { decorateChatMessages } = require('./chat-time');

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

async function resolveMessageMediaList(list) {
  return Promise.all(
    (list || []).map(async (m) => {
      const type = m.type || 'text';
      const rawUrl = m.url || '';
      let url = rawUrl;
      let playUrl = rawUrl;
      if (rawUrl && String(rawUrl).startsWith('cloud://')) {
        const resolved = await resolveCloudFileUrl(rawUrl);
        if (type === 'voice') {
          playUrl = resolved || rawUrl;
          url = rawUrl;
        } else {
          url = resolved || rawUrl;
          playUrl = url;
        }
      }
      const poster = m.poster
        ? await resolveCloudFileUrl(m.poster)
        : '';
      return { ...m, url, poster, playUrl: playUrl || url };
    }),
  );
}

async function loadChatMessagesFromCloud(threadId) {
  if (!cloudApi.cloudEnabled()) {
    return store.getChatMessages(threadId);
  }
  if (!hasLoginToken()) return store.getChatMessages(threadId);
  await ensureCloudSession();
  try {
    const data = await chatApi('chat_messages', 'listByThread', { threadId });
    let list = (data && data.list) || [];
    list = await resolveMessageMediaList(list);
    store.setChatMessagesForThread(threadId, list);
    return list;
  } catch (e) {
    console.warn('[chat-cloud-sync] listByThread', e);
    return store.getChatMessages(threadId);
  }
}

/** 会话页同步最新消息（全量合并，避免 since 索引/时间精度丢消息） */
async function syncChatMessagesForThread(threadId) {
  if (!cloudApi.cloudEnabled() || !hasLoginToken()) {
    return store.getChatMessages(threadId);
  }
  await ensureCloudSession();
  try {
    const data = await chatApi('chat_messages', 'listByThread', { threadId, limit: 200 });
    let list = (data && data.list) || [];
    list = await resolveMessageMediaList(list);
    store.setChatMessagesForThread(threadId, list);
    return list;
  } catch (e) {
    console.warn('[chat-cloud-sync] syncThread', e);
    return store.getChatMessages(threadId);
  }
}

const CHAT_MESSAGE_POLL_MS = 2500;
const CHAT_THREAD_POLL_MS = 4500;
const DEFAULT_PEER_AVATAR = '/assets/mock/real_avatar.jpg';

async function applyChatMessagesToPage(page, threadId, options = {}) {
  if (!page || String(page.data.threadId) !== String(threadId)) return;
  const prev = page.data.messages || [];
  const list = decorateChatMessages(await syncChatMessagesForThread(threadId));
  const prevLastId = prev.length ? String(prev[prev.length - 1].id) : '';
  const nextLastId = list.length ? String(list[list.length - 1].id) : '';
  const changed = prev.length !== list.length || prevLastId !== nextLastId;
  if (!changed && !options.force) return;
  page.setData({ messages: list });
  if (typeof page.syncLimitState === 'function') page.syncLimitState(list);
  if (list.length > prev.length || options.forceScroll) {
    if (typeof page.scrollBottom === 'function') page.scrollBottom(list.length - 1);
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

/** 优先 database.watch，失败则轮询 */
function startChatRealtime(page, threadId) {
  if (!page || !threadId) return;
  stopChatRealtime(page);

  const onListChange = () => {
    applyChatMessagesToPage(page, threadId).catch(() => {});
  };

  let watchStarted = false;
  if (cloudApi.cloudEnabled() && hasLoginToken() && wx.cloud && wx.cloud.database) {
    try {
      const db = wx.cloud.database();
      page._chatWatcher = db.collection('chat_messages').where({ threadId }).watch({
        onChange: onListChange,
        onError: (err) => {
          console.warn('[chat-cloud-sync] watch', err);
          stopChatMessageWatch(page);
          startChatMessagePolling(page, threadId);
        },
      });
      watchStarted = true;
    } catch (e) {
      console.warn('[chat-cloud-sync] watch init', e);
    }
  }

  if (!watchStarted) {
    startChatMessagePolling(page, threadId);
  } else {
    onListChange();
    page._chatPollTimer = setInterval(onListChange, CHAT_MESSAGE_POLL_MS);
  }
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

async function markChatThreadReadOnCloud(threadId) {
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
    next.url = await resolveMediaUrl(next.url, 'chat', next.type);
    if (next.type === 'video') {
      next.poster = await resolveMediaUrl(next.poster || next.url, 'chat', 'image');
    }
  }
  return next;
}

async function sendChatMessageOnCloud(threadId, message) {
  if (!cloudApi.cloudEnabled()) {
    return store.addChatMessage(threadId, message);
  }
  if (!hasLoginToken()) {
    return store.addChatMessage(threadId, message);
  }
  await ensureCloudSession();
  try {
    const body = await prepareMessageForCloud(message);
    const data = await chatApi('chat_messages', 'send', {
      threadId,
      message: body,
    });
    let saved = null;
    if (data && data.message) {
      saved = {
        ...data.message,
        url: data.message.url
          ? await resolveCloudFileUrl(data.message.url)
          : '',
        poster: data.message.poster
          ? await resolveCloudFileUrl(data.message.poster)
          : '',
      };
      if (saved.type === 'voice' && saved.url && saved.url.startsWith('cloud://')) {
        saved.playUrl = await resolveCloudFileUrl(saved.url);
      } else {
        saved.playUrl = saved.url;
      }
      store.appendChatMessageFromCloud(threadId, saved);
    }
    if (data && data.thread) {
      store.upsertChatThreadFromCloud(data.thread);
    }
    return saved;
  } catch (e) {
    console.warn('[chat-cloud-sync] send', e);
    wx.showToast({ title: '消息发送失败，请检查网络或重新登录', icon: 'none' });
    return null;
  }
}

module.exports = {
  refreshChatThreadsFromCloud,
  ensureChatThreadOnCloud,
  loadChatMessagesFromCloud,
  syncChatMessagesForThread,
  mergeChatMessages,
  startChatMessagePolling,
  stopChatMessagePolling,
  startChatRealtime,
  stopChatRealtime,
  resolvePeerAvatarUrl,
  markChatThreadReadOnCloud,
  sendChatMessageOnCloud,
  DEFAULT_PEER_AVATAR,
  CHAT_MESSAGE_POLL_MS,
  CHAT_THREAD_POLL_MS,
};
