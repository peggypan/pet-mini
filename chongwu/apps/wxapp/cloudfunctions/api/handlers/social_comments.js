const { ok, fail } = require('../common/response');
const { socialComments, socialPosts, localPosts, now, getDb } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const { pickCommentPayload, validateComment, publicComment } = require('../common/comment-fields');
const { rejectIfSensitive } = require('../common/sensitive-words');

function viewerOpenid(ctx) {
  return (ctx && ctx.OPENID) || '';
}

function sortByCreatedDesc(rows) {
  return (rows || []).slice().sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

function normalizePostRef(ref) {
  return ref === 'local_posts' ? 'local_posts' : 'social_posts';
}

function postsCollection(postRef) {
  return postRef === 'local_posts' ? localPosts() : socialPosts();
}

async function assertPostReadable(postId, postRef) {
  const ref = normalizePostRef(postRef);
  try {
    const got = await postsCollection(ref).doc(postId).get();
    const doc = got.data;
    if (!doc || doc.status === 0 || doc.userDeleted === true) {
      return { err: fail(404, '内容不存在') };
    }
    if (doc.auditStatus !== 'approved') {
      return { err: fail(404, '内容不存在') };
    }
    return { doc, postRef: ref };
  } catch (e) {
    return { err: fail(404, '内容不存在') };
  }
}

async function listByPost(payload, wxContext) {
  const postId = payload && payload.postId;
  if (!postId) return fail(400, '缺少 postId');
  const postRef = normalizePostRef(payload && payload.postRef);

  const readable = await assertPostReadable(postId, postRef);
  if (readable.err) return readable.err;

  const _ = getDb().command;
  const limit = Math.min(100, Math.max(1, Number(payload && payload.limit) || 100));
  const parts = [
    { postId: String(postId) },
    { auditStatus: 'approved' },
    { userDeleted: _.neq(true) },
    { status: _.neq(0) },
  ];
  if (postRef === 'social_posts') {
    parts.push(_.or([{ postRef: 'social_posts' }, { postRef: _.exists(false) }]));
  } else {
    parts.push({ postRef: 'local_posts' });
  }

  let rows = [];
  try {
    const res = await socialComments()
      .where(_.and(parts))
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    rows = res.data || [];
  } catch (e) {
    const res = await socialComments().where(_.and(parts)).limit(limit).get();
    rows = sortByCreatedDesc(res.data || []);
  }

  const openid = viewerOpenid(wxContext);
  return ok({
    list: rows.map((d) => publicComment(d, openid)),
    postId: String(postId),
    postRef,
  });
}

async function save(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const body = pickCommentPayload({
    ...payload,
    userName: (payload && payload.userName) || auth.user.nickname || '宠友',
  });
  const msg = validateComment(body);
  if (msg) return fail(400, msg);
  const sens = await rejectIfSensitive(body.content);
  if (sens) return fail(400, sens);

  const readable = await assertPostReadable(body.postId, body.postRef);
  if (readable.err) return readable.err;

  if (body.parentId) {
    try {
      const parentGot = await socialComments().doc(body.parentId).get();
      const parent = parentGot.data;
      const parentRef = normalizePostRef(parent && parent.postRef);
      if (
        !parent
        || parent.postId !== body.postId
        || parentRef !== body.postRef
        || parent.userDeleted === true
        || parent.status === 0
      ) {
        return fail(400, '回复目标不存在');
      }
    } catch (e) {
      return fail(400, '回复目标不存在');
    }
  }

  const base = {
    ...body,
    openid: auth.openid,
    _openid: auth.openid,
    userId: auth.user._id,
    userName: auth.user.nickname || body.userName || '宠友',
    avatar: body.avatar || auth.user.avatarUrl || auth.user.avatar || '',
    auditStatus: 'approved',
    userDeleted: false,
    status: 1,
    createdAt: now(),
    updatedAt: now(),
  };

  const addRes = await socialComments().add({ data: base });
  const _ = getDb().command;
  await postsCollection(body.postRef)
    .doc(body.postId)
    .update({
      data: {
        comments: _.inc(1),
        updatedAt: now(),
      },
    });

  const created = await socialComments().doc(addRes._id).get();
  const comment = publicComment(created.data, auth.openid);
  let postComments = null;
  try {
    const postGot = await postsCollection(body.postRef).doc(body.postId).get();
    postComments = (postGot.data && postGot.data.comments) || null;
  } catch (e) {
    // ignore
  }

  return ok({ comment, postComments, postRef: body.postRef });
}

async function remove(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const id = payload && payload.id;
  if (!id) return fail(400, '缺少 id');

  try {
    const got = await socialComments().doc(id).get();
    const doc = got.data;
    if (!doc || doc.userDeleted === true) return fail(404, '评论不存在');
    if (doc.openid !== auth.openid && doc._openid !== auth.openid) {
      return fail(403, '无权删除');
    }
    await socialComments().doc(id).update({
      data: {
        userDeleted: true,
        updatedAt: now(),
      },
    });
    const _ = getDb().command;
    const postRef = normalizePostRef(doc.postRef);
    if (doc.postId) {
      await postsCollection(postRef)
        .doc(doc.postId)
        .update({
          data: {
            comments: _.inc(-1),
            updatedAt: now(),
          },
        })
        .catch(() => {});
    }
    return ok({ id });
  } catch (e) {
    return fail(404, '评论不存在');
  }
}

module.exports = {
  listByPost,
  save,
  remove,
};
