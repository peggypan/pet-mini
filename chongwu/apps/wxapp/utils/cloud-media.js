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

function downloadCloudFileToTemp(fileID) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || !wx.cloud.downloadFile) {
      reject(new Error('cloud unavailable'));
      return;
    }
    wx.cloud.downloadFile({
      fileID,
      success: (res) => {
        if (res.tempFilePath) resolve(res.tempFilePath);
        else reject(new Error('empty tempFilePath'));
      },
      fail: reject,
    });
  });
}

async function resolveCloudFileUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (!isCloudFileId(url)) return url;
  if (urlCache[url]) return urlCache[url];
  if (wx.cloud && wx.cloud.getTempFileURL) {
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: [url] });
      const item = (res.fileList && res.fileList[0]) || {};
      const temp = item.tempFileURL || '';
      if (item.status === 0 && temp) {
        urlCache[url] = temp;
        return temp;
      }
      if (item.status !== 0) {
        console.warn('[cloud-media] getTempFileURL status', item.status, item.errMsg || '');
      }
    } catch (e) {
      console.warn('[cloud-media] getTempFileURL', url, e);
    }
  }
  try {
    const local = await downloadCloudFileToTemp(url);
    urlCache[url] = local;
    return local;
  } catch (e) {
    console.warn('[cloud-media] downloadFile', url, e);
  }
  return url;
}

/** 批量换链，供聊天列表等场景 */
async function batchResolveCloudFileUrls(fileIds) {
  const map = {};
  const ids = [...new Set((fileIds || []).filter(isCloudFileId))];
  if (!ids.length) return map;
  const pending = [];
  ids.forEach((id) => {
    if (urlCache[id]) map[id] = urlCache[id];
    else pending.push(id);
  });
  if (pending.length && wx.cloud && wx.cloud.getTempFileURL) {
    for (let i = 0; i < pending.length; i += 50) {
      const chunk = pending.slice(i, i + 50);
      try {
        const res = await wx.cloud.getTempFileURL({ fileList: chunk });
        (res.fileList || []).forEach((item) => {
          if (item.fileID && item.status === 0 && item.tempFileURL) {
            urlCache[item.fileID] = item.tempFileURL;
            map[item.fileID] = item.tempFileURL;
          }
        });
      } catch (e) {
        console.warn('[cloud-media] batch getTempFileURL', e);
      }
    }
  }
  const needDownload = pending.filter((id) => !map[id]);
  await Promise.all(
    needDownload.map(async (id) => {
      try {
        const local = await downloadCloudFileToTemp(id);
        urlCache[id] = local;
        map[id] = local;
      } catch (e) {
        console.warn('[cloud-media] batch download', id, e);
      }
    }),
  );
  return map;
}

async function resolveCloudFileUrls(urls) {
  const list = Array.isArray(urls) ? urls : [];
  return Promise.all(list.map((u) => resolveCloudFileUrl(u)));
}

function pickResolvedUrl(url, map) {
  if (!url || typeof url !== 'string') return url || '';
  if (isCloudFileId(url)) return map[url] || urlCache[url] || url;
  return url;
}

function collectBuddyPostFileIds(post) {
  if (!post) return [];
  const ids = [];
  const push = (u) => {
    if (isCloudFileId(u)) ids.push(u);
  };
  push(post.cover);
  push(post.avatar);
  push(post.image);
  (post.images || []).forEach(push);
  (post.mediaList || []).forEach((m) => {
    if (m && typeof m === 'object') {
      push(m.url);
      push(m.poster);
    }
  });
  return ids;
}

function applyUrlMapToBuddyPost(post, map) {
  if (!post) return post;
  const next = { ...post };
  next.cover = pickResolvedUrl(next.cover, map);
  next.avatar = pickResolvedUrl(next.avatar, map);
  next.image = pickResolvedUrl(next.image, map);
  if (Array.isArray(next.images)) {
    next.images = next.images.map((u) => pickResolvedUrl(u, map));
  }
  if (Array.isArray(next.mediaList)) {
    next.mediaList = next.mediaList.map((m) => {
      if (!m || typeof m !== 'object') return m;
      return {
        ...m,
        url: pickResolvedUrl(m.url, map),
        poster: pickResolvedUrl(m.poster, map),
      };
    });
  }
  return next;
}

async function resolveMediaItem(item) {
  if (!item || typeof item !== 'object') return item;
  const next = { ...item };
  if (next.url) next.url = await resolveCloudFileUrl(next.url);
  if (next.poster) next.poster = await resolveCloudFileUrl(next.poster);
  return next;
}

async function resolveBuddyPostMedia(post) {
  const [resolved] = await resolveBuddyPosts([post]);
  return resolved;
}

async function resolveBuddyPosts(list) {
  const posts = (list || []).map((p) => ({ ...p }));
  const fileIds = [...new Set(posts.flatMap(collectBuddyPostFileIds))];
  if (!fileIds.length) return posts;
  const map = await batchResolveCloudFileUrls(fileIds);
  return posts.map((p) => applyUrlMapToBuddyPost(p, map));
}

