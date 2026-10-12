/**
 * 宠友关注：单向关系，按作者维度（同一用户多条内容只关注一次）。
 */

const store = require('./store');

function resolveAuthorFollowId(source) {
  if (!source) return '';
  const openid = source.openid || source._openid || source.peerOpenid;
  if (openid) return `oid:${openid}`;
  if (source.userId) return `uid:${source.userId}`;
  if (source.authorId) return String(source.authorId);
  if (source.userName === '我') return 'me';
  const name = (source.userName || 'user').trim();
  const pet = (source.petName || 'pet').trim();
  return `social_${name}_${pet}`;
}

/** 同一作者可能用不同 id 存关注（详情/聊天/云），查询时需全部匹配 */
function allAuthorFollowIds(source) {
  if (!source) return [];
  const ids = [];
  const openid = source.openid || source._openid || source.peerOpenid;
  if (openid) {
    ids.push(`oid:${openid}`, String(openid));
  }
  if (source.userId) ids.push(`uid:${source.userId}`, String(source.userId));
  if (source.authorId && source.authorId !== 'me') ids.push(String(source.authorId));
  if (source.id != null && String(source.id) !== '') ids.push(String(source.id));
  const nameKey = resolveAuthorFollowId({
    userName: source.userName || source.name,
    petName: source.petName || source.pet,
  });
  if (nameKey && nameKey !== 'me') ids.push(nameKey);
  return [...new Set(ids.filter(Boolean))];
}

function canonicalFollowAuthorId(source) {
  if (!source) return '';
  const openid = source.openid || source._openid || source.peerOpenid;
  if (openid) return `oid:${openid}`;
  if (source.userId) return `uid:${source.userId}`;
  if (source.id != null && String(source.id) !== '') return String(source.id);
  const social = resolveAuthorFollowId(source);
  return social && social !== 'me' ? social : '';
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
  const id = canonicalFollowAuthorId(source);
  if (!id || id === 'me' || isSelfContentAuthor(source)) return null;
  return {
    id,
    userName: source.userName || source.name || '宠友',
    petName: source.petName || source.pet || '',
    avatar: source.avatar || source.cover || '',
  };
}

function isAuthorFollowed(source) {
  if (!source || isSelfContentAuthor(source)) return false;
  return isFollowedAny(allAuthorFollowIds(source));
}

function toggleFollowAuthor(source) {
  const friend = toFollowFriend(source);
  if (!friend) return { followed: false, list: store.listFollows() };
  const aliases = allAuthorFollowIds(source);
  const wasFollowed = isFollowedAny(aliases);
  store.removeFollowsByIds(aliases);
  if (!wasFollowed) {
    return store.toggleFollow(friend);
  }
  return { followed: false, list: store.listFollows() };
}

function followResultToast(followed) {
  return followed ? '已关注' : '已取消关注';
}

function decoratePostFollow(post) {
  const authorId = canonicalFollowAuthorId(post) || resolveAuthorFollowId(post);
  const isSelfAuthor = isSelfContentAuthor(post);
  return {
    ...post,
    authorId,
    isSelfAuthor,
    followed: !isSelfAuthor ? isAuthorFollowed(post) : false,
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
  return allAuthorFollowIds({
    ...(peer || {}),
    openid: (peer && (peer.openid || peer.peerOpenid)) || (thread && thread.peerOpenid) || '',
    id: (peer && (peer.buddyId || peer.id)) || '',
  });
}

function isFollowedAny(candidates) {
  return (candidates || []).some((id) => store.isFollowed(id));
}

function isFollowedByPeerAny(candidates) {
  return (candidates || []).some((id) => store.isFollowedByPeer(id));
}

function decorateBuddyFollow(buddy) {
  const authorId = canonicalFollowAuthorId(buddy) || resolveAuthorFollowId(buddy);
  const isSelfAuthor = isSelfContentAuthor(buddy);
  return {
    ...buddy,
    authorId,
    isSelfAuthor,
    peerOpenid: buddy.peerOpenid || buddy.openid || buddy._openid || '',
    followed: !isSelfAuthor ? isAuthorFollowed(buddy) : false,
  };
}

module.exports = {
  toFollowFriend,
  followResultToast,
  resolvePostAuthorId,
  resolveAuthorFollowId,
  allAuthorFollowIds,
  canonicalFollowAuthorId,
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
