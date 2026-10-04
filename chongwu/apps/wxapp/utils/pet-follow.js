/**
 * 宠友关注：单向关系，按作者维度（同一用户多条内容只关注一次）。
 */

const store = require('./store');

function resolveAuthorFollowId(source) {
  if (!source) return '';
  const openid = source.openid || source._openid;
  if (openid) return `oid:${openid}`;
  if (source.userId) return `uid:${source.userId}`;
  if (source.authorId) return String(source.authorId);
  if (source.userName === '我') return 'me';
  const name = (source.userName || 'user').trim();
  const pet = (source.petName || 'pet').trim();
  return `social_${name}_${pet}`;
}

function resolvePostAuthorId(post) {
  return resolveAuthorFollowId(post);
}

function isSelfContentAuthor(source) {
  if (!source) return false;
  if (source.isMine === true || source.userName === '我') return true;
  if (source.isSelfAuthor === true) return true;
  return store.isMyUserContent(source);
}

function toFollowFriend(source) {
  const id = resolveAuthorFollowId(source);
  if (!id || id === 'me' || isSelfContentAuthor(source)) return null;
  return {
    id,
    userName: source.userName || source.name || '宠友',
    petName: source.petName || source.pet || '',
    avatar: source.avatar || source.cover || '',
  };
}

function isAuthorFollowed(source) {
  const id = resolveAuthorFollowId(source);
  if (!id || id === 'me') return false;
  return store.isFollowed(id);
}

function toggleFollowAuthor(source) {
  const friend = toFollowFriend(source);
  if (!friend) return { followed: false, list: store.listFollows() };
  return store.toggleFollow(friend);
}

function followResultToast(followed) {
  return followed ? '已关注' : '已取消关注';
}

function decoratePostFollow(post) {
  const authorId = resolveAuthorFollowId(post);
  const isSelfAuthor = isSelfContentAuthor(post);
  return {
    ...post,
    authorId,
    isSelfAuthor,
    followed: authorId && !isSelfAuthor ? store.isFollowed(authorId) : false,
  };
}

function resolveChatPeerFollowKey(peer, thread) {
  const source = {
    openid: (peer && (peer.openid || peer.peerOpenid))
      || (thread && thread.peerOpenid)
      || '',
    userId: peer && peer.userId,
    userName: peer && peer.userName,
    petName: peer && peer.petName,
    id: peer && peer.id,
  };
  return resolveAuthorFollowId(source);
}

function peerFollowIdCandidates(peer, thread) {
  const keys = new Set();
  const primary = resolveChatPeerFollowKey(peer, thread);
  if (primary) keys.add(String(primary));
  if (peer && peer.id != null) keys.add(String(peer.id));
  const oid = (peer && (peer.openid || peer.peerOpenid))
    || (thread && thread.peerOpenid);
  if (oid) {
    keys.add(String(oid));
    keys.add(`oid:${oid}`);
  }
  return [...keys];
}

function isFollowedAny(candidates) {
  return (candidates || []).some((id) => store.isFollowed(id));
}

function isFollowedByPeerAny(candidates) {
  return (candidates || []).some((id) => store.isFollowedByPeer(id));
}

function decorateBuddyFollow(buddy) {
  const authorId = resolveAuthorFollowId(buddy);
  const isSelfAuthor = isSelfContentAuthor(buddy);
  return {
    ...buddy,
    authorId,
    isSelfAuthor,
    followed: authorId && !isSelfAuthor ? store.isFollowed(authorId) : false,
  };
}

module.exports = {
  toFollowFriend,
  followResultToast,
  resolvePostAuthorId,
  resolveAuthorFollowId,
  resolveChatPeerFollowKey,
  peerFollowIdCandidates,
  isFollowedAny,
  isFollowedByPeerAny,
  isSelfContentAuthor,
  isSelfPostAuthor: isSelfContentAuthor,
  isAuthorFollowed,
  toggleFollowAuthor,
  decoratePostFollow,
  decorateBuddyFollow,
};
