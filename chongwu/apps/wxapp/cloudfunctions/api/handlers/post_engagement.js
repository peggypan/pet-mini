const { ok, fail } = require('../common/response');
const { requireUser } = require('../common/auth-user');
const {
  normalizePostRef,
  toggleLikeForUser,
  recordShareForPost,
  viewerLikedPost,
} = require('../common/post-engagement');

async function toggleLike(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;
  const postId = payload && payload.postId;
  if (!postId) return fail(400, '缺少 postId');
  const postRef = normalizePostRef(payload && payload.postRef);

  const result = await toggleLikeForUser(auth, postId, postRef);
  if (result.err === 'not_found') return fail(404, '内容不存在');
  return ok(result);
}

async function recordShare(payload, wxContext) {
  const postId = payload && payload.postId;
  if (!postId) return fail(400, '缺少 postId');
  const postRef = normalizePostRef(payload && payload.postRef);

  const result = await recordShareForPost(postId, postRef);
  if (result.err === 'not_found') return fail(404, '内容不存在');
  return ok(result);
}

async function getLikeState(payload, wxContext) {
  const postId = payload && payload.postId;
  if (!postId) return fail(400, '缺少 postId');
  const postRef = normalizePostRef(payload && payload.postRef);
  const openid = (wxContext && wxContext.OPENID) || '';
  const liked = openid ? await viewerLikedPost(openid, postId, postRef) : false;
  return ok({ postId: String(postId), postRef, liked });
}

module.exports = {
  toggleLike,
  recordShare,
  getLikeState,
};
