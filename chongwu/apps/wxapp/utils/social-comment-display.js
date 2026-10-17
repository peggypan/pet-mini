const store = require('./store');
const { getDisplayNickname, getProfileAvatarUrl } = require('./user-profile-display');

function getViewerIdentity() {
  const userInfo = wx.getStorageSync('userInfo') || {};
  return {
    openid: String(userInfo.openid || userInfo._openid || '').trim(),
    userId: String(userInfo._id || userInfo.userId || '').trim(),
  };
}

/**
 * 评论作者是否当前登录用户
 * 云端：social_comments 集合字段 openid / userId / userName / avatar（发帖时写入）
 * 本地：mvp_post_comments[postId] 数组
 */
function isViewerComment(comment) {
  if (!comment) return false;
  if (comment.isMine === true) return true;
  if (comment.userName === '我') return true;

  const viewer = getViewerIdentity();
  const cOid = String(comment.openid || comment._openid || '').trim();
  if (viewer.openid && cOid && viewer.openid === cOid) return true;

  const cUid = String(comment.userId || '').trim();
  if (viewer.userId && cUid && viewer.userId === cUid) return true;

  return store.isMyUserContent(comment);
}

function decorateCommentForViewer(comment) {
  if (!isViewerComment(comment)) return comment;
  const avatar = getProfileAvatarUrl();
  return {
    ...comment,
    isMine: true,
    userName: getDisplayNickname(),
    avatar: avatar || comment.avatar,
  };
}

/** 帖主可删任意评论；评论者仅可删自己的 */
function canDeleteCommentForViewer(comment, post) {
  if (!comment) return false;
  if (isViewerComment(comment)) return true;
  if (post && post.isSelfAuthor) return true;
  return false;
}

function decorateCommentsForViewer(flat, options) {
  const post = options && options.post;
  return (flat || []).map((comment) => {
    const row = decorateCommentForViewer(comment);
    return {
      ...row,
      canDelete: canDeleteCommentForViewer(row, post),
    };
  });
}

function currentCommentAuthorPayload() {
  const avatar = getProfileAvatarUrl();
  const viewer = getViewerIdentity();
  return {
    userName: getDisplayNickname(),
    avatar: avatar || '/assets/mock/real_avatar.jpg',
    isMine: true,
    ...(viewer.openid ? { openid: viewer.openid } : {}),
    ...(viewer.userId ? { userId: viewer.userId } : {}),
  };
}

module.exports = {
  getViewerIdentity,
  isViewerComment,
  canDeleteCommentForViewer,
  decorateCommentsForViewer,
  currentCommentAuthorPayload,
};
