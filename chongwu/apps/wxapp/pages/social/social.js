const { MOCK_SOCIAL } = require('../../utils/mock');
const store = require('../../utils/store');
const { buildFeaturedCommunities } = require('../../utils/circle-community');

function normalizePostMedia(post) {
  const mediaList = Array.isArray(post.mediaList) ? post.mediaList.slice() : [];
  if (!mediaList.length) {
    const images = Array.isArray(post.images) ? post.images : [];
    const fallbackImages = images.length ? images : [post.image].filter(Boolean);
    fallbackImages.forEach((url) => mediaList.push({ type: 'image', url }));
  }
  return { ...post, mediaList };
}

Page({
  data: {
    innerTab: 'all',
    innerTabs: MOCK_SOCIAL.innerTabs,
    circles: MOCK_SOCIAL.circles,
    topics: MOCK_SOCIAL.topics,
    qaList: MOCK_SOCIAL.qaList,
    featuredCommunities: [],
    posts: [],
    displayPosts: [],
    city: '北京',
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    const pendingTab = wx.getStorageSync('social_tab');
    if (pendingTab) {
      wx.removeStorageSync('social_tab');
      this.setData({ innerTab: pendingTab });
    }
    this.setData({ city: store.getCity() });
    this.reloadPosts();
    this.reloadFeatured();
  },

  onCityTap() {
    wx.navigateTo({ url: '/pages/city-picker/city-picker' });
  },

  reloadPosts() {
    const local = store.listSocialPosts().map((p) => normalizePostMedia(p));
    const mock = MOCK_SOCIAL.posts.map((p) => normalizePostMedia({ ...p, ...(store.getSocialOverride(p.id) || {}) }));
    const posts = [...local, ...mock];
    this.setData({ posts, displayPosts: posts });
  },

  reloadFeatured() {
    const featuredCommunities = buildFeaturedCommunities((circleId) => store.getCircleLastMessage(circleId));
    this.setData({ featuredCommunities });
  },

  onInnerTab(e) {
    this.setData({ innerTab: e.currentTarget.dataset.id });
  },

  onCreatePost() {
    wx.navigateTo({ url: '/pages/social-post/social-post' });
  },

  onPostTap(e) {
    wx.navigateTo({ url: `/pages/social-detail/social-detail?id=${e.currentTarget.dataset.id}` });
  },

  onLikeTap(e) {
    const { id } = e.currentTarget.dataset;
    const posts = this.data.posts.map((p) => {
      if (p.id !== id) return p;
      const liked = !p.liked;
      const likes = liked ? (p.likes || 0) + 1 : Math.max(0, (p.likes || 0) - 1);
      store.updateSocialPost(id, { liked, likes });
      return { ...p, liked, likes };
    });
    this.setData({ posts, displayPosts: posts });
  },

  onSharePost(e) {
    const id = e.currentTarget.dataset.id;
    const post = this.data.posts.find((p) => p.id === id);
    if (post) this.setData({ sharePost: post });
  },

  onEnterCircle(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/circle-community/circle-community?id=${id}` });
  },

  onTopicTap(e) {
    const topic = e.currentTarget.dataset.name;
    wx.navigateTo({ url: `/pages/social-post/social-post?topic=${encodeURIComponent(topic)}` });
  },

  onCircleTap(e) {
    this.onEnterCircle(e);
  },

  onShareAppMessage() {
    const { sharePost } = this.data;
    if (sharePost) {
      const topic = sharePost.topic ? `${sharePost.topic} ` : '';
      return {
        title: `${topic}${sharePost.userName}：${(sharePost.content || '').slice(0, 28)}`,
        path: `/pages/social-detail/social-detail?id=${sharePost.id}`,
      };
    }
    return {
      title: '宠头头 · 社区精选',
      path: '/pages/social/social',
    };
  },
});
