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
    socialActions: MOCK_SOCIAL.actions.slice(),
    socialFilters: MOCK_SOCIAL.filters.slice(),
    socialFilter: 'all',
    socialEvents: MOCK_SOCIAL.events.slice(),
    displayEvents: MOCK_SOCIAL.events.slice(),
    socialPosts: [],
    displayPosts: [],
    invite: { ...MOCK_SOCIAL.invite },
    sharePanelVisible: false,
    sharePostId: '',
  },

  onLoad(options) {
    if (options.filter) {
      this.setData({ socialFilter: options.filter });
    }
    this.reloadSocialPosts();
  },

  onShow() {
    this.reloadSocialPosts();
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
      this.setData({ socialFilter: 'all', ...this.applySocialFilter('all') });
      wx.showToast({ title: '已展示同城动态', icon: 'none' });
      return;
    }
    if (type === 'topic') {
      wx.showModal({
        title: '话题广场',
        content: '热门话题：#周末遛狗 #换粮经验 #幼宠适应（演示）',
        showCancel: false,
      });
    }
  },

  onCreatePost() {
    wx.navigateTo({ url: '/pages/social-post/social-post' });
  },

  onLostTap() {
    wx.navigateTo({ url: '/pages/lost-publish/lost-publish' });
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
    this.setData({ sharePostId: id || '' });
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
    const { id } = e.currentTarget.dataset;
    const event = this.data.socialEvents.find((x) => x.id === id);
    if (!event) return;
    wx.showModal({
      title: event.title,
      content: `${event.place} · ${event.fee} · ${event.require}\n确认报名参加？`,
      confirmText: '报名',
      success: (res) => {
        if (!res.confirm) return;
        const result = store.addEventSignup(event);
        wx.showToast({
          title: result.duplicated ? '已报名过该活动' : '报名成功',
          icon: result.duplicated ? 'none' : 'success',
        });
      },
    });
  },

  onChatTap() {
    wx.showModal({
      title: '私信',
      content: '演示环境暂未开通即时聊天，可通过活动报名或服务预约联系对方。',
      showCancel: false,
    });
  },

  onInviteTap() {
    this.setData({ sharePanelVisible: true, sharePostId: '' });
  },

  onInviteShareReady() {
    this.setData({ sharePostId: '' });
  },

  onCloseSharePanel() {
    this.setData({ sharePanelVisible: false });
  },

  noop() {},

  onShareAppMessage() {
    const invite = getInviteCode();
    const { sharePostId, socialPosts, invite: inviteCfg } = this.data;
    const post = socialPosts.find((p) => p.id === sharePostId);
    const title = post
      ? `${post.userName}：${post.content.slice(0, 28)}…`
      : (inviteCfg.shareTitle || '宠头头交友广场');
    const path = post
      ? `/pages/social-detail/social-detail?id=${post.id}&invite=${invite}`
      : `/pages/social/social?invite=${invite}`;
    return { title, path };
  },
});
