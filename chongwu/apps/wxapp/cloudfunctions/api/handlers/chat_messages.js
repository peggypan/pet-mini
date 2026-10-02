const { ok, fail } = require('../common/response');
const { chatMessages, chatThreads, now } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const {
  pickMessagePayload,
  publicMessage,
  publicThread,
  messagePreview,
} = require('../common/chat-fields');
const { assertOwnThread } = require('./chat_threads');

async function listByThread(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const threadId = payload && payload.threadId;
  if (!threadId) return fail(400, '缺少 threadId');

  const owned = await assertOwnThread(auth, threadId);
  if (owned.err) return owned.err;

  const limit = Math.min(200, Math.max(1, Number(payload && payload.limit) || 200));
  let rows = [];
  try {
    const res = await chatMessages()
      .where({ threadId, status: 1 })
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await chatMessages().where({ threadId }).limit(limit).get();
    rows = (res.data || [])
      .filter((d) => d.status !== 0)
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ta - tb;
      });
  }

  return ok({ list: rows.map((d) => publicMessage(d)).filter(Boolean) });
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
  const threadPatch = {
    lastMessage: preview,
    lastTime: '刚刚',
    updatedAt: ts,
  };
  if (body.sender === 'peer') {
    threadPatch.unread = (Number(owned.doc.unread) || 0) + 1;
  }
  await chatThreads().doc(body.threadId).update({ data: threadPatch });

  const gotMsg = await chatMessages().doc(addRes._id).get();
  const gotThread = await chatThreads().doc(body.threadId).get();

  return ok({
    message: publicMessage(gotMsg.data),
    thread: publicThread(gotThread.data),
  });
}

module.exports = {
  listByThread,
  send,
};