function collectSocialPostFileIds(post) {
  if (!post) return [];
  const ids = [];
  const push = (u) => {
    if (isCloudFileId(u)) ids.push(u);
  };
  push(post.image);
  push(post.avatar);
  (post.images || []).forEach(push);
  (post.mediaList || []).forEach((m) => {
    if (m && typeof m === 'object') {
      push(m.url);
      push(m.poster);
    }
  });
  return ids;
}

function applyUrlMapToSocialPost(post, map) {
  if (!post) return post;
  const next = { ...post };
  next.image = pickResolvedUrl(next.image, map);
  next.avatar = pickResolvedUrl(next.avatar, map);
  if (Array.isArray(next.images)) {
    next.images = next.images.map((u) => pickResolvedUrl(u, map));
  }
  if (Array.isArray(next.mediaList)) {
    next.mediaList = next.mediaList.map((m) => {
      if (!m || typeof m !== 'object') return m;
      return {
        ...m,
        url: pickResolvedUrl(m.url, map),
        poster: pickResolvedUrl(m.poster, map),
      };
    });
  }
  return next;
}

async function resolveSocialPostMedia(post) {
  const [resolved] = await resolveSocialPosts([post]);
  return resolved;
}

async function resolveSocialPosts(list) {
  const posts = (list || []).map((p) => ({ ...p }));
  const fileIds = [...new Set(posts.flatMap(collectSocialPostFileIds))];
  if (!fileIds.length) return posts;
  const map = await batchResolveCloudFileUrls(fileIds);
  return posts.map((p) => applyUrlMapToSocialPost(p, map));
}

function collectLocalPostFileIds(post) {
  if (!post) return [];
  const ids = [];
  const push = (u) => {
    if (isCloudFileId(u)) ids.push(u);
  };
  push(post.image);
  push(post.cover);
  (post.images || []).forEach(push);
  (post.mediaList || []).forEach((m) => {
    if (m && typeof m === 'object') {
      push(m.url);
      push(m.poster);
    }
  });
  return ids;
}

function applyUrlMapToLocalPost(post, map) {
  if (!post) return post;
  const next = { ...post };
  next.image = pickResolvedUrl(next.image, map);
  next.cover = pickResolvedUrl(next.cover, map);
  if (Array.isArray(next.images)) {
    next.images = next.images.map((u) => pickResolvedUrl(u, map));
  }
  if (Array.isArray(next.mediaList)) {
    next.mediaList = next.mediaList.map((m) => {
      if (!m || typeof m !== 'object') return m;
      return {
        ...m,
        url: pickResolvedUrl(m.url, map),
        poster: pickResolvedUrl(m.poster, map),
      };
    });
  }
  return next;
}

async function resolveLocalPosts(list) {
  const posts = (list || []).map((p) => ({ ...p }));
  const fileIds = [...new Set(posts.flatMap(collectLocalPostFileIds))];
  if (!fileIds.length) return posts;
  const map = await batchResolveCloudFileUrls(fileIds);
  return posts.map((p) => applyUrlMapToLocalPost(p, map));
}

function collectPetFileIds(pet) {
  if (!pet) return [];
  const ids = [];
  const push = (u) => {
    if (isCloudFileId(u)) ids.push(u);
  };
  push(pet.avatar);
  push(pet.avatarUrl);
  push(pet.cover);
  push(pet.vaccineProofUrl);
  (pet.galleryPhotos || []).forEach(push);
  return ids;
}

function applyUrlMapToPet(pet, map) {
  if (!pet) return pet;
  const next = { ...pet };
  next.avatar = pickResolvedUrl(next.avatar || next.avatarUrl, map);
  next.avatarUrl = pickResolvedUrl(next.avatarUrl || next.avatar, map);
  next.cover = pickResolvedUrl(next.cover, map);
  next.vaccineProofUrl = pickResolvedUrl(next.vaccineProofUrl, map);
  if (Array.isArray(next.galleryPhotos)) {
    next.galleryPhotos = next.galleryPhotos.map((u) => pickResolvedUrl(u, map));
  }
  return next;
}

async function resolvePetMedia(pet) {
  const [resolved] = await resolvePets([pet]);
  return resolved;
}

async function resolvePets(list) {
  const pets = (list || []).map((p) => ({ ...p }));
  const fileIds = [...new Set(pets.flatMap(collectPetFileIds))];
  if (!fileIds.length) return pets;
  const map = await batchResolveCloudFileUrls(fileIds);
  return pets.map((p) => applyUrlMapToPet(p, map));
}

module.exports = {
  isCloudFileId,
  isLocalDevPath,
  needsCloudUpload,
  downloadCloudFileToTemp,
  resolveCloudFileUrl,
  batchResolveCloudFileUrls,
  resolveCloudFileUrls,
  resolveBuddyPostMedia,
  resolveBuddyPosts,
  resolveSocialPostMedia,
  resolveSocialPosts,
  resolveLocalPosts,
  resolvePetMedia,
  resolvePets,
};
