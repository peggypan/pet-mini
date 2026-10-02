/**
 * 宠友关注：单向关系。
 * - 我点关注 → 只进「关注」列表，不算彼此好友
 * - 「粉丝」仅当对方关注我时增加
 * - 互相关注才算彼此好友（isMutualFollow）
 */

function toFollowFriend(source) {
  if (!source || source.id == null) return null;
  return {
    id: source.id,
    userName: source.userName || source.name || '宠友',
    petName: source.petName || source.pet || '',
    avatar: source.avatar || source.cover || '',
  };
}

function followResultToast(followed) {
  return followed ? '已关注' : '已取消关注';
}

function resolvePostAuthorId(post) {
  if (!post) return '';
  if (post.authorId) return String(post.authorId);
  if (post.userName === '我') return 'me';
  return `social_${post.userName || 'user'}_${post.petName || 'pet'}`;
}

function isSelfPostAuthor(post) {
  if (!post) return false;
  if (post.userName === '我' || post.isMine) return true;
  return String(resolvePostAuthorId(post)) === 'me';
}

function decoratePostFollow(post) {
  const store = require('./store');
  const authorId = resolvePostAuthorId(post);
  return {
    ...post,
    authorId,
    isSelfAuthor: isSelfPostAuthor(post),
    followed: authorId && authorId !== 'me' ? store.isFollowed(authorId) : false,
  };
}

module.exports = {
  toFollowFriend,
  followResultToast,
  resolvePostAuthorId,
  isSelfPostAuthor,
  decoratePostFollow,
};
