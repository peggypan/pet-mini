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
const { withContentParts } = require('../../utils/social-content-parts');
const { buildCommentThreads } = require('../../utils/social-post-comments');
const { openSocialHashtagFilter } = require('../../utils/social-hashtag-nav');
const { decoratePostFollow, followResultToast } = require('../../utils/pet-follow');
const { requirePetProfile } = require('../../utils/pet-profile-guard');
const { deleteOwnedSocialPost, finishAfterDelete } = require('../../utils/user-content-delete');

const { ZONE_LABEL_MAP, getZoneLabel } = require('../../utils/community-zones');

Page({
  data: {
    postId: '',
    post: null,
    zoneLabel: '',
    commentList: [],
    commentText: '',
    commentPlaceholder: '写评论…',
    replyTarget: null,
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
    const flatComments = store.listPostComments(postId);
    const enriched = decoratePostFollow(withContentParts({
      ...post,
      comments: Math.max(post.comments || 0, flatComments.length),
    }));
    this.setData({
      post: enriched,
      zoneLabel: getZoneLabel(post.zone) || ZONE_LABEL_MAP[post.zone] || '宠物社区',
      commentList: buildCommentThreads(flatComments),
    });
  },

  async onDeletePost() {
    const { postId, post } = this.data;
    if (!post || !post.isSelfAuthor) return;
    const res = await deleteOwnedSocialPost(postId, {
      title: post.lostType ? '删除寻宠救助信息' : '删除动态',
    });
    if (!res.ok) {
      if (res.reason && !res.cancelled) wx.showToast({ title: res.reason, icon: 'none' });
      return;
    }
    finishAfterDelete('/pages/social/social');
  },

  onFollowAuthor() {
    if (!requirePetProfile()) return;
    const post = this.data.post;
    if (!post || post.isSelfAuthor || !post.authorId || post.authorId === 'me') return;
    const result = store.toggleFollow({
      id: post.authorId,
      userName: post.userName,
      petName: post.petName,
      avatar: post.avatar,
    });
    wx.showToast({ title: followResultToast(result.followed), icon: 'none' });
    this.setData({
      post: { ...post, followed: result.followed },
    });
  },

  onContentHashtagTap(e) {
    const topic = e.currentTarget.dataset.topic;
    openSocialHashtagFilter(topic);
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
    if (!requirePetProfile()) return;
    const { post, postId } = this.data;
    if (!post) return;
    const liked = !post.liked;
    const likes = liked ? (post.likes || 0) + 1 : Math.max(0, (post.likes || 0) - 1);
    const patch = { liked, likes };
    store.updateSocialPost(postId, patch);
    store.recordPostThumbLike({
      channel: 'social',
      postId,
      liked,
      title: (post.content || post.topic || '社区动态').slice(0, 32),
      cover: post.image || (post.images && post.images[0]) || '',
      userName: post.userName,
      petName: post.petName,
    });
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

  onReplyComment(e) {
    const { id, name } = e.currentTarget.dataset;
    if (!id) return;
    const userName = name || '宠友';
    this.setData({
      replyTarget: { id, userName },
      commentPlaceholder: `回复 ${userName}…`,
    });
  },

  onCancelReply() {
    this.setData({
      replyTarget: null,
      commentPlaceholder: '写评论…',
    });
  },

  onComposerSend(e) {
    if (!requirePetProfile()) return;
    const text = (e.detail.value || this.data.commentText || '').trim();
    const { pendingMedia, postId, post, replyTarget } = this.data;
    if (!text && !pendingMedia) {
      wx.showToast({ title: '请输入评论或添加媒体', icon: 'none' });
      return;
    }

    const replyMeta = replyTarget
      ? { parentId: replyTarget.id, replyToUserName: replyTarget.userName }
      : {};

    let payload;
    if (pendingMedia) {
      payload = {
        userName: '我',
        avatar: MOCK_PET.avatar,
        type: pendingMedia.type,
        url: pendingMedia.url,
        poster: pendingMedia.poster || '',
        content: text || (pendingMedia.type === 'image' ? '[图片]' : '[视频]'),
        ...replyMeta,
      };
    } else {
      payload = {
        userName: '我',
        avatar: MOCK_PET.avatar,
        type: 'text',
        content: text,
        ...replyMeta,
      };
    }

    store.addPostComment(postId, payload);
    const flatComments = store.listPostComments(postId);
    store.updateSocialPost(postId, { comments: flatComments.length });
    this.setData({
      commentText: '',
      pendingMedia: null,
      replyTarget: null,
      commentPlaceholder: '写评论…',
      commentList: buildCommentThreads(flatComments),
      post: { ...post, comments: flatComments.length },
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

  onOpenPostLocation() {
    amap.openPlace(this.data.post || {});
  },

  onShareAppMessage() {
    const { post, postId } = this.data;
    if (!post) {
      return { title: '宠头头 · 宠物社区', path: '/pages/social/social' };
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
    if (post.lostType === 'rescue') {
      const loc = post.geoLocation?.name || post.location || '同城';
      return {
        title: `宠物救助 · ${loc} · ${(post.content || '').replace(/【.*?】/g, '').slice(0, 24)}`,
        path: `/pages/social-detail/social-detail?id=${postId}`,
      };
    }
    if (post.lostType === 'adopt') {
      const loc = post.geoLocation?.name || post.location || '同城';
      return {
        title: `爱心领养 · ${loc} · ${(post.content || '').replace(/【.*?】/g, '').slice(0, 24)}`,
        path: `/pages/social-detail/social-detail?id=${postId}`,
      };
    }
    return {
      title: `${post.userName}：${(post.content || '').slice(0, 28)}`,
      path: `/pages/social-detail/social-detail?id=${postId}`,
    };
  },
});
