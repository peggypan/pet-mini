const { chooseMedia } = require('./choose-media');

const MAX_IMAGES = 6;
const MAX_VIDEOS = 3;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_DURATION = 60;

const MEDIA_LIMIT_HINT = '最多 6 张图片、3 段视频（单段视频 ≤60 秒）';

function mediaCounts(list) {
  const items = list || [];
  return {
    images: items.filter((m) => m.type === 'image').length,
    videos: items.filter((m) => m.type === 'video').length,
  };
}

function mediaSlots(list) {
  const { images, videos } = mediaCounts(list);
  const imagesLeft = Math.max(0, MAX_IMAGES - images);
  const videosLeft = Math.max(0, MAX_VIDEOS - videos);
  return {
    imagesLeft,
    videosLeft,
    canAddAny: imagesLeft > 0 || videosLeft > 0,
    summary: `${images}/${MAX_IMAGES} 图 · ${videos}/${MAX_VIDEOS} 视频`,
  };
}

function fileToMediaItem(file) {
  const isVideo = file.fileType === 'video';
  if (isVideo) {
    return {
      type: 'video',
      url: file.tempFilePath,
      poster: file.thumbTempFilePath || '',
      duration: file.duration || 0,
    };
  }
  return {
    type: 'image',
    url: file.tempFilePath,
  };
}

function appendMediaFiles(currentList, tempFiles) {
  const list = [...(currentList || [])];
  let { images, videos } = mediaCounts(list);
  let skipped = 0;

  (tempFiles || []).forEach((file) => {
    const isVideo = file.fileType === 'video';
    if (isVideo) {
      if (videos >= MAX_VIDEOS) {
        skipped += 1;
        return;
      }
      if (file.size && file.size > MAX_VIDEO_BYTES) {
        skipped += 1;
        return;
      }
      list.push(fileToMediaItem(file));
      videos += 1;
      return;
    }
    if (images >= MAX_IMAGES) {
      skipped += 1;
      return;
    }
    list.push(fileToMediaItem(file));
    images += 1;
  });

  return { list, skipped };
}

function pickMixedMedia(currentList, options = {}) {
  const mediaType = options.mediaType || ['image', 'video'];
  const imageOnly = mediaType.length === 1 && mediaType[0] === 'image';
  const slots = mediaSlots(currentList);

  if (imageOnly) {
    if (slots.imagesLeft <= 0) {
      wx.showToast({ title: `最多 ${MAX_IMAGES} 张图片`, icon: 'none' });
      return Promise.reject(new Error('media:limit'));
    }
  } else if (!slots.canAddAny) {
    wx.showToast({ title: '已达上限（6 图 + 3 视频）', icon: 'none' });
    return Promise.reject(new Error('media:limit'));
  }

  const maxPick = options.count || 9;
  const pickCount = imageOnly
    ? Math.min(slots.imagesLeft, maxPick)
    : Math.min(9, slots.imagesLeft + slots.videosLeft, maxPick);

  return chooseMedia({
    count: pickCount,
    mediaType,
    sourceType: options.sourceType || ['album', 'camera'],
    sizeType: ['compressed'],
    maxDuration: MAX_VIDEO_DURATION,
  }).then((res) => {
    const { list, skipped } = appendMediaFiles(currentList, res.tempFiles || []);
    if (skipped > 0) {
      wx.showToast({ title: '部分文件超出上限未添加', icon: 'none' });
    }
    if (list.length === (currentList || []).length) {
      wx.showToast({ title: '未添加新媒体', icon: 'none' });
    }
    return list;
  });
}

module.exports = {
  MAX_IMAGES,
  MAX_VIDEOS,
  MEDIA_LIMIT_HINT,
  mediaCounts,
  mediaSlots,
  appendMediaFiles,
  pickMixedMedia,
};
