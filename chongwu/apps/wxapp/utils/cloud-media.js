const urlCache = {};

function isCloudFileId(url) {
  return typeof url === 'string' && url.startsWith('cloud://');
}

function isLocalDevPath(url) {
  if (!url || typeof url !== 'string') return false;
  return (
    url.startsWith('wxfile://')
    || url.startsWith('http://tmp/')
    || url.startsWith('https://tmp/')
    || url.startsWith('http://127.0.0.1')
  );
}

/** 选图后的本地临时路径需 uploadFile，已是 cloud:// 或公网 https 则跳过 */
function needsCloudUpload(path) {
  if (!path || typeof path !== 'string') return false;
  if (path.startsWith('cloud://')) return false;
  if (path.startsWith('/assets/')) return false;
  if (isLocalDevPath(path)) return true;
  if (path.startsWith('https://') || path.startsWith('http://')) return false;
  return true;
}

async function resolveCloudFileUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (!isCloudFileId(url)) return url;
  if (urlCache[url]) return urlCache[url];
  if (!wx.cloud || !wx.cloud.getTempFileURL) return url;
  try {
    const res = await wx.cloud.getTempFileURL({ fileList: [url] });
    const item = (res.fileList && res.fileList[0]) || {};
    const temp = item.tempFileURL || url;
    if (item.status === 0 && temp) {
      urlCache[url] = temp;
      return temp;
    }
  } catch (e) {
    console.warn('[cloud-media] getTempFileURL', url, e);
  }
  return url;
}

async function resolveCloudFileUrls(urls) {
  const list = Array.isArray(urls) ? urls : [];
  return Promise.all(list.map((u) => resolveCloudFileUrl(u)));
}

async function resolveMediaItem(item) {
  if (!item || typeof item !== 'object') return item;
  const next = { ...item };
  if (next.url) next.url = await resolveCloudFileUrl(next.url);
  if (next.poster) next.poster = await resolveCloudFileUrl(next.poster);
  return next;
}

async function resolveBuddyPostMedia(post) {
  if (!post) return post;
  const next = { ...post };
  next.cover = await resolveCloudFileUrl(next.cover);
  next.avatar = await resolveCloudFileUrl(next.avatar);
  next.image = await resolveCloudFileUrl(next.image);
  if (Array.isArray(next.images)) {
    next.images = await resolveCloudFileUrls(next.images);
  }
  if (Array.isArray(next.mediaList)) {
    next.mediaList = await Promise.all(next.mediaList.map((m) => resolveMediaItem(m)));
  }
  return next;
}

async function resolveBuddyPosts(list) {
  return Promise.all((list || []).map((p) => resolveBuddyPostMedia(p)));
}

async function resolveSocialPostMedia(post) {
  if (!post) return post;
  const next = { ...post };
  next.image = await resolveCloudFileUrl(next.image);
  next.avatar = await resolveCloudFileUrl(next.avatar);
  if (Array.isArray(next.images)) {
    next.images = await resolveCloudFileUrls(next.images);
  }
  if (Array.isArray(next.mediaList)) {
    next.mediaList = await Promise.all(next.mediaList.map((m) => resolveMediaItem(m)));
  }
  return next;
}

async function resolveSocialPosts(list) {
  return Promise.all((list || []).map((p) => resolveSocialPostMedia(p)));
}

async function resolvePetMedia(pet) {
  if (!pet) return pet;
  const next = { ...pet };
  next.avatar = await resolveCloudFileUrl(next.avatar || next.avatarUrl);
  next.avatarUrl = await resolveCloudFileUrl(next.avatarUrl || next.avatar);
  next.cover = await resolveCloudFileUrl(next.cover);
  next.vaccineProofUrl = await resolveCloudFileUrl(next.vaccineProofUrl);
  if (Array.isArray(next.galleryPhotos)) {
    next.galleryPhotos = await resolveCloudFileUrls(next.galleryPhotos);
  }
  return next;
}

async function resolvePets(list) {
  return Promise.all((list || []).map((p) => resolvePetMedia(p)));
}

module.exports = {
  isCloudFileId,
  isLocalDevPath,
  needsCloudUpload,
  resolveCloudFileUrl,
  resolveCloudFileUrls,
  resolveBuddyPostMedia,
  resolveBuddyPosts,
  resolveSocialPostMedia,
  resolveSocialPosts,
  resolvePetMedia,
  resolvePets,
};
