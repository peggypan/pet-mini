const cloudApi = require('./cloud-api');
const store = require('./store');

function memberApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('club_members', action, payload);
}

async function ensureCloudLogin() {
  const { refreshPetsFromCloud } = require('./pet-cloud-sync');
  try {
    const loginData = await cloudApi.login();
    if (loginData && loginData.token) {
      const app = getApp();
      app.globalData.token = loginData.token;
      app.globalData.userInfo = loginData.user;
      wx.setStorageSync('token', loginData.token);
      wx.setStorageSync('userInfo', loginData.user);
    }
  } catch (e) {
    // ignore
  }
  await refreshPetsFromCloud().catch(() => {});
}

async function refreshJoinedClubsFromCloud() {
  if (!cloudApi.cloudEnabled()) return store.listJoinedClubs();
  await ensureCloudLogin();
  try {
    const data = await memberApi('listMine');
    const list = (data && data.list) || [];
    return store.replaceJoinedClubsFromCloud(list);
  } catch (e) {
    console.warn('[club-member-cloud-sync] listMine', e);
    return store.listJoinedClubs();
  }
}

async function joinClubToCloud(club) {
  if (!club || !club.id) throw new Error('俱乐部无效');
  if (!cloudApi.cloudEnabled()) {
    store.joinClub(club);
    return store.listJoinedClubs();
  }
  await ensureCloudLogin();
  const data = await memberApi('join', {
    clubId: String(club.id),
    clubName: club.name,
    clubCity: club.city,
    clubCover: club.cover,
    clubIntro: club.intro,
  });
  if (data && data.duplicated) {
    await refreshJoinedClubsFromCloud();
    return store.listJoinedClubs();
  }
  const member = data && data.member;
  if (member) store.upsertJoinedClubFromMember(member);
  else await refreshJoinedClubsFromCloud();
  return store.listJoinedClubs();
}

async function leaveClubFromCloud(clubId) {
  if (!cloudApi.cloudEnabled()) {
    store.leaveClub(clubId);
    return true;
  }
  await ensureCloudLogin();
  await memberApi('leave', { clubId: String(clubId) });
  store.leaveClub(clubId);
  return true;
}

module.exports = {
  refreshJoinedClubsFromCloud,
  joinClubToCloud,
  leaveClubFromCloud,
};
