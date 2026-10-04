const cloudApi = require('./cloud-api');
const { hasLoginToken, ensureCloudSession } = require('./cloud-session');

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

module.exports = {
  fetchFollowRelation,
  toggleFollowOnCloud,
};
