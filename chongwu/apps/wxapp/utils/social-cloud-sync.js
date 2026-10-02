const cloudApi = require('./cloud-api');
const store = require('./store');

/** 统一走 callApi（与 saveBuddyPost 等封装等价，热更新更稳） */
function socialApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('social_posts', action, payload);
}

function needsCloudUpload(path) {
  if (!path || typeof path !== 'string') return false;
  if (path.startsWith('cloud://')) return false;
  if (path.startsWith('https://') || path.startsWith('http://')) return false;
  if (path.startsWith('/assets/')) return false;
  return true;
}

function uploadOne(localPath, folder) {
  const m = localPath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = (m && m[1]) || 'jpg';
  const cloudPath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: localPath }).then((res) => res.fileID);
}

async function resolveUrl(url, folder) {
  if (!url) return '';
  if (!needsCloudUpload(url)) return url;
  return uploadOne(url, folder);
}

async function uploadSocialMedia(payload) {
  const next = { ...payload };
  next.avatar = await resolveUrl(next.avatar, 'social');
  const mediaList = Array.isArray(next.mediaList) ? next.mediaList : [];
  next.mediaList = await Promise.all(
    mediaList.map(async (item) => {
      if (!item || typeof item !== 'object') return item;
      const url = await resolveUrl(item.url, 'social');
      const poster = item.type === 'video' ? await resolveUrl(item.poster || item.url, 'social') : '';
      return item.type === 'video'
        ? { ...item, url, poster: poster || url }
        : { ...item, url };
    }),
  );
  next.images = next.mediaList.filter((m) => m.type === 'image').map((m) => m.url);
  if (!next.image && next.images[0]) next.image = next.images[0];
  return next;
}

const { hasLoginToken, ensureCloudSession } = require('./cloud-session');
const { resolveSocialPosts, resolveSocialPostMedia } = require('./cloud-media');

async function refreshSocialFeedFromCloud(options = {}) {
  if (!cloudApi.cloudEnabled()) return store.listSocialPosts();
  try {
    const data = await socialApi('listFeed', {
      zone: options.zone || 'all',
      limit: options.limit || 80,
    });
    let list = (data && data.list) || [];
    list = await resolveSocialPosts(list);
    return store.replaceAllSocialPostsFromCloud(list);
  } catch (e) {
    console.warn('[social-cloud-sync] listFeed', e);
    return store.listSocialPosts();
  }
}

async function saveSocialToCloud(payload, postId) {
  if (!cloudApi.cloudEnabled()) {
    throw new Error('云开发未启用');
  }
  if (!hasLoginToken()) {
    throw new Error('请先登录');
  }
  wx.showLoading({ title: '发布中…', mask: true });
  try {
    await ensureCloudSession();
    const uploaded = await uploadSocialMedia(payload);
    const body = { ...uploaded, city: store.getCity() };
    if (postId) body.id = postId;
    const data = await socialApi('save', body);
    const post = (data && data.post) || null;
    if (!post) throw new Error('发布失败');
    store.upsertSocialPostFromCloud(await resolveSocialPostMedia(post));
    if (!postId && !body.lostType) {
      store.pushMessage('动态发布成功', '你的新动态已在宠物社区展示', 'social');
    }
    return post;
  } finally {
    wx.hideLoading();
  }
}

async function removeSocialFromCloud(id) {
  if (!cloudApi.cloudEnabled()) {
    store.deleteSocialPost(id);
    return true;
  }
  await socialApi('remove', { id });
  store.deleteSocialPost(id);
  return true;
}

async function fetchSocialPostFromCloud(id) {
  if (!cloudApi.cloudEnabled() || !id) return null;
  try {
    const data = await socialApi('get', { id });
    let post = data && data.post;
    if (post) {
      post = await resolveSocialPostMedia(post);
      store.upsertSocialPostFromCloud(post);
    }
    return post;
  } catch (e) {
    return null;
  }
}

module.exports = {
  refreshSocialFeedFromCloud,
  saveSocialToCloud,
  removeSocialFromCloud,
  fetchSocialPostFromCloud,
};
