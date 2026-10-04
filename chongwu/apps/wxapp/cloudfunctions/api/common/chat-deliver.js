const { getDb, chatThreads, chatMessages, users, pets, buddyPosts, events } = require('./db');

async function resolvePeerUserOpenid(threadDoc) {
  if (!threadDoc) return null;
  if (threadDoc.peerOpenid) return String(threadDoc.peerOpenid).trim() || null;

  const peerId = threadDoc.peerId ? String(threadDoc.peerId).trim() : '';
  if (!peerId) return null;

  try {
    const buddy = await buddyPosts().doc(peerId).get();
    if (buddy.data) {
      return buddy.data.openid || buddy.data._openid || null;
    }
  } catch (e) {
    // not a buddy post id
  }

  try {
    const ev = await events().doc(peerId).get();
    if (ev.data) {
      return ev.data.openid || ev.data._openid || null;
    }
  } catch (e) {
    // not an event id
  }

  if (peerId.startsWith('host_')) {
    const eventId = peerId.slice(5);
    try {
      const ev = await events().doc(eventId).get();
      if (ev.data) {
        return ev.data.openid || ev.data._openid || null;
      }
    } catch (e2) {
      // ignore
    }
  }

  try {
    const u = await users().where({ openid: peerId }).limit(1).get();
    if (u.data && u.data[0]) return peerId;
  } catch (e3) {
    // ignore
  }

  return null;
}

async function findThreadBetween(ownerOpenid, counterpartyOpenid) {
  if (!ownerOpenid || !counterpartyOpenid) return null;
  const _ = getDb().command;
  try {
    const res = await chatThreads()
      .where(
        _.and([
          { openid: ownerOpenid, status: 1 },
          _.or([{ peerOpenid: counterpartyOpenid }, { peerId: counterpartyOpenid }]),
        ]),
      )
      .limit(1)
      .get();
    return (res.data && res.data[0]) || null;
  } catch (e) {
    const res = await chatThreads().where({ openid: ownerOpenid, status: 1 }).limit(20).get();
    const rows = res.data || [];
    return (
      rows.find(
        (t) =>
          t.peerOpenid === counterpartyOpenid || t.peerId === counterpartyOpenid,
      ) || null
    );
  }
}

async function ensurePeerInboxThread(recipientOpenid, senderOpenid, senderProfile, ts) {
  let doc = await findThreadBetween(recipientOpenid, senderOpenid);
  if (doc) {
    const patch = { updatedAt: ts };
    if (senderProfile.peerName) patch.peerName = senderProfile.peerName;
    if (senderProfile.petName) patch.petName = senderProfile.petName;
    if (senderProfile.avatar) patch.avatar = senderProfile.avatar;
    await chatThreads().doc(doc._id).update({ data: patch });
    const got = await chatThreads().doc(doc._id).get();
    return got.data;
  }

  const addRes = await chatThreads().add({
    data: {
      openid: recipientOpenid,
      _openid: recipientOpenid,
      peerId: senderOpenid,
      peerOpenid: senderOpenid,
      peerName: senderProfile.peerName || '宠友',
      petName: senderProfile.petName || '宠物',
      avatar: senderProfile.avatar || '',
      lastMessage: '',
      lastTime: '',
      unread: 0,
      status: 1,
      createdAt: ts,
      updatedAt: ts,
    },
  });
  const got = await chatThreads().doc(addRes._id).get();
  return got.data;
}

async function senderProfileFromAuth(auth) {
  const user = (auth && auth.user) || {};
  let avatar = user.avatarUrl || user.avatar || '';
  let petName = user.petName || '';
  const openid = auth && auth.openid;
  if (openid && (!avatar || !petName)) {
    try {
      const _ = getDb().command;
      let pet = null;
      try {
        const res = await pets()
          .where(_.or([{ _openid: openid }, { openid }]))
          .orderBy('updatedAt', 'desc')
          .limit(1)
          .get();
        pet = (res.data && res.data[0]) || null;
      } catch (e2) {
        const res = await pets()
          .where(_.or([{ _openid: openid }, { openid }]))
          .limit(1)
          .get();
        pet = (res.data && res.data[0]) || null;
      }
      if (pet) {
        if (!petName) petName = pet.name || pet.petName || '宠物';
        if (!avatar) avatar = pet.avatarUrl || pet.avatar || '';
      }
    } catch (e) {
      // ignore
    }
  }
  return {
    peerName: user.nickname || '宠友',
    petName: petName || '宠物',
    avatar: avatar || '',
  };
}

async function deliverChatMessageToPeer({
  auth,
  senderThread,
  body,
  preview,
  ts,
}) {
  const senderOpenid = auth.openid;
  let recipientOpenid = await resolvePeerUserOpenid(senderThread);
  if (!recipientOpenid || recipientOpenid === senderOpenid) {
    return null;
  }

  if (!senderThread.peerOpenid) {
    try {
      await chatThreads().doc(senderThread._id).update({
        data: { peerOpenid: recipientOpenid, updatedAt: ts },
      });
    } catch (e) {
      // ignore
    }
  }

  const senderProfile = await senderProfileFromAuth(auth);
  const inboxThread = await ensurePeerInboxThread(
    recipientOpenid,
    senderOpenid,
    senderProfile,
    ts,
  );
  if (!inboxThread || !inboxThread._id) return null;

  await chatMessages().add({
    data: {
      threadId: inboxThread._id,
      openid: recipientOpenid,
      _openid: recipientOpenid,
      userId: '',
      sender: 'peer',
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

  const { formatPublishTime } = require('./relative-time');
  await chatThreads().doc(inboxThread._id).update({
    data: {
      lastMessage: preview,
      lastTime: formatPublishTime(ts),
      unread: (Number(inboxThread.unread) || 0) + 1,
      updatedAt: ts,
    },
  });

  return inboxThread._id;
}

module.exports = {
  resolvePeerUserOpenid,
  findThreadBetween,
  deliverChatMessageToPeer,
  senderProfileFromAuth,
};
