const { ok, fail } = require('../common/response');
const { chatThreads, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const { pickEnsureThreadPayload, publicThread, dedupePublicThreads } = require('../common/chat-fields');

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

  return ok({ list: dedupePublicThreads(rows) });
}

function normalizeOpenid(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('oid:')) return s.slice(4);
  if (s.startsWith('c_') && s.length > 22) return s.slice(2);
  return s;
}

async function findExistingThread(auth, body) {
  const _ = getDb().command;
  const owner = _.or([{ openid: auth.openid }, { _openid: auth.openid }]);
  const active = { status: 1 };
  const oid = normalizeOpenid(body.peerOpenid)
    || (body.peerId && body.peerId.length >= 26 ? body.peerId : '');

  if (oid) {
    const byOpenid = await chatThreads()
      .where(_.and([owner, active, { peerOpenid: oid }]))
      .limit(1)
      .get();
    if (byOpenid.data && byOpenid.data[0]) return byOpenid.data[0];

    const byPeerAsOpenid = await chatThreads()
      .where(_.and([owner, active, { peerId: oid }]))
      .limit(1)
      .get();
    if (byPeerAsOpenid.data && byPeerAsOpenid.data[0]) return byPeerAsOpenid.data[0];
  }

  if (body.peerId) {
    const byPeerId = await chatThreads()
      .where(_.and([owner, active, { peerId: body.peerId }]))
      .limit(1)
      .get();
    if (byPeerId.data && byPeerId.data[0]) return byPeerId.data[0];
  }

  return null;
}

async function ensure(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const body = pickEnsureThreadPayload(payload);
  if (!body.peerId && !body.peerOpenid) return fail(400, '缺少 peerId');

  const oid = normalizeOpenid(body.peerOpenid)
    || (body.peerId && body.peerId.length >= 26 ? body.peerId : '');
  if (oid) {
    body.peerOpenid = oid;
    body.peerId = oid;
  }

  let doc = await findExistingThread(auth, body);
  const ts = now();

  if (doc) {
    const patch = { updatedAt: ts };
    if (body.peerOpenid) patch.peerOpenid = body.peerOpenid;
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
        peerOpenid: body.peerOpenid || '',
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

async function remove(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const threadId = payload && payload.threadId;
  if (!threadId) return fail(400, '缺少 threadId');

  const owned = await assertOwnThread(auth, threadId);
  if (owned.err) return owned.err;

  await chatThreads().doc(threadId).update({
    data: { status: 0, updatedAt: now() },
  });
  return ok({ threadId: String(threadId) });
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
  remove,
  assertOwnThread,
};
