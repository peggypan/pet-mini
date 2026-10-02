const cloudEnv = require('../config/cloud-env');

function cloudEnabled() {
  return !!(cloudEnv.useCloud && cloudEnv.envId && wx.cloud);
}

function callApi(module, action, payload = {}, options = {}) {
  if (!cloudEnabled()) {
    return Promise.reject(new Error('云开发未启用，请配置 config/cloud-env.js'));
  }
  const data = { module, action, payload };
  return wx.cloud
    .callFunction({
      name: 'api',
      data,
      ...options,
    })
    .then((res) => {
      const body = res.result;
      if (!body || typeof body.code !== 'number') {
        throw new Error('云函数返回格式异常');
      }
      if (body.code !== 0) {
        const err = new Error(body.message || '请求失败');
        err.code = body.code;
        err.details = body.details;
        throw err;
      }
      return body.data;
    });
}

function ping() {
  return callApi('system', 'ping');
}

function login(options) {
  const force = !!(options && options.force);
  if (!force) {
    const { hasLoginToken } = require('./cloud-session');
    if (!hasLoginToken()) {
      return Promise.reject(Object.assign(new Error('未登录'), { code: 401 }));
    }
  }
  return callApi('auth', 'login');
}

function getProfile() {
  return callApi('auth', 'me');
}

function bindPhone(phoneCode) {
  return callApi('auth', 'bindPhone', { phoneCode });
}

function updateProfile(payload) {
  return callApi('auth', 'updateProfile', payload || {});
}

function listMyPets() {
  return callApi('pets', 'listMine');
}

function getPet(id) {
  return callApi('pets', 'get', { id });
}

function savePet(payload) {
  return callApi('pets', 'save', payload);
}

function listBuddyFeed(payload) {
  return callApi('buddy_posts', 'listFeed', payload || {});
}

function listMyBuddyPosts() {
  return callApi('buddy_posts', 'listMine');
}

function getBuddyPost(id) {
  return callApi('buddy_posts', 'get', { id });
}

function saveBuddyPost(payload) {
  return callApi('buddy_posts', 'save', payload);
}

function removeBuddyPost(id) {
  return callApi('buddy_posts', 'remove', { id });
}

function listSocialFeed(payload) {
  return callApi('social_posts', 'listFeed', payload || {});
}

function listMySocialPosts() {
  return callApi('social_posts', 'listMine');
}

function getSocialPost(id) {
  return callApi('social_posts', 'get', { id });
}

function saveSocialPost(payload) {
  return callApi('social_posts', 'save', payload);
}

function removeSocialPost(id) {
  return callApi('social_posts', 'remove', { id });
}

function listSocialCommentsByPost(postId, payload) {
  return callApi('social_comments', 'listByPost', { postId, ...(payload || {}) });
}

function saveSocialComment(payload) {
  return callApi('social_comments', 'save', payload);
}

function removeSocialComment(id) {
  return callApi('social_comments', 'remove', { id });
}

function listLocalFeed(payload) {
  return callApi('local_posts', 'listFeed', payload || {});
}

function listMyLocalPosts() {
  return callApi('local_posts', 'listMine');
}

function getLocalPostCloud(id) {
  return callApi('local_posts', 'get', { id });
}

function saveLocalPost(payload) {
  return callApi('local_posts', 'save', payload);
}

function removeLocalPost(id) {
  return callApi('local_posts', 'remove', { id });
}

function listEventsFeed(payload) {
  return callApi('events', 'listFeed', payload || {});
}

function listMyEventsCloud() {
  return callApi('events', 'listMine');
}

function getEvent(id) {
  return callApi('events', 'get', { id });
}

function saveEvent(payload) {
  return callApi('events', 'save', payload);
}

function removeEvent(id) {
  return callApi('events', 'remove', { id });
}

function listMyEventSignups() {
  return callApi('event_signups', 'listMine');
}

function getMyEventSignupByEvent(eventId) {
  return callApi('event_signups', 'getMyByEvent', { eventId });
}

function getEventSignup(id) {
  return callApi('event_signups', 'get', { id });
}

function saveEventSignup(payload) {
  return callApi('event_signups', 'save', payload);
}

function removeEventSignup(payload) {
  return callApi('event_signups', 'remove', payload);
}

module.exports = {
  cloudEnabled,
  callApi,
  ping,
  login,
  getProfile,
  bindPhone,
  updateProfile,
  listMyPets,
  getPet,
  savePet,
  listBuddyFeed,
  listMyBuddyPosts,
  getBuddyPost,
  saveBuddyPost,
  removeBuddyPost,
  listSocialFeed,
  listMySocialPosts,
  getSocialPost,
  saveSocialPost,
  removeSocialPost,
  listSocialCommentsByPost,
  saveSocialComment,
  removeSocialComment,
  listLocalFeed,
  listMyLocalPosts,
  getLocalPostCloud,
  saveLocalPost,
  removeLocalPost,
  listEventsFeed,
  listMyEventsCloud,
  getEvent,
  saveEvent,
  removeEvent,
  listMyEventSignups,
  getMyEventSignupByEvent,
  getEventSignup,
  saveEventSignup,
  removeEventSignup,
};
