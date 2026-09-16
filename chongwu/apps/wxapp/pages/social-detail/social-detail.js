const { findSocialPost } = require('../../utils/catalog');
const store = require('../../utils/store');
const { MOCK_PET } = require('../../utils/mock');
const { openEventPublishEntry } = require('../../utils/event-publish-nav');
const {
  chooseLocationPoint,
  pickAaAmount,
  openActivityShare,
  locationSnippet,
} = require('../../utils/chat-tool-actions');
const amap = require('../../utils/amap');
const { chooseMedia } = require('../../utils/choose-media');
const { normalizePostMedia } = require('../../utils/social-post-media');

const ZONE_MAP = {
  cat: '猫咪专区',
  dog: '狗狗专区',
  other: '异宠',
};

Page({
  data: {
    postId: '',
    post: null,
    zoneLabel: '',
    commentList: [],
    commentText: '',
    panelTools: false,
    panelEmoji: false,
    pendingMedia: null,
  },

  onLoad(options) {
    const postId = options.id || '';
    this.setData({ postId });
    this.loadPost(postId);
  },

  onShow() {
    if (this.data.postId) this.loadPost(this.data.postId);
  },

  loadPost(postId) {
    const found = findSocialPost(postId);
    const post = found ? normalizePostMedia(found) : null;
    if (!post) {
      this.setData({ post: null });
      return;
    }
    const comments = store.listPostComments(postId);
    this.setData({
      post: {
        ...post,
        comments: Math.max(post.comments || 0, comments.length),
      },
      zoneLabel: ZONE_MAP[post.zone] || '交友广场',
      commentList: comments,
    });
  },

  onPreviewImage(e) {
    const { src } = e.currentTarget.dataset;
    let urls = (this.data.post?.mediaList || [])
      .filter((m) => m.type === 'image')
      .map((m) => m.url);
    if (!urls.length && src) urls = [src];
    if (!urls.length) return;
    wx.previewImage({ current: src || urls[0], urls });
  },

  onPreviewCommentImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  },

  onPreviewCommentVideo(e) {
    const { url, poster } = e.currentTarget.dataset;
    wx.previewMedia({ sources: [{ url, type: 'video', poster }] });
  },

  onLike() {
    const { post, postId } = this.data;
    if (!post) return;
    const liked = !post.liked;
    const likes = liked ? (post.likes || 0) + 1 : Math.max(0, (post.likes || 0) - 1);
    const patch = { liked, likes };
    store.updateSocialPost(postId, patch);
    this.setData({ post: { ...post, ...patch } });
  },

  onComposerInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  onPanelChange(e) {
    const { showTools, showEmoji } = e.detail;
    this.setData({ panelTools: showTools, panelEmoji: showEmoji });
  },

  onComposerTool(e) {
    const { action } = e.detail;
    if (action === 'photo') {
      this.pickMedia('image', ['album']);
      return;
    }
    if (action === 'camera') {
      this.pickMedia('image', ['camera']);
      return;
    }
    if (action === 'video') {
      this.pickMedia('video', ['album', 'camera']);
      return;
    }
    if (action === 'videocall') {
      wx.showToast({ title: '视频通话请进入私聊', icon: 'none' });
      return;
    }
    if (action === 'redpack') {
      pickAaAmount()
        .then(({ aaAmount, aaPeople }) => {
          const line = `[AA收款 ¥${aaAmount} · ${aaPeople}人]`;
          this.setData({ commentText: `${this.data.commentText || ''}${this.data.commentText ? '\n' : ''}${line}` });
        })
        .catch(() => {});
      return;
    }
    if (action === 'gift' || action === 'transfer' || action === 'favorite') {
      wx.showToast({ title: '功能即将上线', icon: 'none' });
      return;
    }
    if (action === 'location') {
      chooseLocationPoint()
        .then((loc) => {
          const snippet = locationSnippet(loc);
          this.setData({ commentText: `${this.data.commentText || ''}${this.data.commentText ? ' ' : ''}${snippet}` });
        })
        .catch(() => {});
      return;
    }
    if (action === 'aa') {
      pickAaAmount()
        .then(({ aaAmount, aaPeople }) => {
          const line = `[AA收款 ¥${aaAmount} · ${aaPeople}人]`;
          this.setData({ commentText: `${this.data.commentText || ''}${this.data.commentText ? '\n' : ''}${line}` });
        })
        .catch(() => {});
      return;
    }
    if (action === 'activity') {
      openActivityShare(() => openEventPublishEntry());
    }
  },

  pickMedia(mediaType, sourceType) {
    chooseMedia({
      count: 1,
      mediaType: [mediaType],
      sourceType,
      maxDuration: 60,
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (!file) return;
        if (mediaType === 'video' && file.size > 50 * 1024 * 1024) {
          wx.showToast({ title: '视频请小于 50MB', icon: 'none' });
          return;
        }
        if (mediaType === 'image') {
          this.setData({ pendingMedia: { type: 'image', url: file.tempFilePath } });
          return;
        }
        this.setData({
          pendingMedia: {
            type: 'video',
            url: file.tempFilePath,
            poster: file.thumbTempFilePath || '',
          },
        });
      },
    });
  },

  onComposerVoice(e) {
    const { duration } = e.detail;
    this.setData({ commentText: `${this.data.commentText || ''}[语音 ${duration}"]` });
  },

  onClearPending() {
    this.setData({ pendingMedia: null });
  },

  onComposerSend(e) {
    const text = (e.detail.value || this.data.commentText || '').trim();
    const { pendingMedia, postId, post } = this.data;
    if (!text && !pendingMedia) {
      wx.showToast({ title: '请输入评论或添加媒体', icon: 'none' });
      return;
    }

    let payload;
    if (pendingMedia) {
      payload = {
        userName: '我',
        avatar: MOCK_PET.avatar,
        type: pendingMedia.type,
        url: pendingMedia.url,
        poster: pendingMedia.poster || '',
        content: text || (pendingMedia.type === 'image' ? '[图片]' : '[视频]'),
      };
    } else {
      payload = {
        userName: '我',
        avatar: MOCK_PET.avatar,
        type: 'text',
        content: text,
      };
    }

    store.addPostComment(postId, payload);
    const comments = store.listPostComments(postId);
    store.updateSocialPost(postId, { comments: comments.length });
    this.setData({
      commentText: '',
      pendingMedia: null,
      commentList: comments,
      post: { ...post, comments: comments.length },
    });
    wx.showToast({ title: '已评论', icon: 'success' });
  },

  onShare() {
    const { post, postId } = this.data;
    if (!post) return;
    const shares = (post.shares || 0) + 1;
    store.updateSocialPost(postId, { shares });
    this.setData({ post: { ...post, shares } });
  },

  onOpenPostLocation(e) {
    const { lat, lng, name, address } = e.currentTarget.dataset;
    amap.openNavigation({
      lat: Number(lat),
      lng: Number(lng),
      name: name || '走失/发现地点',
      address: address || '',
    });
  },

  onShareAppMessage() {
    const { post, postId } = this.data;
    if (!post) {
      return { title: '宠头头交友广场', path: '/pages/social/social' };
    }
    if (post.lostType === 'lost') {
      const loc = post.geoLocation?.name || post.location || '同城';
      return {
        title: `急寻宠物！${loc} · ${(post.content || '').replace(/【.*?】/g, '').slice(0, 24)}`,
        path: `/pages/social-detail/social-detail?id=${postId}`,
      };
    }
    if (post.lostType === 'found') {
      const loc = post.geoLocation?.name || post.location || '同城';
      return {
        title: `招领宠物 · ${loc} · ${(post.content || '').replace(/【.*?】/g, '').slice(0, 24)}`,
        path: `/pages/social-detail/social-detail?id=${postId}`,
      };
    }
    return {
      title: `${post.userName}：${(post.content || '').slice(0, 28)}`,
      path: `/pages/social-detail/social-detail?id=${postId}`,
    };
  },
});
