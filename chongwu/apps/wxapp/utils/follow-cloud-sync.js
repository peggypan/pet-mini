const cloudApi = require('./cloud-api');
const { hasLoginToken, ensureCloudSession } = require('./cloud-session');
const store = require('./store');
const {
  toggleFollowAuthor,
  allAuthorFollowIds,
  toFollowFriend,
} = require('./pet-follow');

function callFollowApi(action, payload = {}) {
  return cloudApi.callApi('user_follows', action, payload);
}

async function fetchFollowRelation(targetOpenid) {
  if (!targetOpenid || !cloudApi.cloudEnabled() || !hasLoginToken()) {
    return null;
  }
  await ensureCloudSession();
  try {
    return await callFollowApi('relation', { targetOpenid });
  } catch (e) {
    console.warn('[follow-cloud-sync] relation', e);
    return null;
  }
}

async function toggleFollowOnCloud(targetOpenid, profile) {
  if (!targetOpenid || !cloudApi.cloudEnabled() || !hasLoginToken()) {
    return null;
  }
  await ensureCloudSession();
  return callFollowApi('toggle', { targetOpenid, profile });
}

/** 与详情/聊天共用：云成功则写 oid 规范 id，否则走本地 alias 合并 */
function applyFollowState(source, following) {
  const enriched = {
    ...(source || {}),
    openid: source.openid || source._openid || source.peerOpenid || '',
    peerOpenid: source.peerOpenid || source.openid || source._openid || '',
  };
  const friend = toFollowFriend(enriched);
  if (!friend) return;
  const aliases = allAuthorFollowIds(enriched);
  store.removeFollowsByIds(aliases);
  if (following) store.toggleFollow(friend);
}

async function toggleFollowAuthorSynced(source) {
  if (!source) return { followed: false };
  const targetOpenid = source.openid || source._openid || source.peerOpenid || '';
  const profile = {
    userName: source.userName || source.name || '宠友',
    petName: source.petName || source.pet || '',
    avatar: source.avatar || source.cover || '',
  };
  if (targetOpenid && cloudApi.cloudEnabled() && hasLoginToken()) {
    try {
      const rel = await toggleFollowOnCloud(targetOpenid, profile);
      if (rel) {
        applyFollowState(
          { ...source, openid: targetOpenid, peerOpenid: targetOpenid },
          !!rel.following,
        );
        return {
          followed: !!rel.following,
          mutual: !!rel.mutual,
          peerFollowsMe: !!rel.follower,
        };
      }
    } catch (e) {
      console.warn('[follow-cloud-sync] toggle', e);
    }
  }
  const local = toggleFollowAuthor(source);
  return { followed: local.followed };
}

module.exports = {
  fetchFollowRelation,
  toggleFollowOnCloud,
  applyFollowState,
  toggleFollowAuthorSynced,
};
