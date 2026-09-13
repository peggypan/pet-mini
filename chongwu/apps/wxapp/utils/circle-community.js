const { MOCK_SOCIAL } = require('./mock');

function findCircle(circleId) {
  return MOCK_SOCIAL.circles.find((c) => String(c.id) === String(circleId)) || null;
}

function collectImagesFromPost(post) {
  const urls = [];
  if (!post) return urls;
  if (post.image) urls.push(post.image);
  if (Array.isArray(post.images)) urls.push(...post.images.filter(Boolean));
  if (Array.isArray(post.mediaList)) {
    post.mediaList
      .filter((m) => m && m.type === 'image' && m.url)
      .forEach((m) => urls.push(m.url));
  }
  return urls;
}

function pickCirclePreviewImages(circle, lastMsg) {
  const images = [];
  collectImagesFromPost(lastMsg).forEach((url) => images.push(url));
  if (!images.length) {
    MOCK_SOCIAL.posts
      .filter((p) => p.circle === circle.name)
      .forEach((p) => collectImagesFromPost(p).forEach((url) => images.push(url)));
  }
  if (!images.length && circle.cover) images.push(circle.cover);
  return [...new Set(images)].slice(0, 3);
}

function seedCircleMessages(circleId) {
  const circle = findCircle(circleId);
  if (!circle) return [];
  const posts = MOCK_SOCIAL.posts.filter((p) => p.circle === circle.name);
  return posts.map((p, idx) => ({
    id: `cm_seed_${circleId}_${idx}`,
    circleId,
    from: 'peer',
    peerId: p.id,
    userName: p.userName,
    petName: p.petName,
    avatar: p.avatar,
    topic: p.topic || '',
    content: p.content,
    mediaList: p.image
      ? [{ type: 'image', url: p.image }]
      : (p.mediaList || []),
    time: p.time || '刚刚',
    createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
  }));
}

function buildFeaturedCommunities(getLastMessage) {
  return MOCK_SOCIAL.circles.map((circle) => {
    const lastMsg = typeof getLastMessage === 'function' ? getLastMessage(circle.id) : null;
    const hotTopic = MOCK_SOCIAL.topics.find((t) => t.hot)?.name || '#携宠露营';
    const previewImages = pickCirclePreviewImages(circle, lastMsg);
    return {
      ...circle,
      lastPreview: lastMsg?.content?.slice(0, 36) || '点击进入社区，和同城宠友聊天互动',
      lastTopic: lastMsg?.topic || hotTopic,
      active: lastMsg?.time || '刚刚活跃',
      previewImages,
      previewImage: previewImages[0] || circle.cover || '',
    };
  });
}

module.exports = {
  findCircle,
  seedCircleMessages,
  buildFeaturedCommunities,
  HOT_TOPICS: MOCK_SOCIAL.topics.map((t) => t.name),
};
