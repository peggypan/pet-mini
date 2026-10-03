const cloud = require('wx-server-sdk');
const { fail } = require('./common/response');
const system = require('./handlers/system');
const auth = require('./handlers/auth');
const pets = require('./handlers/pets');
const buddyPosts = require('./handlers/buddy_posts');
const socialPosts = require('./handlers/social_posts');
const socialComments = require('./handlers/social_comments');
const localPosts = require('./handlers/local_posts');
const eventsHandler = require('./handlers/events');
const eventSignupsHandler = require('./handlers/event_signups');
const eventQualifyHandler = require('./handlers/event_qualify');
const mapPointsHandler = require('./handlers/map_points');
const merchantsHandler = require('./handlers/merchants');
const merchantAppliesHandler = require('./handlers/merchant_applies');
const hostAppliesHandler = require('./handlers/host_applies');
const clubsHandler = require('./handlers/clubs');
const clubMembersHandler = require('./handlers/club_members');
const petCertsPublicHandler = require('./handlers/pet_certs_public');
const bannersHandler = require('./handlers/banners');
const splashAdsHandler = require('./handlers/splash_ads');
const pointsLedgerHandler = require('./handlers/points_ledger');
const sensitiveWordsHandler = require('./handlers/sensitive_words');
const adminHandler = require('./handlers/admin');
const adminUsersHandler = require('./handlers/admin_users');
const petDiscoverLikesHandler = require('./handlers/pet_discover_likes');
const chatThreadsHandler = require('./handlers/chat_threads');
const chatMessagesHandler = require('./handlers/chat_messages');

