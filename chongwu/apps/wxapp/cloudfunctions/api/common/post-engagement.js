const { postLikes, socialPosts, localPosts, now, getDb } = require('./db');

const POST_REFS = ['social_posts', 'local_posts'];

function normalizePostRef(ref) {
  return ref === 'local_posts' ? 'local_posts' : 'social_posts';
}

function postCollection(postRef) {
  return normalizePostRef(postRef) === 'local_posts' ? localPosts() : socialPosts();
}

async function assertPostReadable(postId, postRef) {
  const ref = normalizePostRef(postRef);
  try {
    const got = await postCollection(ref).doc(postId).get();
    const doc = got.data;
    if (!doc || doc.status === 0 || doc.userDeleted === true) {
      return { err: 'not_found' };
    }
    if (doc.auditStatus !== 'approved') {
      return { err: 'not_found' };
    }
    return { doc, postRef: ref };
  } catch (e) {
    return { err: 'not_found' };
  }
}

async function findActiveLike(openid, postId, postRef) {
  const _ = getDb().command;
  const res = await postLikes()
    .where(
      _.and([
        { openid },
        { postId: String(postId) },
        { postRef: normalizePostRef(postRef) },
        { status: 1 },
      ]),
    )
    .limit(1)
    .get();
  return (res.data && res.data[0]) || null;
}

async function likedIdSet(viewerOpenid, postRef, postIds) {
  if (!viewerOpenid || !postIds || !postIds.length) return new Set();
  const _ = getDb().command;
  const ref = normalizePostRef(postRef);
  const ids = postIds.map(String);
  let rows = [];
  try {
    const res = await postLikes()
      .where(
        _.and([
          { openid: viewerOpenid },
          { postRef: ref },
          { postId: _.in(ids) },
          { status: 1 },
        ]),
      )
      .limit(100)
      .get();
    rows = res.data || [];
  } catch (e) {
    return new Set();
  }
  return new Set(rows.map((d) => String(d.postId)));
}

async function viewerLikedPost(viewerOpenid, postId, postRef) {
  const set = await likedIdSet(viewerOpenid, postRef, [postId]);
  return set.has(String(postId));
}

async function toggleLikeForUser(auth, postId, postRef) {
  const readable = await assertPostReadable(postId, postRef);
  if (readable.err) return readable;

  const ref = readable.postRef;
  const col = postCollection(ref);
  const _ = getDb().command;
  const active = await findActiveLike(auth.openid, postId, ref);
  const ts = now();

  if (active) {
    await postLikes().doc(active._id).update({
      data: { status: 0, updatedAt: ts },
    });
    await col.doc(postId).update({
      data: {
        likes: _.inc(-1),
        updatedAt: ts,
      },
    });
  } else {
    await postLikes().add({
      data: {
        postId: String(postId),
        postRef: ref,
        openid: auth.openid,
        _openid: auth.openid,
        userId: auth.user._id,
        status: 1,
        createdAt: ts,
        updatedAt: ts,
      },
    });
    await col.doc(postId).update({
      data: {
        likes: _.inc(1),
        updatedAt: ts,
      },
    });
  }

  const got = await col.doc(postId).get();
  const doc = got.data || {};
  let likes = Number(doc.likes) || 0;
  if (likes < 0) {
    likes = 0;
    await col.doc(postId).update({ data: { likes: 0, updatedAt: now() } });
  }
  likes = Math.max(0, likes);
  const shares = Math.max(0, Number(doc.shares) || 0);
  const liked = !active;
  return {
    postId: String(postId),
    postRef: ref,
    liked,
    likes,
    shares,
  };
}

async function recordShareForPost(postId, postRef) {
  const readable = await assertPostReadable(postId, postRef);
  if (readable.err) return readable;

  const ref = readable.postRef;
  const col = postCollection(ref);
  const _ = getDb().command;
  const ts = now();
  await col.doc(postId).update({
    data: {
      shares: _.inc(1),
      updatedAt: ts,
    },
  });
  const got = await col.doc(postId).get();
  const doc = got.data || {};
  return {
    postId: String(postId),
    postRef: ref,
    shares: Math.max(0, Number(doc.shares) || 0),
    likes: Math.max(0, Number(doc.likes) || 0),
  };
}

module.exports = {
  POST_REFS,
  normalizePostRef,
  likedIdSet,
  viewerLikedPost,
  toggleLikeForUser,
  recordShareForPost,
};
