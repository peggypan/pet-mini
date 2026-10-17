const { MOCK_SOCIAL } = require('../../utils/mock');
const store = require('../../utils/store');
const {
  COMMUNITY_ZONES,
  getCommunityZonesList,
  getZoneLabel,
  filterPostsByZone,
  decoratePostZone,
} = require('../../utils/community-zones');
const communityCfg = require('../../utils/community-config-cloud');
const { normalizePostMedia, previewPostMedia } = require('../../utils/social-post-media');
const { withContentParts } = require('../../utils/social-content-parts');
const { openSocialHashtagFilter } = require('../../utils/social-hashtag-nav');
const amap = require('../../utils/amap');
const { decoratePostFollow, followResultToast } = require('../../utils/pet-follow');
const { decoratePostAuthorForViewer } = require('../../utils/social-post-author-display');
const { syncPetProfileGate, requireInteract } = require('../../utils/pet-profile-guard');
const { deleteOwnedSocialPost } = require('../../utils/user-content-delete');
const cloudApi = require('../../utils/cloud-api');
const { refreshSocialFeedFromCloud } = require('../../utils/social-cloud-sync');
const {
  togglePostLikeSynced,
  bumpPostShareSynced,
} = require('../../utils/post-engagement-cloud-sync');
const { withPublishTime } = require('../../utils/relative-time');

