const { findSocialPost } = require('../../utils/catalog');
const store = require('../../utils/store');
const {
  mergePostDetailEngagement,
} = require('../../utils/social-post-engagement');
const {
  togglePostLikeSynced,
  bumpPostShareSynced,
} = require('../../utils/post-engagement-cloud-sync');
const {
  decorateCommentsForViewer,
  canDeleteCommentForViewer,
  currentCommentAuthorPayload,
} = require('../../utils/social-comment-display');
const { openEventPublishEntry } = require('../../utils/event-publish-nav');
const {
  pickAaAmount,
  openActivityShare,
} = require('../../utils/chat-tool-actions');
const amap = require('../../utils/amap');
const { chooseMedia } = require('../../utils/choose-media');
const { normalizePostMedia } = require('../../utils/social-post-media');
const { withContentParts } = require('../../utils/social-content-parts');
const { buildCommentThreads } = require('../../utils/social-post-comments');
const { openSocialHashtagFilter } = require('../../utils/social-hashtag-nav');
const { decoratePostFollow, followResultToast } = require('../../utils/pet-follow');
const { decoratePostAuthorForViewer } = require('../../utils/social-post-author-display');
const { toggleFollowAuthorSynced } = require('../../utils/follow-cloud-sync');
const { requireInteract } = require('../../utils/pet-profile-guard');
const {
  deleteOwnedSocialPost,
  deleteOwnedLocalPost,
  finishAfterDelete,
} = require('../../utils/user-content-delete');
const cloudApi = require('../../utils/cloud-api');
const { fetchSocialPostFromCloud } = require('../../utils/social-cloud-sync');
const { fetchLocalPostFromCloud } = require('../../utils/local-cloud-sync');
const { REF_LOCAL, findLocalPostForDetail, localPostToDetailView } = require('../../utils/local-post-detail');
const {
  refreshPostCommentsFromCloud,
  saveCommentToCloud,
  removeCommentFromCloud,
} = require('../../utils/social-comment-cloud-sync');
const sensitiveWords = require('../../utils/sensitive-words');
const { resolveCloudFileUrl } = require('../../utils/cloud-media');

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
    postSource: 'social',
  },

  onLoad(options) {
    const postId = options.id || '';
    const postSource = options.source === 'local' ? 'local' : 'social';
    this.setData({ postId, postSource });
    this.loadPost(postId);
  },

  onShow() {
    if (this.data.postId) this.loadPost(this.data.postId);
  },

  async resolveCommentAvatars(flat) {
    const list = flat || [];
    if (!list.length) return list;
    const resolved = await Promise.all(
      list.map(async (c) => {
        if (!c || !c.avatar) return c;
        try {
          const avatar = await resolveCloudFileUrl(c.avatar);
          return avatar ? { ...c, avatar } : c;
        } catch (e) {
          return c;
        }
      }),
    );
    return resolved;
  },

  findPostViewSync(postId) {
    const { postSource } = this.data;
    if (postSource === 'local') {
      return findLocalPostForDetail(postId);
    }
    const found = findSocialPost(postId);
    return found ? normalizePostMedia(found) : null;
  },

  paintPostDetail(postId, view, flatComments) {
    if (!view) {
      this.setData({ post: null, commentList: [] });
      return;
    }
    const { postSource } = this.data;
    const isLocal = postSource === 'local';
    const comments = flatComments || store.listPostComments(postId);
    const zoneLabel = isLocal
      ? (view.lostType === 'adopt' ? '领养救助' : '同城互助')
      : (getZoneLabel(view.zone) || ZONE_LABEL_MAP[view.zone] || '宠物社区');
    const merged = mergePostDetailEngagement(postId, view, postSource);
    const withAuthor = decoratePostAuthorForViewer(merged);
    const enriched = decoratePostFollow(withContentParts({
      ...withAuthor,
      comments: Math.max(withAuthor.comments || 0, (comments || []).length),
    }));
    const decoratedComments = decorateCommentsForViewer(comments, { post: enriched });
    this.setData({
      post: enriched,
      zoneLabel,
      commentList: buildCommentThreads(decoratedComments),
    });
  },

  loadPost(postId) {
    const cached = this.findPostViewSync(postId);
    this.paintPostDetail(postId, cached, store.listPostComments(postId));
    if (this._postLoadPromise) return this._postLoadPromise;
    this._postLoadPromise = this.fetchPostFromCloud(postId).finally(() => {
      this._postLoadPromise = null;
    });
    return this._postLoadPromise;
  },

  async fetchPostFromCloud(postId) {
    const { postSource } = this.data;
    const isLocal = postSource === 'local';
    if (!cloudApi.cloudEnabled() || !postId) return;

    let view = this.findPostViewSync(postId);
    if (isLocal) {
      if (!view) {
        const row = await fetchLocalPostFromCloud(postId);
        view = row ? localPostToDetailView(row) : null;
      }
    } else if (cloudApi.cloudEnabled()) {
      const found = await fetchSocialPostFromCloud(postId);
      if (found) view = normalizePostMedia(found);
    }

    if (!view) {
      if (!this.data.post) this.setData({ post: null });
      return;
    }

    let flatComments = store.listPostComments(postId);
    try {
      flatComments = await refreshPostCommentsFromCloud(postId, {
        postRef: isLocal ? REF_LOCAL : 'social_posts',
      });
    } catch (e) {
      // keep cache
    }
    flatComments = await this.resolveCommentAvatars(flatComments);
    this.paintPostDetail(postId, view, flatComments);
  },

  async onDeletePost() {
    const { postId, post, postSource } = this.data;
    if (!post || !post.isSelfAuthor) return;
    const isLocal = postSource === 'local';
    const res = isLocal
      ? await deleteOwnedLocalPost(postId, { title: '删除同城信息' })
      : await deleteOwnedSocialPost(postId, {
        title: post.lostType ? '删除寻宠救助信息' : '删除动态',
      });
    if (!res.ok) {
      if (res.reason && !res.cancelled) wx.showToast({ title: res.reason, icon: 'none' });
      return;
    }
    finishAfterDelete(isLocal ? '/pages/pet-rescue/pet-rescue' : '/pages/social/social');
  },

  async onFollowAuthor() {
    if (!requireInteract()) return;
    const post = this.data.post;
    if (!post || post.isSelfAuthor || !post.authorId || post.authorId === 'me') return;
    const result = await toggleFollowAuthorSynced(post);
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

  async onLike() {
    if (!requireInteract()) return;
    const { post, postId, postSource } = this.data;
    if (!post) return;
    wx.showLoading({ title: '处理中', mask: true });
    try {
      const patch = await togglePostLikeSynced(postId, postSource, post);
      if (postSource !== 'local') {
        store.recordPostThumbLike({
          channel: 'social',
          postId,
          liked: patch.liked,
          title: (post.content || post.topic || '社区动态').slice(0, 32),
          cover: post.image || (post.images && post.images[0]) || '',
          userName: post.userName,
          petName: post.petName,
        });
      }
      this.setData({ post: { ...post, ...patch } });
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '点赞失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
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

  onCommentLongPress(e) {
    const { id, canDelete } = e.currentTarget.dataset || {};
    if (!id || String(canDelete) !== '1') return;
    wx.showActionSheet({
      itemList: ['删除'],
      itemColor: '#C45C26',
      success: (res) => {
        if (res.tapIndex === 0) this.confirmDeleteComment(id);
      },
    });
  },

  async confirmDeleteComment(commentId) {
    const { requireLogin } = require('../../utils/require-login');
    if (!requireLogin()) return;
    if (!commentId) return;
    const { postId, post, postSource } = this.data;
    if (!postId || !post) return;

    const flat = store.listPostComments(postId);
    const target = flat.find((c) => String(c.id) === String(commentId));
    if (!target || !canDeleteCommentForViewer(target, post)) {
      wx.showToast({ title: '无权删除', icon: 'none' });
      return;
    }

    const confirm = await wx.showModal({
      title: '删除评论',
      content: '确定删除这条评论？',
      confirmText: '删除',
      confirmColor: '#C45C26',
    });
    if (!confirm.confirm) return;

    const isLocal = postSource === 'local';
    const commentRef = isLocal ? REF_LOCAL : 'social_posts';
    wx.showLoading({ title: '删除中…', mask: true });
    try {
      if (cloudApi.cloudEnabled()) {
        await removeCommentFromCloud(commentId, postId, { postRef: commentRef });
      } else {
        store.removePostComment(postId, commentId);
        const count = store.listPostComments(postId).length;
        if (isLocal) {
          store.updateLocalPost(postId, { comments: count });
        } else {
          store.updateSocialPost(postId, { comments: count });
        }
      }
      const flatComments = decorateCommentsForViewer(
        store.listPostComments(postId),
        { post },
      );
      const cachedPost = isLocal ? store.getLocalPost(postId) : store.getSocialPost(postId);
      const comments = Math.max(
        (cachedPost && cachedPost.comments) || 0,
        flatComments.length,
      );
      this.setData({
        post: { ...post, comments },
        commentList: buildCommentThreads(flatComments),
        replyTarget: this.data.replyTarget && String(this.data.replyTarget.id) === String(commentId)
          ? null
          : this.data.replyTarget,
      });
      wx.showToast({ title: '已删除', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '删除失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async onComposerSend(e) {
    if (!requireInteract()) return;
    const text = (e.detail.value || this.data.commentText || '').trim();
    const { pendingMedia, postId, post, replyTarget } = this.data;
    if (!text && !pendingMedia) {
      wx.showToast({ title: '请输入评论或添加媒体', icon: 'none' });
      return;
    }
    if (text && sensitiveWords.textBlocked(text)) {
      wx.showToast({ title: '内容含违规词，请修改', icon: 'none' });
      return;
    }

    const replyMeta = replyTarget
      ? { parentId: replyTarget.id, replyToUserName: replyTarget.userName }
      : {};

    const author = currentCommentAuthorPayload();
    let payload;
    if (pendingMedia) {
      payload = {
        ...author,
        isMine: true,
        type: pendingMedia.type,
        url: pendingMedia.url,
        poster: pendingMedia.poster || '',
        content: text || (pendingMedia.type === 'image' ? '[图片]' : '[视频]'),
        ...replyMeta,
      };
    } else {
      payload = {
        ...author,
        isMine: true,
        type: 'text',
        content: text,
        ...replyMeta,
      };
    }

    const { postSource } = this.data;
    const isLocal = postSource === 'local';
    const commentRef = isLocal ? REF_LOCAL : 'social_posts';

    wx.showLoading({ title: '发送中…', mask: true });
    try {
      if (cloudApi.cloudEnabled()) {
        await saveCommentToCloud(postId, payload, { postRef: commentRef });
      } else {
        store.addPostComment(postId, payload);
        if (isLocal) {
          store.updateLocalPost(postId, { comments: store.listPostComments(postId).length });
        } else {
          store.updateSocialPost(postId, { comments: store.listPostComments(postId).length });
        }
      }
      const cachedPost = isLocal ? store.getLocalPost(postId) : store.getSocialPost(postId);
      const list = store.listPostComments(postId);
      const comments = Math.max(
        (cachedPost && cachedPost.comments) || 0,
        post.comments || 0,
        list.length,
      );
      const enrichedPost = { ...(this.data.post || post), comments };
      const flatComments = decorateCommentsForViewer(list, { post: enrichedPost });
      this.setData({
        commentText: '',
        pendingMedia: null,
        replyTarget: null,
        commentPlaceholder: '写评论…',
        commentList: buildCommentThreads(flatComments),
        post: enrichedPost,
      });
      wx.showToast({ title: '已评论', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '评论失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onShare() {
    const { post, postId, postSource } = this.data;
    if (!post) return;
    bumpPostShareSynced(postId, postSource, post).then((next) => {
      this.setData({ post: next });
    });
  },

  onOpenPostLocation() {
    amap.openPlace(this.data.post || {});
  },

  onShareAppMessage() {
    const { post, postId, postSource } = this.data;
    if (post && postId && !this._shareBumpForPost) {
      this._shareBumpForPost = String(postId);
      bumpPostShareSynced(postId, postSource, post).then((next) => {
        this.setData({ post: next });
      });
      setTimeout(() => {
        this._shareBumpForPost = '';
      }, 800);
    }
    const detailQuery = postSource === 'local'
      ? `id=${postId}&source=local`
      : `id=${postId}`;
    if (!post) {
      return { title: '宠头头 · 宠物社区', path: '/pages/social/social' };
    }
    if (post.lostType === 'lost') {
      const loc = post.geoLocation?.name || post.location || '同城';
      return {
        title: `急寻宠物！${loc} · ${(post.content || '').replace(/【.*?】/g, '').slice(0, 24)}`,
        path: `/pages/social-detail/social-detail?${detailQuery}`,
      };
    }
    if (post.lostType === 'found') {
      const loc = post.geoLocation?.name || post.location || '同城';
      return {
        title: `招领宠物 · ${loc} · ${(post.content || '').replace(/【.*?】/g, '').slice(0, 24)}`,
        path: `/pages/social-detail/social-detail?${detailQuery}`,
      };
    }
    if (post.lostType === 'rescue') {
      const loc = post.geoLocation?.name || post.location || '同城';
      return {
        title: `宠物救助 · ${loc} · ${(post.content || '').replace(/【.*?】/g, '').slice(0, 24)}`,
        path: `/pages/social-detail/social-detail?${detailQuery}`,
      };
    }
    if (post.lostType === 'adopt') {
      const loc = post.geoLocation?.name || post.location || '同城';
      const titleText = post.title || (post.content || '').slice(0, 24);
      return {
        title: `爱心领养 · ${loc} · ${titleText}`,
        path: `/pages/social-detail/social-detail?${detailQuery}`,
      };
    }
    return {
      title: `${post.userName}：${(post.content || '').slice(0, 28)}`,
      path: `/pages/social-detail/social-detail?${detailQuery}`,
    };
  },
});
