const cloudApi = require('./cloud-api');
const store = require('./store');

function chatApi(module, action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi(module, action, payload);
}

function needsCloudUpload(path) {
  if (!path || typeof path !== 'string') return false;
  if (path.startsWith('cloud://')) return false;
  if (path.startsWith('https://') || path.startsWith('http://')) return false;
  if (path.startsWith('/assets/')) return false;
  return true;
}

function uploadOne(localPath, folder) {
  const m = localPath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = (m && m[1]) || 'jpg';
  const cloudPath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: localPath }).then((res) => res.fileID);
}

async function resolveMediaUrl(url, folder) {
  if (!url || !needsCloudUpload(url)) return url || '';
  return uploadOne(url, folder);
}

const { hasLoginToken, ensureCloudSession } = require('./cloud-session');
const { resolveCloudFileUrl } = require('./cloud-media');

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

async function loadChatMessagesFromCloud(threadId) {
  if (!cloudApi.cloudEnabled()) {
    return store.getChatMessages(threadId);
  }
  if (!hasLoginToken()) return store.getChatMessages(threadId);
  await ensureCloudSession();
  try {
    const data = await chatApi('chat_messages', 'listByThread', { threadId });
    let list = (data && data.list) || [];
    list = await Promise.all(
      list.map(async (m) => ({
        ...m,
        url: await resolveCloudFileUrl(m.url),
        poster: await resolveCloudFileUrl(m.poster),
      })),
    );
    store.setChatMessagesForThread(threadId, list);
    return list;
  } catch (e) {
    console.warn('[chat-cloud-sync] listByThread', e);
    return store.getChatMessages(threadId);
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
    next.url = await resolveMediaUrl(next.url, 'chat');
    if (next.type === 'video') {
      next.poster = await resolveMediaUrl(next.poster || next.url, 'chat');
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
        url: await resolveCloudFileUrl(data.message.url),
        poster: await resolveCloudFileUrl(data.message.poster),
      };
      store.appendChatMessageFromCloud(threadId, saved);
    }
    if (data && data.thread) {
      store.upsertChatThreadFromCloud(data.thread);
    }
    return saved;
  } catch (e) {
    console.warn('[chat-cloud-sync] send', e);
    return store.addChatMessage(threadId, message);
  }
}

module.exports = {
  refreshChatThreadsFromCloud,
  ensureChatThreadOnCloud,
  loadChatMessagesFromCloud,
  markChatThreadReadOnCloud,
  sendChatMessageOnCloud,
};
