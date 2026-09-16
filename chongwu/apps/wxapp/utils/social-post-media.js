function normalizePostMedia(post) {
  if (!post) return post;
  const mediaList = Array.isArray(post.mediaList) ? post.mediaList.slice() : [];
  if (!mediaList.length) {
    const images = Array.isArray(post.images) ? post.images : [];
    const fallbackImages = images.length ? images : [post.image].filter(Boolean);
    fallbackImages.forEach((url) => mediaList.push({ type: 'image', url }));
  }
  return {
    ...post,
    mediaList,
    imageList: mediaList.filter((m) => m.type === 'image').map((m) => m.url),
    videoList: mediaList.filter((m) => m.type === 'video'),
  };
}

function previewPostMedia(post, index) {
  const list = post?.mediaList || [];
  const item = list[Number(index)];
  if (!item) return;
  if (item.type === 'video') {
    if (!item.url) {
      wx.showToast({ title: '视频暂不可播放', icon: 'none' });
      return;
    }
    wx.previewMedia({
      sources: [{ url: item.url, type: 'video', poster: item.poster || '' }],
    });
    return;
  }
  const images = list.filter((m) => m.type === 'image').map((m) => m.url);
  wx.previewImage({ urls: images.length ? images : [item.url], current: item.url });
}

module.exports = {
  normalizePostMedia,
  previewPostMedia,
};
