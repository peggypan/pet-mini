const cloudApi = require('./cloud-api');
const store = require('./store');
const { persistPostEngagement } = require('./social-post-engagement');

function engagementApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪');
  }
  return cloudApi.callApi('post_engagement', action, payload);
}

function applyEngagementToStore(postId, postSource, data) {
  const patch = {
    liked: !!data.liked,
    likes: Math.max(0, Number(data.likes) || 0),
    shares: Math.max(0, Number(data.shares) || 0),
  };
  persistPostEngagement(postId, postSource, patch);
  if (postSource === 'local') {
    store.updateLocalPost(postId, patch);
  } else {
    store.updateSocialPost(postId, patch);
  }
  return patch;
}

async function togglePostLikeCloud(postId, postRef) {
  const data = await engagementApi('toggleLike', {
    postId: String(postId),
    postRef: postRef || 'social_posts',
  });
  return data || {};
}

async function recordPostShareCloud(postId, postRef) {
  const data = await engagementApi('recordShare', {
    postId: String(postId),
    postRef: postRef || 'social_posts',
  });
  return data || {};
}

async function bumpPostShareSynced(postId, postSource, post) {
  const { bumpPostShare } = require('./social-post-engagement');
  const postRef = postSource === 'local' ? 'local_posts' : 'social_posts';
  if (!cloudApi.cloudEnabled()) {
    return bumpPostShare(postId, post, postSource);
  }
  try {
    const { hasLoginToken, ensureCloudSession } = require('./cloud-session');
    if (hasLoginToken()) await ensureCloudSession();
    const data = await recordPostShareCloud(postId, postRef);
    const patch = applyEngagementToStore(postId, postSource, data);
    return { ...post, ...patch };
  } catch (e) {
    return bumpPostShare(postId, post, postSource);
  }
}

async function togglePostLikeSynced(postId, postSource, post) {
  const { applyLikeEngagement } = require('./social-post-engagement');
  const postRef = postSource === 'local' ? 'local_posts' : 'social_posts';
  const { hasLoginToken, ensureCloudSession } = require('./cloud-session');
  if (!cloudApi.cloudEnabled() || !hasLoginToken()) {
    const liked = !post.liked;
    const likes = liked ? (post.likes || 0) + 1 : Math.max(0, (post.likes || 0) - 1);
    return applyLikeEngagement(postId, post, postSource, liked, likes);
  }
  await ensureCloudSession();
  const data = await togglePostLikeCloud(postId, postRef);
  return applyEngagementToStore(postId, postSource, data);
}

module.exports = {
  togglePostLikeCloud,
  recordPostShareCloud,
  applyEngagementToStore,
  bumpPostShareSynced,
  togglePostLikeSynced,
};
