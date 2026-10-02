const { ok, fail } = require('../common/response');
const { chatThreads, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const { pickEnsureThreadPayload, publicThread } = require('../common/chat-fields');

async function assertOwnThread(auth, threadId) {
  try {
    const got = await chatThreads().doc(threadId).get();
    const doc = got.data;
    if (!doc || doc.status === 0) return { err: fail(404, '会话不存在') };
    if (doc.openid !== auth.openid && doc._openid !== auth.openid) {
      return { err: fail(403, '无权访问该会话') };
    }
    return { doc };
  } catch (e) {
    return { err: fail(404, '会话不存在') };
  }
}

async function listMine(_payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const _ = getDb().command;
  const cond = _.or([{ _openid: auth.openid }, { openid: auth.openid }]);

  let rows = [];
  try {
    const res = await chatThreads()
      .where(_.and([cond, { status: 1 }]))
      .orderBy('updatedAt', 'desc')
      .limit(50)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await chatThreads().where(cond).limit(50).get();
    rows = (res.data || [])
      .filter((d) => d.status !== 0)
      .sort((a, b) => {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return tb - ta;
      });
  }

  return ok({ list: rows.map((d) => publicThread(d)).filter(Boolean) });
}

async function ensure(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const body = pickEnsureThreadPayload(payload);
  if (!body.peerId) return fail(400, '缺少 peerId');

  const res = await chatThreads()
    .where({ openid: auth.openid, peerId: body.peerId, status: 1 })
    .limit(1)
    .get();
  let doc = (res.data && res.data[0]) || null;
  const ts = now();

  if (doc) {
    const patch = { updatedAt: ts };
    if (body.peerName) patch.peerName = body.peerName;
    if (body.petName) patch.petName = body.petName;
    if (body.avatar) patch.avatar = body.avatar;
    await chatThreads().doc(doc._id).update({ data: patch });
    const got = await chatThreads().doc(doc._id).get();
    doc = got.data;
  } else {
    const addRes = await chatThreads().add({
      data: {
        openid: auth.openid,
        _openid: auth.openid,
        userId: auth.user._id,
        peerId: body.peerId,
        peerName: body.peerName,
        petName: body.petName,
        avatar: body.avatar || '',
        lastMessage: '',
        lastTime: '',
        unread: 0,
        status: 1,
        createdAt: ts,
        updatedAt: ts,
      },
    });
    const got = await chatThreads().doc(addRes._id).get();
    doc = got.data;
  }

  return ok({ thread: publicThread(doc) });
}

async function markRead(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const threadId = payload && payload.threadId;
  if (!threadId) return fail(400, '缺少 threadId');

  const owned = await assertOwnThread(auth, threadId);
  if (owned.err) return owned.err;

  await chatThreads().doc(threadId).update({
    data: { unread: 0, updatedAt: now() },
  });
  const got = await chatThreads().doc(threadId).get();
  return ok({ thread: publicThread(got.data) });
}

module.exports = {
  listMine,
  ensure,
  markRead,
  assertOwnThread,
};
