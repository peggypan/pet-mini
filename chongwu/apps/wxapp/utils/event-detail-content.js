const MAX_COVER_IMAGES = 6;
const MAX_DETAIL_IMAGES = 6;

function normalizeEventMedia(event) {
  if (!event) return [];
  if (Array.isArray(event.mediaList) && event.mediaList.length) {
    return event.mediaList.filter((m) => m && m.url);
  }
  if (Array.isArray(event.images) && event.images.length) {
    return event.images.filter(Boolean).map((url) => ({ type: 'image', url }));
  }
  return [];
}

/** 头图轮播：最多 6 张，封面优先 */
function buildEventCoverImages(event) {
  if (!event) return [];
  const media = normalizeEventMedia(event);
  const urls = [];
  const seen = new Set();
  const push = (url) => {
    const u = String(url || '').trim();
    if (!u || seen.has(u) || urls.length >= MAX_COVER_IMAGES) return;
    seen.add(u);
    urls.push(u);
  };
  push(event.cover);
  media
    .filter((m) => m.type === 'image')
    .forEach((m) => push(m.url));
  return urls;
}

function normalizeDetailMedia(event) {
  if (!event) return [];
  if (Array.isArray(event.detailMediaList) && event.detailMediaList.length) {
    return event.detailMediaList.filter((m) => m && m.url);
  }
  if (Array.isArray(event.detailImages) && event.detailImages.length) {
    return event.detailImages.filter(Boolean).map((url) => ({ type: 'image', url }));
  }
  return [];
}

/** 「活动详情」区配图，最多 6 张 */
function buildEventDetailImages(event) {
  const urls = [];
  const seen = new Set();
  normalizeDetailMedia(event)
    .filter((m) => m.type === 'image')
    .forEach((m) => {
      const u = String(m.url || '').trim();
      if (!u || seen.has(u) || urls.length >= MAX_DETAIL_IMAGES) return;
      seen.add(u);
      urls.push(u);
    });
  return urls;
}

/**
 * 详情页下方「活动详情」：detailContent + detailMediaList；头图视频仍在下方列表
 */
function buildEventDetailSection(event) {
  if (!event) {
    return { show: false, text: '', images: [], media: [] };
  }
  const mainMedia = normalizeEventMedia(event);
  const videos = mainMedia.filter((m) => m.type === 'video');
  const detailContent = String(event.detailContent || '').trim();
  const images = buildEventDetailImages(event);
  const show = !!(detailContent || images.length || videos.length);
  return { show, text: detailContent, images, media: videos };
}

module.exports = {
  MAX_COVER_IMAGES,
  MAX_DETAIL_IMAGES,
  normalizeEventMedia,
  normalizeDetailMedia,
  buildEventCoverImages,
  buildEventDetailImages,
  buildEventDetailSection,
};