Page({
  data: {
    communityZones: COMMUNITY_ZONES,
    hotTopics: MOCK_SOCIAL.topics,
    activeZone: 'all',
    activeZoneLabel: '全部',
    posts: [],
    displayPosts: [],
    city: '北京',
    petProfileBlocked: false,
    hashtagFilter: '',
  },

  onShow() {
    syncPetProfileGate(this);
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const bar = this.getTabBar();
      bar.setData({ selected: 2 });
      if (typeof bar.refreshUnread === 'function') bar.refreshUnread();
    }
    const pendingTab = wx.getStorageSync('social_tab');
    if (pendingTab) {
      wx.removeStorageSync('social_tab');
      if (pendingTab === 'map') {
        wx.navigateTo({ url: '/pages/buddy/buddy' });
      } else if (getCommunityZonesList().some((z) => z.id === pendingTab)) {
        this.setData({ activeZone: pendingTab });
      }
    }
    const pendingZone = wx.getStorageSync('social_zone');
    if (pendingZone) {
      wx.removeStorageSync('social_zone');
      if (getCommunityZonesList().some((z) => z.id === pendingZone)) {
        this.setData({ activeZone: pendingZone });
      }
    }
    const hashtagFromNav = wx.getStorageSync('social_hashtag_filter');
    const showPatch = { city: store.getCity() };
    if (hashtagFromNav) {
      wx.removeStorageSync('social_hashtag_filter');
      showPatch.hashtagFilter = String(hashtagFromNav);
    }
    this.setData(showPatch, () => {
      this.reloadPosts();
    });
    void communityCfg.applyCommunityUiToPage(this);
  },

  onCityTap() {
    wx.navigateTo({ url: '/pages/city-picker/city-picker' });
  },

  buildPostsFromStore() {
    const local = store.listSocialPosts().map((p) => normalizePostMedia(p));
    if (!cloudApi.cloudEnabled()) {
      const mock = MOCK_SOCIAL.posts.map((p) => normalizePostMedia({
        ...p,
        ...(store.getSocialOverride(p.id) || {}),
      }));
      return [...local, ...mock];
    }
    return local;
  },

  applyPostsFromCache() {
    this.setData({ posts: this.buildPostsFromStore() }, () => this.applyDisplayPosts());
  },

  reloadPosts() {
    this.applyPostsFromCache();
    if (!cloudApi.cloudEnabled()) return;
    if (this._socialFeedRefreshPromise) return this._socialFeedRefreshPromise;
    this._socialFeedRefreshPromise = (async () => {
      try {
        await refreshSocialFeedFromCloud({ zone: 'all', limit: 80 });
        this.applyPostsFromCache();
      } catch (e) {
        // keep cache
      } finally {
        this._socialFeedRefreshPromise = null;
      }
    })();
    return this._socialFeedRefreshPromise;
  },

  applyDisplayPosts() {
    const { posts, activeZone, hashtagFilter } = this.data;
    let filtered = filterPostsByZone(posts, activeZone);
    if (hashtagFilter) {
      const tag = String(hashtagFilter);
      filtered = filtered.filter(
        (p) => (p.content && p.content.indexOf(tag) >= 0) || p.topic === tag,
      );
    }
    filtered = filtered
      .map(withPublishTime)
      .map(decoratePostZone)
      .map(withContentParts)
      .map(decoratePostAuthorForViewer)
      .map(decoratePostFollow);
    this.setData({
      displayPosts: filtered,
      activeZoneLabel: getZoneLabel(activeZone),
    });
  },

  onContentHashtagTap(e) {
    const topic = e.currentTarget.dataset.topic;
    openSocialHashtagFilter(topic);
  },

  onClearHashtagFilter() {
    this.setData({ hashtagFilter: '' }, () => this.applyDisplayPosts());
  },

  onPickZone(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || id === this.data.activeZone) return;
    this.setData({ activeZone: id }, () => this.applyDisplayPosts());
  },

  onTopicTap(e) {
    if (!requireInteract()) return;
    const topic = e.currentTarget.dataset.name;
    const zone = this.data.activeZone !== 'all' ? this.data.activeZone : '';
    let url = `/pages/social-post/social-post?topic=${encodeURIComponent(topic)}`;
    if (zone) url += `&zone=${zone}`;
    wx.navigateTo({ url });
  },

  onCreatePost() {
    if (!requireInteract()) return;
    const zone = this.data.activeZone !== 'all' ? this.data.activeZone : '';
    wx.navigateTo({
      url: zone ? `/pages/social-post/social-post?zone=${zone}` : '/pages/social-post/social-post',
    });
  },

  onPostTap(e) {
    wx.navigateTo({ url: `/pages/social-detail/social-detail?id=${e.currentTarget.dataset.id}` });
  },

  onOpenPlace(e) {
    amap.openPlaceFromTap(e);
  },

  onPreviewPostMedia(e) {
    const { id, index } = e.currentTarget.dataset;
    const post = this.data.posts.find((p) => String(p.id) === String(id));
    if (post) previewPostMedia(post, index);
  },

  onFollowAuthor(e) {
    if (!requireInteract()) return;
    const { id, name, pet, avatar } = e.currentTarget.dataset;
    if (!id || id === 'me') return;
    const result = store.toggleFollow({
      id,
      userName: name || '宠友',
      petName: pet || '',
      avatar: avatar || '',
    });
    wx.showToast({ title: followResultToast(result.followed), icon: 'none' });
    this.applyDisplayPosts();
  },

  async onDeletePost(e) {
    const { requireLogin } = require('../../utils/require-login');
    if (!requireLogin()) return;
    const { id } = e.currentTarget.dataset;
    const res = await deleteOwnedSocialPost(id);
    if (!res.ok) {
      if (res.reason && !res.cancelled) wx.showToast({ title: res.reason, icon: 'none' });
      return;
    }
    this.reloadPosts();
  },

  async onLikeTap(e) {
    if (!requireInteract()) return;
    const { id } = e.currentTarget.dataset;
    const target = this.data.posts.find((p) => p.id === id);
    if (!target) return;
    wx.showLoading({ title: '处理中', mask: true });
    try {
      const patch = await togglePostLikeSynced(id, 'social', target);
      store.recordPostThumbLike({
        channel: 'social',
        postId: id,
        liked: patch.liked,
        title: (target.content || target.topic || '社区动态').slice(0, 32),
        cover: target.image || (target.images && target.images[0]) || '',
        userName: target.userName,
        petName: target.petName,
      });
      const posts = this.data.posts.map((p) => (p.id === id ? { ...p, ...patch } : p));
      this.setData({ posts }, () => this.applyDisplayPosts());
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '点赞失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onSharePost(e) {
    const id = e.currentTarget.dataset.id;
    const post = this.data.posts.find((p) => p.id === id);
    if (post) this.setData({ sharePost: post });
  },

  onShareAppMessage() {
    const { sharePost } = this.data;
    if (sharePost) {
      if (!this._shareBumpForPost || this._shareBumpForPost !== sharePost.id) {
        this._shareBumpForPost = sharePost.id;
        bumpPostShareSynced(sharePost.id, 'social', sharePost).then((next) => {
          const posts = this.data.posts.map((p) => (
            p.id === sharePost.id ? { ...p, shares: next.shares } : p
          ));
          this.setData({
            posts,
            sharePost: { ...sharePost, shares: next.shares },
          }, () => this.applyDisplayPosts());
          setTimeout(() => {
            this._shareBumpForPost = '';
          }, 800);
        });
      }
      const topic = sharePost.topic ? `${sharePost.topic} ` : '';
      return {
        title: `${topic}${sharePost.userName}：${(sharePost.content || '').slice(0, 28)}`,
        path: `/pages/social-detail/social-detail?id=${sharePost.id}`,
      };
    }
    return {
      title: '宠头头 · 宠物社区',
      path: '/pages/social/social',
    };
  },
});
