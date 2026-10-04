const { ok, fail } = require('../common/response');
const { chatMessages, chatThreads, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const {
  pickMessagePayload,
  publicMessage,
  publicThread,
  messagePreview,
} = require('../common/chat-fields');
const { assertOwnThread } = require('./chat_threads');
const { deliverChatMessageToPeer } = require('../common/chat-deliver');
const { enrichMessagesWithMediaUrls } = require('../common/chat-media-resolve');

function sortAsc(docs) {
  return (docs || [])
    .filter((d) => d && d.status !== 0)
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return String(a._id || '').localeCompare(String(b._id || ''));
    });
}

const THREAD_FETCH_CAP = 500;

async function fetchThreadSortedAsc(where) {
  try {
    const res = await chatMessages()
      .where(where)
      .orderBy('createdAt', 'asc')
      .limit(THREAD_FETCH_CAP)
      .get();
    return sortAsc(res.data || []);
  } catch (e) {
    const res = await chatMessages().where(where).limit(THREAD_FETCH_CAP).get();
    return sortAsc(res.data || []);
  }
}

async function listByThread(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const threadId = payload && payload.threadId;
  if (!threadId) return fail(400, '缺少 threadId');

  const owned = await assertOwnThread(auth, threadId);
  if (owned.err) return owned.err;

  const pageSize = Math.min(50, Math.max(1, Number(payload && payload.pageSize) || Number(payload && payload.limit) || 10));
  const pageMode = (payload && payload.pageMode) || 'latest';
  const since = payload && payload.since ? String(payload.since).trim() : '';
  const beforeCreatedAt = payload && payload.beforeCreatedAt
    ? String(payload.beforeCreatedAt).trim()
    : '';

  if (since) {
    const _ = getDb().command;
    let rows = [];
    try {
      const res = await chatMessages()
        .where({ threadId, status: 1, createdAt: _.gt(since) })
        .orderBy('createdAt', 'asc')
        .limit(50)
        .get();
      rows = res.data || [];
    } catch (e) {
      const sorted = await fetchThreadSortedAsc({ threadId, status: 1 });
      const sinceTs = new Date(since).getTime();
      rows = sorted.filter((d) => {
        const ts = d.createdAt ? new Date(d.createdAt).getTime() : 0;
        return ts > sinceTs;
      }).slice(0, 50);
    }
    let list = rows.map((d) => publicMessage(d)).filter(Boolean);
    list = await enrichMessagesWithMediaUrls(list);
    return ok({ list, hasMore: false });
  }

  if (beforeCreatedAt) {
    const beforeTs = new Date(beforeCreatedAt).getTime();
    const sorted = await fetchThreadSortedAsc({ threadId, status: 1 });
    const pool = sorted.filter((d) => {
      const ts = d.createdAt ? new Date(d.createdAt).getTime() : 0;
      return !Number.isNaN(beforeTs) ? ts < beforeTs : false;
    });
    const hasMore = pool.length > pageSize;
    const rows = pool.slice(-pageSize);
    let list = rows.map((d) => publicMessage(d)).filter(Boolean);
    list = await enrichMessagesWithMediaUrls(list);
    return ok({ list, hasMore, totalBefore: pool.length, pageMode: 'before' });
  }

  const sorted = await fetchThreadSortedAsc({ threadId, status: 1 });
  const hasMore = sorted.length > pageSize;
  const rows = sorted.slice(-pageSize);
  let list = rows.map((d) => publicMessage(d)).filter(Boolean);
  list = await enrichMessagesWithMediaUrls(list);
  return ok({ list, hasMore, total: sorted.length, pageMode: 'latest' });
}

async function send(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const body = pickMessagePayload(payload);
  if (!body.threadId) return fail(400, '缺少 threadId');

  const owned = await assertOwnThread(auth, body.threadId);
  if (owned.err) return owned.err;

  const ts = now();
  const addRes = await chatMessages().add({
    data: {
      threadId: body.threadId,
      openid: auth.openid,
      _openid: auth.openid,
      userId: auth.user._id,
      sender: body.sender,
      type: body.type,
      content: body.content,
      url: body.url,
      poster: body.poster,
      location: body.location,
      callStatus: body.callStatus,
      duration: body.duration,
      eventId: body.eventId,
      eventTitle: body.eventTitle,
      aaAmount: body.aaAmount,
      aaPeople: body.aaPeople,
      aaPer: body.aaPer,
      shareTitle: body.shareTitle,
      shareRef: body.shareRef,
      status: 1,
      createdAt: ts,
    },
  });

  const preview = messagePreview(body);
  const { formatPublishTime } = require('../common/relative-time');
  const threadPatch = {
    lastMessage: preview,
    lastTime: formatPublishTime(ts),
    updatedAt: ts,
  };
  if (body.sender === 'peer') {
    threadPatch.unread = (Number(owned.doc.unread) || 0) + 1;
  }
  await chatThreads().doc(body.threadId).update({ data: threadPatch });

  if (body.sender === 'me') {
    try {
      await deliverChatMessageToPeer({
        auth,
        senderThread: owned.doc,
        body,
        preview,
        ts,
      });
    } catch (e) {
      console.warn('[chat_messages.send] deliver', e);
    }
  }

  const gotMsg = await chatMessages().doc(addRes._id).get();
  const gotThread = await chatThreads().doc(body.threadId).get();

  let message = publicMessage(gotMsg.data);
  if (message) {
    const enriched = await enrichMessagesWithMediaUrls([message]);
    message = enriched[0] || message;
  }
  return ok({
    message,
    thread: publicThread(gotThread.data),
  });
}

module.exports = {
  listByThread,
  send,
};
