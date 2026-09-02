const { findSocialPost } = require('../../utils/catalog');
const store = require('../../utils/store');
const { MOCK_PET } = require('../../utils/mock');

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
    imageList: mediaList.filter((m) => m.type === 'image').map((m) => m.url),
    videoList: mediaList.filter((m) => m.type === 'video'),
  };
}

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
    const urls = this.data.post.imageList || [];
    if (!urls.length) return;
    wx.previewImage({ current: src, urls });
  },

  onLike() {
    const { post, postId } = this.data;
    if (!post) return;
    const liked = !post.liked;
    const likes = liked ? (post.likes || 0) + 1 : Math.max(0, (post.likes || 0) - 1);
    const patch = { liked, likes };
    if (store.getSocialPost(postId)) {
      store.updateSocialPost(postId, patch);
    } else {
      store.updateSocialPost(postId, patch);
    }
    this.setData({ post: { ...post, ...patch } });
  },

  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  onSendComment() {
    const text = (this.data.commentText || '').trim();
    if (!text) {
      wx.showToast({ title: '请输入评论', icon: 'none' });
      return;
    }
    const { postId, post } = this.data;
    store.addPostComment(postId, {
      userName: '我',
      avatar: MOCK_PET.avatar,
      content: text,
    });
    const comments = store.listPostComments(postId);
    store.updateSocialPost(postId, { comments: comments.length });
    this.setData({
      commentText: '',
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

  onShareAppMessage() {
    const { post, postId } = this.data;
    return {
      title: post ? `${post.userName}：${(post.content || '').slice(0, 28)}` : '宠头头交友广场',
      path: `/pages/social-detail/social-detail?id=${postId}`,
    };
  },
});
