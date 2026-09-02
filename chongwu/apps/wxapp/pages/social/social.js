const { MOCK_SOCIAL } = require('../../utils/mock');
const store = require('../../utils/store');

function normalizePostMedia(post) {
  const mediaList = Array.isArray(post.mediaList) ? post.mediaList.slice() : [];
  if (!mediaList.length) {
    const images = Array.isArray(post.images) ? post.images : [];
    const fallbackImages = images.length ? images : [post.image].filter(Boolean);
    fallbackImages.forEach((url) => mediaList.push({ type: 'image', url }));
  }
  return {
    ...post,
    mediaList,
    imageCount: mediaList.filter((m) => m.type === 'image').length,
    videoCount: mediaList.filter((m) => m.type === 'video').length,
  };
}

function getInviteCode() {
  let code = wx.getStorageSync('my_invite_code');
  if (!code) {
    code = `CTT${Date.now().toString(36).toUpperCase().slice(-6)}`;
    wx.setStorageSync('my_invite_code', code);
  }
  return code;
}

Page({
  data: {
    socialActions: MOCK_SOCIAL.actions,
    socialFilters: MOCK_SOCIAL.filters,
    socialFilter: 'all',
    socialEvents: MOCK_SOCIAL.events.slice(),
    displayEvents: MOCK_SOCIAL.events.slice(),
    socialPosts: [],
    displayPosts: [],
    invite: MOCK_SOCIAL.invite,
    unreadCount: 0,
  },

  onLoad(options) {
    if (options.filter) this.setData({ socialFilter: options.filter });
    this.reloadSocialPosts();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this.reloadSocialPosts();
    this.setData({ unreadCount: store.countUnreadMessages() });
  },

  reloadSocialPosts() {
    const local = store.listSocialPosts();
    const mock = MOCK_SOCIAL.posts.map((p) => {
      const override = store.getSocialOverride(p.id);
      return normalizePostMedia({ ...p, ...(override || {}) });
    });
    const socialPosts = [...local.map((p) => normalizePostMedia(p)), ...mock];
    const filtered = this.applySocialFilter(this.data.socialFilter || 'all', socialPosts);
    this.setData({ socialPosts, ...filtered });
  },

  applySocialFilter(filterId, posts) {
    const socialPosts = posts || this.data.socialPosts;
    const events = this.data.socialEvents;
    let displayPosts = socialPosts;
    let displayEvents = events;

    if (filterId === 'cat' || filterId === 'dog' || filterId === 'other') {
      displayPosts = socialPosts.filter((p) => p.zone === filterId);
      displayEvents = events.filter((e) => e.zone === filterId);
    } else if (filterId === 'event') {
      displayPosts = [];
      displayEvents = events;
    }

    return { displayPosts, displayEvents };
  },

  onSocialFilter(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ socialFilter: id, ...this.applySocialFilter(id) });
  },

  onSocialAction(e) {
    const { type } = e.currentTarget.dataset;
    if (type === 'post') {
      wx.navigateTo({ url: '/pages/social-post/social-post' });
      return;
    }
    if (type === 'event') {
      this.setData({ socialFilter: 'event', ...this.applySocialFilter('event') });
      return;
    }
    if (type === 'nearby') {
      wx.switchTab({ url: '/pages/discover/discover' });
      return;
    }
    if (type === 'topic') {
      wx.switchTab({ url: '/pages/discover/discover' });
    }
  },

  onCreatePost() {
    wx.navigateTo({ url: '/pages/social-post/social-post' });
  },

  onMessagesTap() {
    wx.switchTab({ url: '/pages/messages/messages' });
  },

  onPostTap(e) {
    wx.navigateTo({ url: `/pages/social-detail/social-detail?id=${e.currentTarget.dataset.id}` });
  },

  onCommentTap(e) {
    wx.navigateTo({ url: `/pages/social-detail/social-detail?id=${e.currentTarget.dataset.id}` });
  },

  onLikeTap(e) {
    const { id } = e.currentTarget.dataset;
    const socialPosts = this.data.socialPosts.map((p) => {
      if (p.id !== id) return p;
      const liked = !p.liked;
      const likes = liked ? (p.likes || 0) + 1 : Math.max(0, (p.likes || 0) - 1);
      const patch = { liked, likes };
      store.updateSocialPost(id, patch);
      return { ...p, ...patch };
    });
    this.setData({
      socialPosts,
      ...this.applySocialFilter(this.data.socialFilter, socialPosts),
    });
  },

  onShareTap(e) {
    const { id } = e.currentTarget.dataset;
    const socialPosts = this.data.socialPosts.map((p) => {
      if (p.id !== id) return p;
      const shares = (p.shares || 0) + 1;
      store.updateSocialPost(id, { shares });
      return { ...p, shares };
    });
    this.setData({
      socialPosts,
      ...this.applySocialFilter(this.data.socialFilter, socialPosts),
    });
  },

  onEventTap(e) {
    wx.navigateTo({ url: `/pages/event-detail/event-detail?id=${e.currentTarget.dataset.id}` });
  },

  onInviteTap() {
    wx.showModal({
      title: this.data.invite.rewardTitle,
      content: this.data.invite.rewardDesc,
      confirmText: '去分享',
      showCancel: false,
    });
  },

  onShareAppMessage() {
    const invite = getInviteCode();
    const { invite: inviteCfg } = this.data;
    return {
      title: inviteCfg.shareTitle,
      path: `/pages/social/social?invite=${invite}`,
    };
  },
});
