const cloudApi = require('./cloud-api');
const { ensureCloudSession } = require('./cloud-session');
const { resolveBuddyPosts, resolveSocialPosts } = require('./cloud-media');

async function canFetchFromCloud() {
  if (!cloudApi.cloudEnabled()) return false;
  let token = wx.getStorageSync('token');
  try {
    const g = getApp().globalData;
    if (g && g.token) token = g.token;
  } catch (e) {
    // ignore
  }
  if (!token) return false;
  await ensureCloudSession().catch(() => {});
  return true;
}

async function fetchMyEventsFromCloud() {
  const data = await cloudApi.callApi('events', 'listMine');
  return (data && data.list) || [];
}

async function fetchMySignupsFromCloud() {
  const data = await cloudApi.callApi('event_signups', 'listMine');
  return (data && data.list) || [];
}

async function fetchMyBuddyPostsFromCloud() {
  const data = await cloudApi.callApi('buddy_posts', 'listMine');
  let list = (data && data.list) || [];
  list = await resolveBuddyPosts(list);
  return list;
}

async function fetchMySocialPostsFromCloud() {
  const data = await cloudApi.callApi('social_posts', 'listMine');
  let list = (data && data.list) || [];
  list = await resolveSocialPosts(list);
  return list;
}

/**
 * 个人页四个 Tab：只从云数据库 listMine 拉取，不写本地 store。
 */
async function fetchAllProfileFeedSources() {
  const empty = { myEvents: [], joined: [], buddy: [], social: [] };
  if (!(await canFetchFromCloud())) return empty;
  try {
    const [myEvents, joined, buddy, social] = await Promise.all([
      fetchMyEventsFromCloud().catch((e) => {
        console.warn('[profile-feed-cloud] events.listMine', e);
        return [];
      }),
      fetchMySignupsFromCloud().catch((e) => {
        console.warn('[profile-feed-cloud] event_signups.listMine', e);
        return [];
      }),
      fetchMyBuddyPostsFromCloud().catch((e) => {
        console.warn('[profile-feed-cloud] buddy_posts.listMine', e);
        return [];
      }),
      fetchMySocialPostsFromCloud().catch((e) => {
        console.warn('[profile-feed-cloud] social_posts.listMine', e);
        return [];
      }),
    ]);
    return { myEvents, joined, buddy, social };
  } catch (e) {
    console.warn('[profile-feed-cloud] fetchAll', e);
    return empty;
  }
}

async function fetchProfileFeedSource(tabKey) {
  if (!(await canFetchFromCloud())) return [];
  try {
    if (tabKey === 'myEvents') return fetchMyEventsFromCloud();
    if (tabKey === 'joined') return fetchMySignupsFromCloud();
    if (tabKey === 'buddy') return fetchMyBuddyPostsFromCloud();
    if (tabKey === 'social') return fetchMySocialPostsFromCloud();
    return [];
  } catch (e) {
    console.warn('[profile-feed-cloud]', tabKey, e);
    return [];
  }
}

module.exports = {
  fetchAllProfileFeedSources,
  fetchProfileFeedSource,
};
