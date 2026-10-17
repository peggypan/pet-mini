const { getDisplayNickname, getProfileAvatarUrl, isUsableAvatarUrl } = require('./user-profile-display');
const { displayUserNickName } = require('./display-user-nick');
const { isSelfContentAuthor } = require('./pet-follow');

function pickAuthorAvatar(post, isSelf) {
  if (isSelf) return getProfileAvatarUrl();
  const url = String((post && post.avatar) || '').trim();
  if (isUsableAvatarUrl(url)) return url;
  return url || '/assets/mock/real_avatar.jpg';
}

/** 详情/列表：作者行只展示账号网名与头像，与编辑主页一致 */
function decoratePostAuthorForViewer(post) {
  if (!post) return post;
  const isSelf = isSelfContentAuthor(post);
  const userName = isSelf ? getDisplayNickname() : displayUserNickName(post);
  return {
    ...post,
    userName,
    avatar: pickAuthorAvatar(post, isSelf),
    isSelfAuthor: isSelf || post.isSelfAuthor === true,
  };
}

module.exports = {
  decoratePostAuthorForViewer,
};
