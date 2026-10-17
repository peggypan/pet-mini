const store = require('./store');

function channelForSource(postSource) {
  return postSource === 'local' ? 'local' : 'social';
}

/** 详情页合并本地点赞/分享，避免云拉取覆盖 */
function mergePostDetailEngagement(postId, view, postSource) {
  if (!view) return null;
  const sid = String(postId);
  const channel = channelForSource(postSource);

  const stored = store.getPostEngagement(channel, sid) || {};
  const cached = postSource === 'local' ? store.getLocalPost(sid) : store.getSocialPost(sid);
  const override = postSource === 'local'
    ? readLocalOverride(sid)
    : (store.getSocialOverride(sid) || {});

  const likedFromThumb = store.isPostThumbLiked(channel, sid);
  const hasServerLiked = view && (view.liked === true || view.liked === false);
  const liked = hasServerLiked
    ? !!view.liked
    : !!(
      stored.liked
      || (cached && cached.liked)
      || override.liked
      || likedFromThumb
    );

  let likes = Math.max(
    Number(stored.likes) || 0,
    Number(view.likes) || 0,
    Number(cached && cached.likes) || 0,
    Number(override.likes) || 0,
  );
  let shares = Math.max(
    Number(stored.shares) || 0,
    Number(view.shares) || 0,
    Number(cached && cached.shares) || 0,
    Number(override.shares) || 0,
  );
  if (liked && likes < 1) likes = 1;

  const comments = Math.max(
    Number(view.comments) || 0,
    Number(cached && cached.comments) || 0,
    Number(override.comments) || 0,
    Number(stored.comments) || 0,
  );

  return {
    ...view,
    likes,
    shares,
    comments,
    liked,
  };
}

function persistPostEngagement(postId, postSource, patch) {
  const channel = channelForSource(postSource);
  return store.patchPostEngagement(channel, postId, patch);
}

function bumpPostShare(postId, post, postSource) {
  const shares = (Number(post.shares) || 0) + 1;
  const patch = { shares };
  persistPostEngagement(postId, postSource, patch);
  if (postSource === 'local') {
    store.updateLocalPost(postId, patch);
  } else {
    store.updateSocialPost(postId, patch);
  }
  return { ...post, ...patch };
}

function applyLikeEngagement(postId, post, postSource, liked, likes) {
  const patch = { liked, likes };
  persistPostEngagement(postId, postSource, patch);
  if (postSource === 'local') {
    store.updateLocalPost(postId, patch);
  } else {
    store.updateSocialPost(postId, patch);
  }
  return patch;
}

function readLocalOverride(id) {
  try {
    return wx.getStorageSync('mvp_local_overrides')[id] || null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  mergePostDetailEngagement,
  bumpPostShare,
  applyLikeEngagement,
  persistPostEngagement,
};
