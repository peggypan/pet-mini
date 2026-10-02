const cloudApi = require('./cloud-api');
const store = require('./store');

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

async function uploadBuddyMedia(payload) {
  const next = { ...payload };
  next.avatar = await resolveUrl(next.avatar, 'buddy');
  next.cover = await resolveUrl(next.cover, 'buddy');
  const mediaList = Array.isArray(next.mediaList) ? next.mediaList : [];
  next.mediaList = await Promise.all(
    mediaList.map(async (item) => {
      if (!item || typeof item !== 'object') return item;
      const url = await resolveUrl(item.url, 'buddy');
      const poster = item.type === 'video' ? await resolveUrl(item.poster || item.url, 'buddy') : '';
      return item.type === 'video'
        ? { ...item, url, poster: poster || url }
        : { ...item, url };
    }),
  );
  next.images = next.mediaList.filter((m) => m.type === 'image').map((m) => m.url);
  if (!next.cover && next.images[0]) next.cover = next.images[0];
  return next;
}

const { hasLoginToken, ensureCloudSession } = require('./cloud-session');
const { resolveBuddyPosts } = require('./cloud-media');

async function refreshBuddyFeedFromCloud(options = {}) {
  if (!cloudApi.cloudEnabled()) return store.listBuddyPosts();
  try {
    const data = await cloudApi.listBuddyFeed({
      zone: options.zone || 'all',
      limit: options.limit || 80,
    });
    let list = (data && data.list) || [];
    list = await resolveBuddyPosts(list);
    return store.replaceAllBuddyPostsFromCloud(list);
  } catch (e) {
    console.warn('[buddy-cloud-sync] listFeed', e);
    return store.listBuddyPosts();
  }
}

async function saveBuddyToCloud(payload, postId) {
  if (!cloudApi.cloudEnabled()) {
    throw new Error('云开发未启用');
  }
  if (!hasLoginToken()) {
    throw new Error('请先登录');
  }
  wx.showLoading({ title: '发布中…', mask: true });
  try {
    await ensureCloudSession();
    const uploaded = await uploadBuddyMedia(payload);
    const body = { ...uploaded };
    if (postId) body.id = postId;
    const data = await cloudApi.saveBuddyPost(body);
    const buddy = (data && data.buddy) || null;
    if (!buddy) throw new Error('发布失败');
    const { resolveBuddyPostMedia } = require('./cloud-media');
    store.upsertBuddyPostFromCloud(await resolveBuddyPostMedia(buddy));
    if (!postId) {
      store.pushMessage('搭子发布成功', '你的找搭子已展示在搭子广场', 'social');
    }
    return buddy;
  } finally {
    wx.hideLoading();
  }
}

async function removeBuddyFromCloud(id) {
  if (!cloudApi.cloudEnabled()) {
    store.deleteBuddyPost(id);
    return true;
  }
  await cloudApi.removeBuddyPost(id);
  store.deleteBuddyPost(id);
  return true;
}

module.exports = {
  refreshBuddyFeedFromCloud,
  saveBuddyToCloud,
  removeBuddyFromCloud,
};
