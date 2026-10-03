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
  downloadCloudFileToTemp,
  resolveCloudFileUrl,
  batchResolveCloudFileUrls,
  resolveCloudFileUrls,
  resolveBuddyPostMedia,
  resolveBuddyPosts,
  resolveSocialPostMedia,
  resolveSocialPosts,
  resolvePetMedia,
  resolvePets,
};
