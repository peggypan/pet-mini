const cloudApi = require('./cloud-api');
const store = require('./store');

function commentApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('social_comments', action, payload);
}

function needsCloudUpload(path) {
  if (!path || typeof path !== 'string') return false;
  if (path.startsWith('cloud://')) return false;
  if (path.startsWith('https://') || path.startsWith('http://')) return false;
  if (path.startsWith('/assets/')) return false;
  return true;
}

function uploadOne(localPath) {
  const m = localPath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = (m && m[1]) || 'jpg';
  const cloudPath = `social/comments/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: localPath }).then((res) => res.fileID);
}

async function resolveUrl(url) {
  if (!url) return '';
  if (!needsCloudUpload(url)) return url;
  return uploadOne(url);
}

async function uploadCommentMedia(payload) {
  const next = { ...payload };
  next.avatar = await resolveUrl(next.avatar);
  if (next.type === 'image' || (next.url && !next.poster)) {
    next.url = await resolveUrl(next.url);
  }
  if (next.type === 'video') {
    next.url = await resolveUrl(next.url);
    next.poster = await resolveUrl(next.poster || next.url);
  }
  return next;
}

async function ensureCloudLogin() {
  const { refreshPetsFromCloud } = require('./pet-cloud-sync');
  try {
    const loginData = await cloudApi.login();
    if (loginData && loginData.token) {
      const app = getApp();
      app.globalData.token = loginData.token;
      app.globalData.userInfo = loginData.user;
      wx.setStorageSync('token', loginData.token);
      wx.setStorageSync('userInfo', loginData.user);
    }
  } catch (e) {
    // ignore
  }
  await refreshPetsFromCloud().catch(() => {});
}

async function refreshPostCommentsFromCloud(postId, options = {}) {
  if (!cloudApi.cloudEnabled() || !postId) return store.listPostComments(postId);
  await ensureCloudLogin();
  try {
    const data = await commentApi('listByPost', {
      postId: String(postId),
      postRef: options.postRef || 'social_posts',
      limit: 100,
    });
    const list = (data && data.list) || [];
    return store.replacePostCommentsFromCloud(postId, list);
  } catch (e) {
    console.warn('[social-comment-cloud-sync] listByPost', e);
    return store.listPostComments(postId);
  }
}

async function saveCommentToCloud(postId, payload, options = {}) {
  if (!cloudApi.cloudEnabled()) {
    return store.addPostComment(postId, payload);
  }
  await ensureCloudLogin();
  const uploaded = await uploadCommentMedia(payload);
  const postRef = options.postRef || 'social_posts';
  const body = {
    ...uploaded,
    postId: String(postId),
    postRef,
  };
  const data = await commentApi('save', body);
  const comment = (data && data.comment) || null;
  if (!comment) throw new Error('评论失败');
  store.upsertPostCommentFromCloud(postId, comment);
  if (data.postComments != null) {
    if (postRef === 'local_posts') {
      store.updateLocalPost(postId, { comments: data.postComments });
    } else {
      store.updateSocialPost(postId, { comments: data.postComments });
    }
  }
  return comment;
}

async function removeCommentFromCloud(commentId, postId) {
  if (!cloudApi.cloudEnabled()) {
    return false;
  }
  await commentApi('remove', { id: commentId });
  store.removePostComment(postId, commentId);
  return true;
}

module.exports = {
  refreshPostCommentsFromCloud,
  saveCommentToCloud,
  removeCommentFromCloud,
};
