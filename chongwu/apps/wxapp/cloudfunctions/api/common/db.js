const cloud = require('wx-server-sdk');

function getDb() {
  return cloud.database();
}

function users() {
  return getDb().collection('users');
}

function pets() {
  return getDb().collection('pets');
}

function buddyPosts() {
  return getDb().collection('buddy_posts');
}

function socialPosts() {
  return getDb().collection('social_posts');
}

function socialComments() {
  return getDb().collection('social_comments');
}

function localPosts() {
  return getDb().collection('local_posts');
}

function events() {
  return getDb().collection('events');
}

function eventSignups() {
  return getDb().collection('event_signups');
}

function eventInterests() {
  return getDb().collection('event_interests');
}

function eventQualify() {
  return getDb().collection('event_qualify');
}

function mapPoints() {
  return getDb().collection('map_points');
}

function merchants() {
  return getDb().collection('merchants');
}

function merchantApplies() {
  return getDb().collection('merchant_applies');
}

function hostApplies() {
  return getDb().collection('host_applies');
}

function clubs() {
  return getDb().collection('clubs');
}

function clubMembers() {
  return getDb().collection('club_members');
}

function petCertsPublic() {
  return getDb().collection('pet_certs_public');
}

function banners() {
  return getDb().collection('banners');
}

function splashAds() {
  return getDb().collection('splash_ads');
}

function pointsLedger() {
  return getDb().collection('points_ledger');
}

function sensitiveWords() {
  return getDb().collection('sensitive_words');
}

function adminUsers() {
  return getDb().collection('admin_users');
}

function petDiscoverLikes() {
  return getDb().collection('pet_discover_likes');
}

function petDiscoverDaily() {
  return getDb().collection('pet_discover_daily');
}

function chatThreads() {
  return getDb().collection('chat_threads');
}

function chatMessages() {
  return getDb().collection('chat_messages');
}

function now() {
  return getDb().serverDate();
}

module.exports = {
  getDb,
  users,
  pets,
  buddyPosts,
  socialPosts,
  socialComments,
  localPosts,
  events,
  eventSignups,
  eventInterests,
  eventQualify,
  mapPoints,
  merchants,
  merchantApplies,
  hostApplies,
  clubs,
  clubMembers,
  petCertsPublic,
  banners,
  splashAds,
  pointsLedger,
  sensitiveWords,
  adminUsers,
  petDiscoverLikes,
  petDiscoverDaily,
  chatThreads,
  chatMessages,
  now,
};