/** 已实现：… / social_comments.* / local_posts.* */
const ROUTES = {
  'system.ping': (payload, ctx) => system.ping(payload, ctx),
  'system.getWxacode': (payload, ctx) => system.getWxacode(payload),
  'system.checkCollections': (payload, ctx) => system.checkCollections(payload),
  'system.scanBrokenMediaUrls': (payload, ctx) => system.scanBrokenMediaUrls(payload),
  'system.repairTmpMediaUrls': (payload, ctx) => system.repairTmpMediaUrls(payload),
  'auth.login': (payload, ctx) => auth.login(payload, ctx),
  'auth.me': (payload, ctx) => auth.me(payload, ctx),
  'auth.bindPhone': (payload, ctx) => auth.bindPhone(payload, ctx),
  'auth.updateProfile': (payload, ctx) => auth.updateProfile(payload, ctx),
  'pets.listMine': (payload, ctx) => pets.listMine(payload, ctx),
  'pets.get': (payload, ctx) => pets.get(payload, ctx),
  'pets.save': (payload, ctx) => pets.save(payload, ctx),
  'buddy_posts.listFeed': (payload, ctx) => buddyPosts.listFeed(payload, ctx),
  'buddy_posts.listMine': (payload, ctx) => buddyPosts.listMine(payload, ctx),
  'buddy_posts.get': (payload, ctx) => buddyPosts.get(payload, ctx),
  'buddy_posts.save': (payload, ctx) => buddyPosts.save(payload, ctx),
  'buddy_posts.remove': (payload, ctx) => buddyPosts.remove(payload, ctx),
  'social_posts.listFeed': (payload, ctx) => socialPosts.listFeed(payload, ctx),
  'social_posts.listMine': (payload, ctx) => socialPosts.listMine(payload, ctx),
  'social_posts.get': (payload, ctx) => socialPosts.get(payload, ctx),
  'social_posts.save': (payload, ctx) => socialPosts.save(payload, ctx),
  'social_posts.remove': (payload, ctx) => socialPosts.remove(payload, ctx),
  'social_comments.listByPost': (payload, ctx) => socialComments.listByPost(payload, ctx),
  'social_comments.save': (payload, ctx) => socialComments.save(payload, ctx),
  'social_comments.remove': (payload, ctx) => socialComments.remove(payload, ctx),
  'local_posts.listFeed': (payload, ctx) => localPosts.listFeed(payload, ctx),
  'local_posts.listMine': (payload, ctx) => localPosts.listMine(payload, ctx),
  'local_posts.get': (payload, ctx) => localPosts.get(payload, ctx),
  'local_posts.save': (payload, ctx) => localPosts.save(payload, ctx),
  'local_posts.remove': (payload, ctx) => localPosts.remove(payload, ctx),
  'events.listFeed': (payload, ctx) => eventsHandler.listFeed(payload, ctx),
  'events.listMine': (payload, ctx) => eventsHandler.listMine(payload, ctx),
  'events.get': (payload, ctx) => eventsHandler.get(payload, ctx),
  'events.save': (payload, ctx) => eventsHandler.save(payload, ctx),
  'events.remove': (payload, ctx) => eventsHandler.remove(payload, ctx),
  'events.recordInterest': (payload, ctx) => eventsHandler.recordInterest(payload, ctx),
  'event_signups.listMine': (payload, ctx) => eventSignupsHandler.listMine(payload, ctx),
  'event_signups.getMyByEvent': (payload, ctx) => eventSignupsHandler.getMyByEvent(payload, ctx),
  'event_signups.get': (payload, ctx) => eventSignupsHandler.get(payload, ctx),
  'event_signups.save': (payload, ctx) => eventSignupsHandler.save(payload, ctx),
  'event_signups.remove': (payload, ctx) => eventSignupsHandler.remove(payload, ctx),
  'event_signups.listByEvent': (payload, ctx) => eventSignupsHandler.listByEvent(payload, ctx),
  'event_signups.checkIn': (payload, ctx) => eventSignupsHandler.checkIn(payload, ctx),
  'event_qualify.getMine': (payload, ctx) => eventQualifyHandler.getMine(payload, ctx),
  'event_qualify.submit': (payload, ctx) => eventQualifyHandler.submit(payload, ctx),
  'map_points.listFeed': (payload, ctx) => mapPointsHandler.listFeed(payload, ctx),
  'map_points.listMine': (payload, ctx) => mapPointsHandler.listMine(payload, ctx),
  'map_points.get': (payload, ctx) => mapPointsHandler.get(payload, ctx),
  'map_points.save': (payload, ctx) => mapPointsHandler.save(payload, ctx),
  'map_points.remove': (payload, ctx) => mapPointsHandler.remove(payload, ctx),
  'merchants.listFeed': (payload, ctx) => merchantsHandler.listFeed(payload, ctx),
  'merchants.listMine': (payload, ctx) => merchantsHandler.listMine(payload, ctx),
  'merchants.get': (payload, ctx) => merchantsHandler.get(payload, ctx),
  'merchants.save': (payload, ctx) => merchantsHandler.save(payload, ctx),
  'merchants.remove': (payload, ctx) => merchantsHandler.remove(payload, ctx),
  'merchant_applies.getMine': (payload, ctx) => merchantAppliesHandler.getMine(payload, ctx),
  'merchant_applies.submit': (payload, ctx) => merchantAppliesHandler.submit(payload, ctx),
  'merchant_applies.remove': (payload, ctx) => merchantAppliesHandler.remove(payload, ctx),
  'host_applies.getMine': (payload, ctx) => hostAppliesHandler.getMine(payload, ctx),
  'host_applies.submit': (payload, ctx) => hostAppliesHandler.submit(payload, ctx),
  'host_applies.remove': (payload, ctx) => hostAppliesHandler.remove(payload, ctx),
  'clubs.listFeed': (payload, ctx) => clubsHandler.listFeed(payload, ctx),
  'clubs.listMine': (payload, ctx) => clubsHandler.listMine(payload, ctx),
  'clubs.get': (payload, ctx) => clubsHandler.get(payload, ctx),
  'clubs.save': (payload, ctx) => clubsHandler.save(payload, ctx),
  'clubs.remove': (payload, ctx) => clubsHandler.remove(payload, ctx),
  'club_members.listMine': (payload, ctx) => clubMembersHandler.listMine(payload, ctx),
  'club_members.listByClub': (payload, ctx) => clubMembersHandler.listByClub(payload, ctx),
  'club_members.join': (payload, ctx) => clubMembersHandler.join(payload, ctx),
  'club_members.leave': (payload, ctx) => clubMembersHandler.leave(payload, ctx),
  'pet_certs_public.get': (payload, ctx) => petCertsPublicHandler.get(payload, ctx),
  'pet_certs_public.listMine': (payload, ctx) => petCertsPublicHandler.listMine(payload, ctx),
  'pet_certs_public.publish': (payload, ctx) => petCertsPublicHandler.publish(payload, ctx),
  'pet_certs_public.remove': (payload, ctx) => petCertsPublicHandler.remove(payload, ctx),
  'banners.listFeed': (payload, ctx) => bannersHandler.listFeed(payload, ctx),
  'banners.get': (payload, ctx) => bannersHandler.get(payload, ctx),
  'banners.save': (payload, ctx) => bannersHandler.save(payload, ctx),
  'banners.remove': (payload, ctx) => bannersHandler.remove(payload, ctx),
  'splash_ads.listFeed': (payload, ctx) => splashAdsHandler.listFeed(payload, ctx),
  'splash_ads.getActive': (payload, ctx) => splashAdsHandler.getActive(payload, ctx),
  'splash_ads.get': (payload, ctx) => splashAdsHandler.get(payload, ctx),
  'splash_ads.save': (payload, ctx) => splashAdsHandler.save(payload, ctx),
  'splash_ads.remove': (payload, ctx) => splashAdsHandler.remove(payload, ctx),
  'points_ledger.listMine': (payload, ctx) => pointsLedgerHandler.listMine(payload, ctx),
  'points_ledger.getSummary': (payload, ctx) => pointsLedgerHandler.getSummary(payload, ctx),
  'points_ledger.credit': (payload, ctx) => pointsLedgerHandler.credit(payload, ctx),
  'sensitive_words.listActive': (payload, ctx) => sensitiveWordsHandler.listActive(payload, ctx),
  'sensitive_words.check': (payload, ctx) => sensitiveWordsHandler.check(payload, ctx),
  'sensitive_words.listFeed': (payload, ctx) => sensitiveWordsHandler.listFeed(payload, ctx),
  'sensitive_words.save': (payload, ctx) => sensitiveWordsHandler.save(payload, ctx),
  'sensitive_words.remove': (payload, ctx) => sensitiveWordsHandler.remove(payload, ctx),
  'admin.login': (payload, ctx) => adminHandler.login(payload, ctx),
  'admin.me': (payload, ctx) => adminHandler.me(payload, ctx),
  'admin_users.listFeed': (payload, ctx) => adminUsersHandler.listFeed(payload, ctx),
  'admin_users.get': (payload, ctx) => adminUsersHandler.get(payload, ctx),
  'admin_users.save': (payload, ctx) => adminUsersHandler.save(payload, ctx),
  'admin_users.remove': (payload, ctx) => adminUsersHandler.remove(payload, ctx),
  'pet_discover_likes.getSummary': (payload, ctx) => petDiscoverLikesHandler.getSummary(payload, ctx),
  'pet_discover_likes.listMine': (payload, ctx) => petDiscoverLikesHandler.listMine(payload, ctx),
  'pet_discover_likes.getQuota': (payload, ctx) => petDiscoverLikesHandler.getQuota(payload, ctx),
  'pet_discover_likes.swipe': (payload, ctx) => petDiscoverLikesHandler.swipe(payload, ctx),
  'pet_discover_likes.addShareBonus': (payload, ctx) => petDiscoverLikesHandler.addShareBonus(payload, ctx),
  'pet_discover_likes.remove': (payload, ctx) => petDiscoverLikesHandler.remove(payload, ctx),
  'chat_threads.listMine': (payload, ctx) => chatThreadsHandler.listMine(payload, ctx),
  'chat_threads.ensure': (payload, ctx) => chatThreadsHandler.ensure(payload, ctx),
  'chat_threads.markRead': (payload, ctx) => chatThreadsHandler.markRead(payload, ctx),
  'chat_messages.listByThread': (payload, ctx) => chatMessagesHandler.listByThread(payload, ctx),
  'chat_messages.send': (payload, ctx) => chatMessagesHandler.send(payload, ctx),
};

const PLANNED = [
  'pets.*',
  'admin.reviewMapPoint',
  'admin.reviewMerchantApply',
  'admin.reviewHostApply',
  'admin.moderatePost',
];

async function route(event) {
  const module = event.module || '';
  const action = event.action || '';
  const payload = event.payload || {};
  const key = `${module}.${action}`;

  const handler = ROUTES[key];
  if (!handler) {
    return fail(501, `接口未实现: ${key}`, { planned: PLANNED });
  }

  const wxContext = cloud.getWXContext();
  try {
    return await handler(payload, wxContext);
  } catch (e) {
    console.error('[api]', key, e);
    return fail(500, e.message || '服务器错误');
  }
}

module.exports = { route, ROUTES, PLANNED };
