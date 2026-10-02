/**
 * 宠头头 · 宠物交友本地数据层
 */

const { MOCK_CHATS } = require('./mock');
const { getNextStep } = require('./event-qualify');
const { seedCircleMessages } = require('./circle-community');

const KEYS = {
  pets: 'social_pets',
  socialPosts: 'mvp_social_posts',
  buddyPosts: 'mvp_buddy_posts',
  eventSignups: 'mvp_event_signups',
  myEvents: 'mvp_my_events',
  eventsCloud: 'mvp_events_cloud',
  localPosts: 'mvp_local_posts',
  mapPoints: 'mvp_map_points',
  merchants: 'mvp_merchants',
  serviceBooks: 'mvp_service_books',
  messages: 'mvp_messages',
  follows: 'social_follows',
  followersOfMe: 'social_followers_of_me',
  chatThreads: 'social_chat_threads',
  chatMessages: 'social_chat_messages',
  city: 'mvp_current_city',
  cityLocation: 'mvp_city_location',
  eventMerchantApply: 'mvp_event_merchant_apply',
  merchantShopApply: 'mvp_merchant_shop_apply',
  eventIdentityVerify: 'mvp_event_identity_verify',
  eventQualifyCloud: 'mvp_event_qualify_cloud',
  eventDeposits: 'mvp_event_deposits',
  circleMessages: 'mvp_circle_messages',
  clubApply: 'mvp_club_apply',
  joinedClubs: 'mvp_joined_clubs',
  clubsFeed: 'mvp_clubs_feed',
  clubsMine: 'mvp_clubs_mine',
  homeBanners: 'mvp_home_banners',
  splashAdCache: 'mvp_splash_ad_cache',
  petLikes: 'mvp_pet_likes',
  profileTags: 'mvp_profile_pet_tags',
  userProfile: 'mvp_user_profile',
  petCertPublic: 'mvp_pet_cert_public',
  userPoints: 'mvp_user_points',
  collects: 'social_collects',
  heartLikes: 'profile_heart_likes',
  postThumbLikes: 'profile_post_thumb_likes',
};

const MAP_MARK_POINTS_REWARD = 5;

const PET_LIKE_DAILY_BASE = 20;
const PET_LIKE_SHARE_BONUS = 10;
const PET_LIKE_SHARE_MAX = 3;

function petLikeToday() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function getPetLikes() {
  const row = read(KEYS.petLikes, null);
  if (!row || row.date !== petLikeToday()) {
    return { date: petLikeToday(), items: [], bonus: 0, used: 0, shareCount: 0 };
  }
  if (typeof row.bonus !== 'number') row.bonus = 0;
  if (typeof row.used !== 'number') {
    row.used = Array.isArray(row.items) ? row.items.length : 0;
  }
  if (typeof row.shareCount !== 'number') {
    row.shareCount = Math.min(
      PET_LIKE_SHARE_MAX,
      Math.floor((row.bonus || 0) / PET_LIKE_SHARE_BONUS)
    );
  }
  return row;
}

function petLikeDailyLimit(row) {
  return PET_LIKE_DAILY_BASE + (row.bonus || 0);
}

/** 左滑 / 右滑均消耗 1 次；右滑 asLike 时写入喜欢列表 */
function consumePetSwipe({ pet, asLike }) {
  const row = getPetLikes();
  const limit = petLikeDailyLimit(row);
  if (row.used >= limit) return { ok: false, quota: true };
  row.used += 1;
  if (asLike && pet) {
    const exists = row.items.some((x) => String(x.id) === String(pet.id));
    if (!exists) {
      row.items.push({
        id: pet.id,
        userName: pet.userName,
        petName: pet.petName,
        breed: pet.breed,
        avatar: pet.cover || pet.avatar,
        distance: pet.distance,
        likedAt: new Date().toISOString(),
      });
      setHeartLike({
        id: pet.id,
        source: 'discover',
        userName: pet.userName,
        petName: pet.petName,
        avatar: pet.cover || pet.avatar,
      }, true);
    }
  }
  write(KEYS.petLikes, row);
  return { ok: true };
}

function addPetLike(pet) {
  return consumePetSwipe({ pet, asLike: true });
}

function petLikeQuota() {
  const row = getPetLikes();
  const limit = petLikeDailyLimit(row);
  const used = row.used || 0;
  return {
    used,
    limit,
    left: Math.max(0, limit - used),
    likedCount: row.items.length,
    base: PET_LIKE_DAILY_BASE,
    bonus: row.bonus || 0,
    shareCount: row.shareCount || 0,
    shareMax: PET_LIKE_SHARE_MAX,
    shareLeft: Math.max(0, PET_LIKE_SHARE_MAX - (row.shareCount || 0)),
  };
}

function mapCloudLikeItem(entry) {
  if (!entry) return null;
  const id = entry.id != null ? entry.id : entry.targetId;
  if (id == null) return null;
  return {
    id: String(id),
    userName: entry.userName || '宠友',
    petName: entry.petName || '',
    breed: entry.breed || '',
    avatar: entry.avatar || '',
    distance: entry.distance || '',
    likedAt: entry.likedAt || new Date().toISOString(),
  };
}

function applyPetDiscoverQuota(quota) {
  if (!quota) return getPetLikes();
  const row = getPetLikes();
  const next = {
    date: quota.date || petLikeToday(),
    items: Array.isArray(row.items) ? row.items : [],
    used: quota.used != null ? Number(quota.used) : row.used || 0,
    bonus: quota.bonus != null ? Number(quota.bonus) : row.bonus || 0,
    shareCount: quota.shareCount != null ? Number(quota.shareCount) : row.shareCount || 0,
  };
  write(KEYS.petLikes, next);
  return next;
}

function applyPetDiscoverFromCloud(data) {
  if (!data) return getPetLikes();
  const items = (data.items || data.list || [])
    .map(mapCloudLikeItem)
    .filter(Boolean);
  const q = data.quota || {};
  const row = {
    date: q.date || petLikeToday(),
    items: items.slice(0, 80),
    used: q.used != null ? Number(q.used) : 0,
    bonus: q.bonus != null ? Number(q.bonus) : 0,
    shareCount: q.shareCount != null ? Number(q.shareCount) : 0,
  };
  write(KEYS.petLikes, row);
  return row;
}

/** 分享好友/朋友圈成功后调用，当日额度 +10，每天最多 3 次 */
function addPetLikeShareBonus() {
  const row = getPetLikes();
  const shareCount = row.shareCount || 0;
  if (shareCount >= PET_LIKE_SHARE_MAX) {
    const limit = petLikeDailyLimit(row);
    return {
      ok: false,
      capped: true,
      added: 0,
      bonus: row.bonus || 0,
      shareCount,
      shareLeft: 0,
      limit,
      left: Math.max(0, limit - (row.used || 0)),
    };
  }
  row.shareCount = shareCount + 1;
  row.bonus = (row.bonus || 0) + PET_LIKE_SHARE_BONUS;
  write(KEYS.petLikes, row);
  const limit = petLikeDailyLimit(row);
  return {
    ok: true,
    added: PET_LIKE_SHARE_BONUS,
    bonus: row.bonus,
    shareCount: row.shareCount,
    shareLeft: Math.max(0, PET_LIKE_SHARE_MAX - row.shareCount),
    limit,
    left: Math.max(0, limit - (row.used || 0)),
  };
}

function read(key, fallback) {
  try {
    const val = wx.getStorageSync(key);
    return val === '' || val === undefined || val === null ? fallback : val;
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  wx.setStorageSync(key, value);
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function pushMessage(title, content, type, extra) {
  const list = read(KEYS.messages, []);
  list.unshift({
    id: uid('msg'),
    title,
    content,
    type: type || 'system',
    read: false,
    createdAt: new Date().toISOString(),
    ...(extra || {}),
  });
  write(KEYS.messages, list.slice(0, 80));
}

/**
 * 组装活动报名通知文案
 * @param {object} event 活动或报名记录
 * @returns {{ title: string, content: string, lines: string[] }}
 */
function buildEventSignupNotice(event) {
  const title = event.title || '同城宠物活动';
  const time = event.time || '时间待定';
  const place = event.place || event.placeAddress || '地点待定';
  const lines = [`已报名「${title}」`, `时间：${time}`, `地点：${place}`];
  if (event.contactName || event.petName) {
    lines.push(`报名：${event.contactName || '宠友'} · ${event.petName || '宠物'}`);
  }
  if (event.fee) lines.push(`费用：${event.fee}`);
  return {
    title: '活动报名成功',
    content: lines.join('\n'),
    lines,
  };
}

function makeTicketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * 生成核销二维码文本，包含活动、报名人和宠物信息
 * @param {object} signup 报名记录
 * @returns {string}
 */
function buildTicketPayload(signup) {
  const person = signup.contactName || '宠友';
  const phone = signup.phone || '未填写';
  const pet = signup.petName || '宠物';
  const breed = signup.petBreed ? ` · ${signup.petBreed}` : '';
  return [
    '【宠头头核销】',
    `活动：${signup.title || ''}`,
    `姓名：${person}`,
    `手机：${phone}`,
    `宠物：${pet}${breed}`,
    `核销码：${signup.ticketCode || ''}`,
  ].join('\n');
}

function getEventSignupByEventId(eventId) {
  return listEventSignups().find((x) => String(x.eventId) === String(eventId)) || null;
}

/**
 * 补全旧报名记录的核销码与人宠信息
 * @param {string} eventId 活动 id
 * @param {object} [profile] 姓名/手机/宠物
 * @returns {object|null}
 */
function ensureEventSignupTicket(eventId, profile) {
  const list = listEventSignups();
  const idx = list.findIndex((x) => String(x.eventId) === String(eventId));
  if (idx < 0) return null;
  const row = list[idx];
  const next = {
    ...row,
    ticketCode: row.ticketCode || makeTicketCode(),
    contactName: row.contactName || (profile && profile.contactName) || '',
    phone: row.phone || (profile && profile.phone) || '',
    petName: row.petName || (profile && profile.petName) || '',
    petBreed: row.petBreed || (profile && profile.petBreed) || '',
    checkedIn: !!row.checkedIn,
  };
  list[idx] = next;
  write(KEYS.eventSignups, list);
  return next;
}

/** —— 宠物档案 —— */
function listPets() {
  return read(KEYS.pets, []);
}

function savePets(pets) {
  write(KEYS.pets, pets);
}

function getPet(id) {
  return listPets().find((p) => String(p.id) === String(id));
}

function listPublicPetCerts() {
  return read(KEYS.petCertPublic, {});
}

function normalizePetAuditStatus(pet) {
  if (!pet) return null;
  const s = pet.auditStatus;
  if (s === 'pending' || s === 'approved' || s === 'rejected' || s === 'hidden') return s;
  return 'approved';
}

function isPetAuditApproved(pet) {
  const s = normalizePetAuditStatus(pet);
  return s === 'approved' || s === 'pending';
}

function registerPublicPetCert(pet) {
  if (!pet || !pet.id) return null;
  if (!isPetAuditApproved(pet)) return null;
  const { buildPublicPetCertSnapshot } = require('./pet-cert-qrcode');
  const snap = buildPublicPetCertSnapshot(pet);
  const map = listPublicPetCerts();
  map[String(pet.id)] = snap;
  write(KEYS.petCertPublic, map);
  return snap;
}

function getPublicPetCert(id) {
  if (!id) return null;
  const map = listPublicPetCerts();
  return map[String(id)] || null;
}

function addPet(pet) {
  const pets = listPets();
  const row = {
    id: uid('pet'),
    avatarUrl: '/assets/mock/real_avatar.jpg',
    personality: '活泼友好',
    socialTags: [],
    rejectReason: '',
    certPublished: false,
    ...pet,
    auditStatus: pet.auditStatus || 'approved',
    createdAt: new Date().toISOString(),
  };
  pets.unshift(row);
  savePets(pets);
  registerPublicPetCert(row);
  pushMessage('档案已保存', '宠物档案已更新，可使用搭子、活动与社区互动', 'system');
  return row;
}

function updatePet(id, patch) {
  const prev = getPet(id);
  const nextAudit = patch.auditStatus != null
    ? patch.auditStatus
    : (prev && prev.auditStatus ? prev.auditStatus : 'approved');
  const mergedPatch = {
    ...patch,
    auditStatus: nextAudit === 'pending' ? 'approved' : nextAudit,
    ...(nextAudit === 'rejected' || nextAudit === 'hidden' ? {} : { rejectReason: '' }),
  };
  const pets = listPets().map((p) => (String(p.id) === String(id) ? { ...p, ...mergedPatch } : p));
  savePets(pets);
  const row = getPet(id);
  if (row) registerPublicPetCert(row);
  return row;
}

/** 云数据库档案同步到本地缓存（保留 cloud 文档 id） */
function upsertPetFromCloud(pet) {
  if (!pet || !pet.id) return null;
  const row = {
    personality: '活泼友好',
    socialTags: [],
    rejectReason: '',
    certPublished: false,
    auditStatus: 'approved',
    ...pet,
    id: String(pet.id),
    breedName: pet.breedName || pet.breed,
    avatarUrl: pet.avatarUrl || pet.avatar || '',
  };
  const pets = listPets();
  const idx = pets.findIndex((p) => String(p.id) === String(row.id));
  if (idx >= 0) {
    pets[idx] = { ...pets[idx], ...row };
  } else {
    pets.unshift(row);
  }
  savePets(pets);
  registerPublicPetCert(row);
  return row;
}

function replaceAllPetsFromCloud(pets) {
  const list = (pets || []).map((pet) => ({
    personality: '活泼友好',
    socialTags: pet.socialTags || [],
    rejectReason: pet.rejectReason || '',
    certPublished: !!pet.certPublished,
    auditStatus: pet.auditStatus || 'approved',
    ...pet,
    id: String(pet.id),
    breedName: pet.breedName || pet.breed,
    avatarUrl: pet.avatarUrl || pet.avatar || '',
  }));
  savePets(list);
  list.forEach((row) => registerPublicPetCert(row));
  return list;
}

/** —— 动态 —— */
function listSocialPosts() {
  return read(KEYS.socialPosts, []);
}

function mapSocialFromCloud(post) {
  return {
    time: '刚刚',
    likes: post.likes || 0,
    comments: post.comments || 0,
    shares: post.shares || 0,
    liked: !!post.liked,
    essence: !!post.essence,
    ...post,
    id: String(post.id),
    createdAt: post.createdAt || new Date().toISOString(),
  };
}

function upsertSocialPostFromCloud(post) {
  if (!post || !post.id) return null;
  const row = mapSocialFromCloud(post);
  const list = listSocialPosts();
  const idx = list.findIndex((p) => String(p.id) === String(row.id));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...row };
  } else {
    list.unshift(row);
  }
  write(KEYS.socialPosts, list.slice(0, 80));
  return row;
}

function replaceAllSocialPostsFromCloud(posts) {
  const list = (posts || []).map(mapSocialFromCloud);
  write(KEYS.socialPosts, list);
  return list;
}

function addSocialPost(post) {
  const list = listSocialPosts();
  const row = {
    id: uid('post'),
    time: '刚刚',
    likes: 0,
    comments: 0,
    shares: 0,
    liked: false,
    essence: false,
    userName: '我',
    ...post,
  };
  list.unshift(row);
  write(KEYS.socialPosts, list.slice(0, 80));
  pushMessage('动态发布成功', '你的新动态已在宠物社区展示', 'social');
  return row;
}

function getSocialPost(id) {
  return listSocialPosts().find((p) => String(p.id) === String(id)) || null;
}

function isMyUserContent(row) {
  if (!row) return false;
  if (row.isMine === true || row.userName === '我') return true;
  try {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const openid = userInfo.openid;
    if (openid && (row.openid === openid || row._openid === openid)) return true;
  } catch (e) {
    // ignore
  }
  return false;
}

function deleteSocialPost(id) {
  const sid = String(id);
  const next = listSocialPosts().filter((p) => String(p.id) !== sid);
  write(KEYS.socialPosts, next);
  const comments = read('mvp_post_comments', {});
  if (comments[sid]) {
    delete comments[sid];
    write('mvp_post_comments', comments);
  }
  return true;
}

function updateSocialPost(id, patch) {
  const list = listSocialPosts();
  let found = false;
  const next = list.map((p) => {
    if (String(p.id) !== String(id)) return p;
    found = true;
    return { ...p, ...patch };
  });
  if (found) {
    write(KEYS.socialPosts, next);
    return next.find((p) => String(p.id) === String(id));
  }
  const overrides = read('mvp_social_overrides', {});
  overrides[id] = { ...(overrides[id] || {}), ...patch, id };
  write('mvp_social_overrides', overrides);
  return overrides[id];
}

function getSocialOverride(id) {
  return read('mvp_social_overrides', {})[id] || null;
}

function listPostComments(postId) {
  const all = read('mvp_post_comments', {});
  return all[postId] || [];
}

function mapCommentFromCloud(comment) {
  return {
    time: '刚刚',
    liked: false,
    ...comment,
    id: String(comment.id),
    createdAt: comment.createdAt || new Date().toISOString(),
  };
}

function replacePostCommentsFromCloud(postId, comments) {
  const pid = String(postId);
  const all = read('mvp_post_comments', {});
  all[pid] = (comments || []).map(mapCommentFromCloud);
  write('mvp_post_comments', all);
  return all[pid];
}

function upsertPostCommentFromCloud(postId, comment) {
  if (!comment || !comment.id) return null;
  const pid = String(postId);
  const row = mapCommentFromCloud(comment);
  const all = read('mvp_post_comments', {});
  const list = all[pid] || [];
  const idx = list.findIndex((c) => String(c.id) === String(row.id));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...row };
  } else {
    list.unshift(row);
  }
  all[pid] = list.slice(0, 100);
  write('mvp_post_comments', all);
  return row;
}

function removePostComment(postId, commentId) {
  const pid = String(postId);
  const cid = String(commentId);
  const all = read('mvp_post_comments', {});
  const list = (all[pid] || []).filter((c) => String(c.id) !== cid);
  all[pid] = list;
  write('mvp_post_comments', all);
  return true;
}

function addPostComment(postId, comment) {
  const all = read('mvp_post_comments', {});
  const list = all[postId] || [];
  const row = {
    id: uid('cmt'),
    userName: comment.userName || '我',
    avatar: comment.avatar || '/assets/mock/real_avatar.jpg',
    type: comment.type || 'text',
    content: comment.content || '',
    url: comment.url || '',
    poster: comment.poster || '',
    parentId: comment.parentId || '',
    replyToUserName: comment.replyToUserName || '',
    time: '刚刚',
    createdAt: new Date().toISOString(),
  };
  list.unshift(row);
  all[postId] = list.slice(0, 100);
  write('mvp_post_comments', all);
  return row;
}

/** —— 活动 —— */
function listEventSignups() {
  return read(KEYS.eventSignups, []);
}

function mapSignupFromCloud(signup) {
  return {
    noticeRead: false,
    checkedIn: !!signup.checkedIn,
    ...signup,
    id: String(signup.id),
    createdAt: signup.createdAt || new Date().toISOString(),
  };
}

function upsertSignupFromCloud(signup) {
  if (!signup || !signup.id) return null;
  const row = mapSignupFromCloud(signup);
  const list = listEventSignups();
  const idx = list.findIndex((s) => String(s.id) === String(row.id));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...row };
  } else {
    list.unshift(row);
  }
  write(KEYS.eventSignups, list);
  return row;
}

function replaceAllSignupsFromCloud(signups) {
  const list = (signups || []).map(mapSignupFromCloud);
  write(KEYS.eventSignups, list);
  return list;
}

function removeSignupFromCache(idOrEventId, byEventId) {
  const key = String(idOrEventId);
  const next = listEventSignups().filter((s) => (
    byEventId ? String(s.eventId) !== key : String(s.id) !== key
  ));
  write(KEYS.eventSignups, next);
  return true;
}

function addEventSignup(event, form) {
  const list = listEventSignups();
  const existed = list.find((x) => String(x.eventId) === String(event.id));
  if (existed) return { duplicated: true, signup: existed, list };
  const info = form || {};
  const row = {
    id: uid('ev'),
    eventId: event.id,
    title: event.title,
    place: event.place,
    placeAddress: event.placeAddress || '',
    location: event.location || null,
    locationLat: (event.location && event.location.latitude) || '',
    locationLng: (event.location && event.location.longitude) || '',
    time: event.time,
    fee: event.fee,
    cover: event.cover || '',
    contactName: (info.contactName || '').trim(),
    phone: (info.phone || '').trim(),
    petName: (info.petName || '').trim(),
    petBreed: (info.petBreed || '').trim(),
    ticketCode: makeTicketCode(),
    checkedIn: false,
    createdAt: new Date().toISOString(),
  };
  list.unshift(row);
  write(KEYS.eventSignups, list);
  const notice = buildEventSignupNotice(row);
  pushMessage(notice.title, notice.content, 'event', {
    eventId: event.id,
    url: `/pages/event-detail/event-detail?id=${event.id}&ticket=1`,
  });
  return { duplicated: false, signup: row, list };
}

/** —— 关注宠友 —— */
function listFollows() {
  return read(KEYS.follows, []);
}

function isFollowed(friendId) {
  return listFollows().some((f) => String(f.id) === String(friendId));
}

function listFollowersOfMe() {
  return read(KEYS.followersOfMe, []);
}

function upsertFollowerOfMe(friend) {
  if (!friend || friend.id == null) return listFollowersOfMe();
  const list = listFollowersOfMe();
  const idx = list.findIndex((f) => String(f.id) === String(friend.id));
  const row = {
    id: friend.id,
    userName: friend.userName || '宠友',
    petName: friend.petName || '',
    avatar: friend.avatar || '',
    followedAt: new Date().toISOString(),
  };
  if (idx >= 0) list[idx] = { ...list[idx], ...row };
  else list.unshift(row);
  write(KEYS.followersOfMe, list.slice(0, 50));
  return list;
}

function removeFollowerOfMe(friendId) {
  const next = listFollowersOfMe().filter((f) => String(f.id) !== String(friendId));
  write(KEYS.followersOfMe, next);
  return next;
}

/** 单向关注：我关注的人不应出现在我的粉丝里（清理旧版互关数据） */
function migrateOneWayFollowIfNeeded() {
  const flagKey = 'social_follow_one_way_v2';
  if (read(flagKey)) return;
  const followIds = new Set(listFollows().map((f) => String(f.id)));
  const next = listFollowersOfMe().filter((f) => !followIds.has(String(f.id)));
  write(KEYS.followersOfMe, next);
  write(flagKey, true);
}

/** 对方是否关注了我（单向粉丝，与「我是否关注对方」无关） */
function isFollowedByPeer(peerId) {
  migrateOneWayFollowIfNeeded();
  return listFollowersOfMe().some((f) => String(f.id) === String(peerId));
}

/** 是否互相关注（双方都是对方的粉丝），仅展示用 */
function isMutualFollow(peerId) {
  return isFollowed(peerId) && isFollowedByPeer(peerId);
}

function isMyBuddyPost(p) {
  const name = (p && p.userName) || '';
  return name === '我' || name === '';
}

function isMySocialPost(p) {
  const name = (p && p.userName) || '';
  return name === '我' || p.isMine === true;
}

function countReceivedLikesAndCollects() {
  let total = 0;
  listBuddyPosts().forEach((p) => {
    if (!isMyBuddyPost(p)) return;
    total += (p.likes || 0) + (p.collects || p.favorites || 0);
  });
  listSocialPosts().forEach((p) => {
    if (!isMySocialPost(p)) return;
    total += (p.likes || 0) + (p.collects || p.favorites || 0);
  });
  return total;
}

function getProfileSocialStats() {
  migrateOneWayFollowIfNeeded();
  return {
    following: listFollows().length,
    followers: listFollowersOfMe().length,
    likesAndCollects: countReceivedLikesAndCollects(),
  };
}

function toggleFollow(friend) {
  if (!friend || friend.id == null) return { followed: false, list: listFollows() };
  const list = listFollows();
  const idx = list.findIndex((f) => String(f.id) === String(friend.id));
  if (idx >= 0) {
    list.splice(idx, 1);
    write(KEYS.follows, list);
    return { followed: false, list };
  }
  list.unshift({
    id: friend.id,
    userName: friend.userName,
    petName: friend.petName,
    avatar: friend.avatar,
    followedAt: new Date().toISOString(),
  });
  write(KEYS.follows, list.slice(0, 50));
  pushMessage('关注成功', `你已关注 ${friend.userName} · ${friend.petName}`, 'social');
  return { followed: true, list };
}

/** —— 收藏搭子（与关注列表独立，便于「我的」汇总） —— */
function listCollects() {
  return read(KEYS.collects, []);
}

function isCollected(friendId) {
  return listCollects().some((f) => String(f.id) === String(friendId));
}

function toggleCollect(friend) {
  if (!friend || friend.id == null) return { collected: false, list: listCollects() };
  const list = listCollects();
  const idx = list.findIndex((f) => String(f.id) === String(friend.id));
  if (idx >= 0) {
    list.splice(idx, 1);
    write(KEYS.collects, list);
    return { collected: false, list };
  }
  list.unshift({
    id: friend.id,
    userName: friend.userName,
    petName: friend.petName,
    avatar: friend.avatar,
    collectedAt: new Date().toISOString(),
  });
  write(KEYS.collects, list.slice(0, 50));
  return { collected: true, list };
}

/** —— 爱心喜欢（私聊 / 搭搭等） —— */
function listHeartLikes() {
  return read(KEYS.heartLikes, []);
}

function isHeartLiked(targetId, source) {
  if (!targetId) return false;
  const sid = String(targetId);
  return listHeartLikes().some(
    (x) => String(x.id) === sid && (!source || x.source === source),
  );
}

function setHeartLike(entry, active) {
  if (!entry || entry.id == null) return listHeartLikes();
  const list = listHeartLikes();
  const sid = String(entry.id);
  const source = entry.source || 'chat';
  const idx = list.findIndex((x) => String(x.id) === sid && x.source === source);
  if (!active) {
    if (idx >= 0) {
      list.splice(idx, 1);
      write(KEYS.heartLikes, list);
    }
    return list;
  }
  const row = {
    id: entry.id,
    source,
    userName: entry.userName || '宠友',
    petName: entry.petName || '',
    avatar: entry.avatar || '',
    likedAt: entry.likedAt || new Date().toISOString(),
  };
  if (idx >= 0) list[idx] = { ...list[idx], ...row };
  else list.unshift(row);
  write(KEYS.heartLikes, list.slice(0, 80));
  return list;
}

/** —— 动态/搭子帖点赞 —— */
function recordPostThumbLike(payload) {
  const {
    channel, postId, liked, title, cover, userName, petName,
  } = payload || {};
  if (!channel || postId == null) return listPostThumbLikes();
  const all = read(KEYS.postThumbLikes, {});
  const key = `${channel}:${postId}`;
  if (!liked) {
    delete all[key];
    write(KEYS.postThumbLikes, all);
    return listPostThumbLikes();
  }
  all[key] = {
    channel,
    postId: String(postId),
    title: title || '内容',
    cover: cover || '',
    userName: userName || '宠友',
    petName: petName || '',
    likedAt: new Date().toISOString(),
  };
  write(KEYS.postThumbLikes, all);
  return listPostThumbLikes();
}

function listPostThumbLikes() {
  const all = read(KEYS.postThumbLikes, {});
  return Object.values(all).sort(
    (a, b) => new Date(b.likedAt || 0).getTime() - new Date(a.likedAt || 0).getTime(),
  );
}

/** —— 私信 —— */
function cloudEnabledForChat() {
  try {
    return require('./cloud-api').cloudEnabled();
  } catch (e) {
    return false;
  }
}

function ensureChatThreads() {
  let threads = read(KEYS.chatThreads, []);
  if (!threads.length && !cloudEnabledForChat()) {
    threads = MOCK_CHATS.map((t) => ({ ...t }));
    write(KEYS.chatThreads, threads);
  }
  return threads;
}

function listChatThreads() {
  return ensureChatThreads();
}

function ensureChatThread(thread) {
  if (!thread || !thread.peerId) return null;
  const threads = ensureChatThreads();
  const existing = threads.find((t) => String(t.peerId) === String(thread.peerId));
  if (existing) return existing;
  const row = {
    id: thread.id || `c_${thread.peerId}`,
    peerId: thread.peerId,
    peerName: thread.peerName || '用户',
    petName: thread.petName || '宠物',
    avatar: thread.avatar || '',
    lastMessage: thread.lastMessage || '',
    lastTime: thread.lastTime || '',
    unread: 0,
  };
  const next = [row, ...threads.filter((t) => String(t.peerId) !== String(thread.peerId))];
  write(KEYS.chatThreads, next.slice(0, 50));
  return row;
}

function getChatMessages(threadId) {
  const all = read(KEYS.chatMessages, {});
  return all[threadId] || [];
}

function chatMessagePreview(message) {
  const type = message.type || 'text';
  if (type === 'image') return '[图片]';
  if (type === 'video') return '[视频]';
  if (type === 'location') return `[位置] ${(message.location && message.location.name) || '位置分享'}`;
  if (type === 'aa') return `[AA收款] ¥${message.aaAmount || message.content || ''}`;
  if (type === 'event') return `[活动] ${message.eventTitle || message.content || ''}`;
  if (type === 'call') {
    if (message.callStatus === 'missed') return '[未接视频通话]';
    if (message.duration) return `[视频通话] ${message.duration}s`;
    return '[视频通话]';
  }
  if (type === 'shareComment') {
    return `[分享] ${message.shareTitle || message.content || '评论'}`;
  }
  return message.content || '';
}

function addChatMessage(threadId, message) {
  const all = read(KEYS.chatMessages, {});
  const list = all[threadId] || [];
  const row = {
    id: uid('chat'),
    from: message.from || 'me',
    type: message.type || 'text',
    content: message.content || '',
    url: message.url || '',
    poster: message.poster || '',
    location: message.location || null,
    callStatus: message.callStatus || '',
    duration: message.duration || 0,
    eventId: message.eventId || '',
    eventTitle: message.eventTitle || '',
    aaAmount: message.aaAmount || 0,
    aaPeople: message.aaPeople || 0,
    aaPer: message.aaPer || 0,
    shareTitle: message.shareTitle || '',
    shareRef: message.shareRef || '',
    time: '刚刚',
    createdAt: new Date().toISOString(),
  };
  list.push(row);
  all[threadId] = list.slice(-200);
  write(KEYS.chatMessages, all);

  const preview = chatMessagePreview(row);
  const threads = ensureChatThreads().map((t) => {
    if (String(t.id) !== String(threadId)) return t;
    return {
      ...t,
      lastMessage: preview,
      lastTime: '刚刚',
      unread: message.from === 'me' ? 0 : (t.unread || 0) + 1,
    };
  });
  write(KEYS.chatThreads, threads);
  return row;
}

function markThreadRead(threadId) {
  const threads = ensureChatThreads().map((t) =>
    String(t.id) === String(threadId) ? { ...t, unread: 0 } : t,
  );
  write(KEYS.chatThreads, threads);
}

function mapCloudThread(thread) {
  if (!thread) return null;
  return {
    id: thread.id,
    peerId: thread.peerId,
    peerName: thread.peerName || '宠友',
    petName: thread.petName || '宠物',
    avatar: thread.avatar || '',
    lastMessage: thread.lastMessage || '',
    lastTime: thread.lastTime || '刚刚',
    unread: thread.unread || 0,
  };
}

function replaceChatThreadsFromCloud(list) {
  const threads = (list || []).map(mapCloudThread).filter(Boolean);
  write(KEYS.chatThreads, threads.slice(0, 50));
  return threads;
}

function upsertChatThreadFromCloud(thread) {
  const row = mapCloudThread(thread);
  if (!row) return null;
  const threads = ensureChatThreads();
  const idx = threads.findIndex(
    (t) => String(t.id) === String(row.id) || String(t.peerId) === String(row.peerId),
  );
  if (idx >= 0) {
    threads[idx] = { ...threads[idx], ...row };
  } else {
    threads.unshift(row);
  }
  write(KEYS.chatThreads, threads.slice(0, 50));
  return row;
}

function setChatMessagesForThread(threadId, messages) {
  const all = read(KEYS.chatMessages, {});
  all[threadId] = (messages || []).slice(-200);
  write(KEYS.chatMessages, all);
  return all[threadId];
}

function appendChatMessageFromCloud(threadId, message) {
  if (!message) return null;
  const all = read(KEYS.chatMessages, {});
  const list = all[threadId] || [];
  if (list.some((m) => String(m.id) === String(message.id))) {
    return message;
  }
  list.push(message);
  all[threadId] = list.slice(-200);
  write(KEYS.chatMessages, all);
  return message;
}

/** —— 系统消息 —— */
function listMessages() {
  return read(KEYS.messages, []);
}

function markMessagesRead() {
  const list = listMessages().map((m) => ({ ...m, read: true }));
  write(KEYS.messages, list);
  const signups = listEventSignups().map((s) => ({ ...s, noticeRead: true }));
  write(KEYS.eventSignups, signups);
  return list;
}

function countUnreadNotices() {
  const { countUnreadNotices: count } = require('./notice-feed');
  return count();
}

function countUnreadChats() {
  return ensureChatThreads().reduce((sum, t) => sum + (t.unread || 0), 0);
}

function countUnreadMessages() {
  return countUnreadNotices() + countUnreadChats();
}

/** —— 搭子 —— */
function listBuddyPosts() {
  return read(KEYS.buddyPosts, []);
}

function addBuddyPost(post) {
  const list = listBuddyPosts();
  const row = {
    id: uid('bd'),
    time: '刚刚',
    userName: '我',
    verified: false,
    zone: 'normal',
    creditTags: [],
    ...post,
    createdAt: new Date().toISOString(),
  };
  list.unshift(row);
  write(KEYS.buddyPosts, list.slice(0, 50));
  pushMessage('搭子发布成功', '你的找搭子已展示在搭子广场', 'social');
  return row;
}

function getBuddyPost(id) {
  return listBuddyPosts().find((p) => String(p.id) === String(id)) || null;
}

function deleteBuddyPost(id) {
  const sid = String(id);
  const next = listBuddyPosts().filter((p) => String(p.id) !== sid);
  write(KEYS.buddyPosts, next);
  return true;
}

function mapBuddyFromCloud(post) {
  return {
    time: '刚刚',
    creditTags: post.creditTags || ['守约'],
    likes: post.likes || 0,
    comments: post.comments || 0,
    shares: post.shares || 0,
    ...post,
    id: String(post.id),
    createdAt: post.createdAt || new Date().toISOString(),
  };
}

function upsertBuddyPostFromCloud(post) {
  if (!post || !post.id) return null;
  const row = mapBuddyFromCloud(post);
  const list = listBuddyPosts();
  const idx = list.findIndex((p) => String(p.id) === String(row.id));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...row };
  } else {
    list.unshift(row);
  }
  write(KEYS.buddyPosts, list.slice(0, 80));
  return row;
}

function replaceAllBuddyPostsFromCloud(posts) {
  const list = (posts || []).map(mapBuddyFromCloud);
  write(KEYS.buddyPosts, list);
  return list;
}

function getBuddyOverride(id) {
  return read('mvp_buddy_overrides', {})[id] || null;
}

function updateBuddyEngagement(id, patch) {
  const list = listBuddyPosts();
  let found = false;
  const next = list.map((p) => {
    if (String(p.id) !== String(id)) return p;
    found = true;
    return { ...p, ...patch };
  });
  if (found) {
    write(KEYS.buddyPosts, next);
    return next.find((p) => String(p.id) === String(id));
  }
  const overrides = read('mvp_buddy_overrides', {});
  overrides[id] = { ...(overrides[id] || {}), ...patch, id };
  write('mvp_buddy_overrides', overrides);
  return overrides[id];
}

/** —— 本地帖子（寻宠/领养/互助） —— */
function listLocalPosts(type) {
  const all = read(KEYS.localPosts, []);
  return type ? all.filter((p) => p.type === type) : all;
}

function getLocalPost(id) {
  return listLocalPosts().find((p) => String(p.id) === String(id)) || null;
}

function deleteLocalPost(id) {
  const sid = String(id);
  const all = read(KEYS.localPosts, []);
  write(KEYS.localPosts, all.filter((p) => String(p.id) !== sid));
  return true;
}

function updateLocalPost(id, patch) {
  const list = read(KEYS.localPosts, []);
  let found = false;
  const next = list.map((p) => {
    if (String(p.id) !== String(id)) return p;
    found = true;
    return { ...p, ...patch };
  });
  if (found) {
    write(KEYS.localPosts, next);
    return next.find((p) => String(p.id) === String(id));
  }
  const overrides = read('mvp_local_overrides', {});
  overrides[id] = { ...(overrides[id] || {}), ...patch, id };
  write('mvp_local_overrides', overrides);
  return overrides[id];
}

function mapLocalFromCloud(post) {
  const overrides = read('mvp_local_overrides', {})[post.id] || {};
  return {
    time: '刚刚',
    isMine: !!post.isMine,
    userName: post.userName || '宠友',
    likes: post.likes || 0,
    comments: post.comments || 0,
    shares: post.shares || 0,
    liked: false,
    ...post,
    ...overrides,
    id: String(post.id),
    type: post.type || 'adopt',
    createdAt: post.createdAt || new Date().toISOString(),
  };
}

function upsertLocalPostFromCloud(post) {
  if (!post || !post.id) return null;
  const row = mapLocalFromCloud(post);
  const all = read(KEYS.localPosts, []);
  const idx = all.findIndex((p) => String(p.id) === String(row.id));
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...row };
  } else {
    all.unshift(row);
  }
  write(KEYS.localPosts, all.slice(0, 50));
  return row;
}

function replaceAllLocalPostsFromCloud(posts) {
  const list = (posts || []).map(mapLocalFromCloud);
  write(KEYS.localPosts, list);
  return list;
}

function addLocalPost(post) {
  const all = read(KEYS.localPosts, []);
  const row = {
    id: uid('lp'),
    time: '刚刚',
    isMine: true,
    userName: '我',
    ...post,
    createdAt: new Date().toISOString(),
  };
  all.unshift(row);
  write(KEYS.localPosts, all.slice(0, 50));
  pushMessage('发布成功', '信息已提交，将在同城展示', 'social');
  return row;
}

/** —— 用户积分（友好地图标记等） —— */
function getUserPointsRow() {
  const row = read(KEYS.userPoints, null);
  if (!row || typeof row.balance !== 'number') {
    return { balance: 0, logs: [] };
  }
  if (!Array.isArray(row.logs)) row.logs = [];
  return row;
}

function getUserPointsBalance() {
  return getUserPointsRow().balance;
}

function addUserPoints(amount, meta = {}) {
  const delta = Number(amount);
  if (!delta || Number.isNaN(delta)) return getUserPointsRow();
  const row = getUserPointsRow();
  row.balance = Math.max(0, (row.balance || 0) + delta);
  row.logs.unshift({
    id: uid('pt'),
    amount: delta,
    type: meta.type || 'other',
    title: meta.title || '积分变动',
    refId: meta.refId || '',
    createdAt: new Date().toISOString(),
  });
  row.logs = row.logs.slice(0, 100);
  write(KEYS.userPoints, row);
  return row;
}

function mapLedgerEntryToLog(entry) {
  if (!entry) return null;
  return {
    id: entry.id || uid('pt'),
    amount: Number(entry.amount) || 0,
    type: entry.type || 'other',
    title: entry.reason || entry.title || '积分变动',
    refId: entry.refId || '',
    createdAt: entry.createdAt || new Date().toISOString(),
  };
}

function applyPointsFromCloud(data) {
  if (!data) return getUserPointsRow();
  const balance = data.balance != null ? Math.max(0, Number(data.balance)) : getUserPointsBalance();
  const logs = (data.list || []).map(mapLedgerEntryToLog).filter(Boolean);
  write(KEYS.userPoints, {
    balance: Number.isNaN(balance) ? 0 : balance,
    logs: logs.slice(0, 100),
  });
  return getUserPointsRow();
}

/** —— 地图点位 —— */
function mapMapPointFromCloud(doc) {
  if (!doc) return null;
  const id = doc.id || doc._id;
  const type = doc.type || doc.category || '';
  return {
    id: String(id),
    name: doc.name || '',
    type,
    category: doc.category || type,
    allowPet: doc.allowPet !== false,
    danger: !!doc.danger,
    dangerDesc: doc.dangerDesc || '',
    address: doc.address || '',
    city: doc.city || '',
    latitude: Number(doc.latitude) || 0,
    longitude: Number(doc.longitude) || 0,
    distance: doc.distance || '',
    images: doc.images || [],
    rating: doc.rating,
    auditStatus: doc.auditStatus,
    isMine: !!doc.isMine,
    status: doc.auditStatus === 'approved' ? 'approved' : doc.auditStatus,
    createdAt: doc.createdAt,
  };
}

function replaceAllMapPointsFromCloud(points) {
  const list = (points || []).map(mapMapPointFromCloud).filter(Boolean);
  write(KEYS.mapPoints, list);
  return list;
}

function listMapPoints() {
  return read(KEYS.mapPoints, []);
}

function isValidMapMark(point) {
  if (!point) return false;
  if (!(String(point.name || '').trim() && String(point.address || '').trim())) return false;
  const lat = Number(point.latitude);
  const lng = Number(point.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return false;
  if (point.type === '宠物毒点' && !String(point.dangerDesc || '').trim()) return false;
  return true;
}

function mapMerchantFromCloud(doc) {
  if (!doc) return null;
  const id = doc.id || doc._id;
  const type = doc.type || doc.category || '';
  return {
    id: String(id),
    name: doc.name || '',
    city: doc.city || '',
    type,
    category: doc.category || type,
    rating: doc.rating != null ? doc.rating : 5,
    price: doc.price || '',
    cover: doc.cover || doc.logoUrl || '',
    logoUrl: doc.logoUrl || doc.cover || '',
    tags: doc.tags || [],
    intro: doc.intro || '',
    address: doc.address || '',
    contactName: doc.contactName || '',
    contactPhone: doc.contactPhone || '',
    bizStatus: doc.bizStatus,
    isMine: !!doc.isMine,
    createdAt: doc.createdAt,
  };
}

function listMerchants() {
  return read(KEYS.merchants, []);
}

function getMerchantFromCache(id) {
  const sid = String(id);
  return listMerchants().find((m) => String(m.id) === sid) || null;
}

function replaceAllMerchantsFromCloud(rows) {
  const list = (rows || []).map(mapMerchantFromCloud).filter(Boolean);
  write(KEYS.merchants, list);
  return list;
}

function upsertMerchantFromCloud(doc) {
  const row = mapMerchantFromCloud(doc);
  if (!row) return null;
  const list = listMerchants();
  const idx = list.findIndex((m) => String(m.id) === String(row.id));
  if (idx >= 0) list[idx] = { ...list[idx], ...row };
  else list.unshift(row);
  write(KEYS.merchants, list.slice(0, 100));
  return row;
}

function addMapPoint(point) {
  const list = listMapPoints();
  const row = { id: uid('mp'), status: 'approved', ...point, createdAt: new Date().toISOString() };
  if (!isValidMapMark(row)) {
    return { row: null, pointsAwarded: 0 };
  }
  list.unshift(row);
  write(KEYS.mapPoints, list.slice(0, 50));
  addUserPoints(MAP_MARK_POINTS_REWARD, {
    type: 'map_mark',
    refId: row.id,
    title: `友好地图标记「${row.name}」`,
  });
  pushMessage(
    '点位已发布',
    `已在友好地图展示，+${MAP_MARK_POINTS_REWARD} 积分`,
    'social',
  );
  return { row, pointsAwarded: MAP_MARK_POINTS_REWARD };
}

/** —— 活动发起 / 商家预约 —— */
function mapEventFromCloud(event) {
  return {
    auditStatus: 'approved',
    status: event.status || 'approved',
    isMine: !!event.isMine,
    ...event,
    id: String(event.id),
    createdAt: event.createdAt || new Date().toISOString(),
    publishedAt: event.publishedAt || event.createdAt || new Date().toISOString(),
  };
}

function listCloudEvents() {
  return read(KEYS.eventsCloud, []);
}

function upsertEventFromCloud(event) {
  if (!event || !event.id) return null;
  const row = mapEventFromCloud(event);
  const list = listCloudEvents();
  const idx = list.findIndex((e) => String(e.id) === String(row.id));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...row };
  } else {
    list.unshift(row);
  }
  write(KEYS.eventsCloud, list.slice(0, 120));
  const mine = listMyEvents();
  if (row.isMine) {
    const mi = mine.findIndex((e) => String(e.id) === String(row.id));
    if (mi >= 0) mine[mi] = { ...mine[mi], ...row };
    else mine.unshift(row);
    write(KEYS.myEvents, mine);
  }
  return row;
}

function replaceAllEventsFromCloud(events) {
  const list = (events || []).map(mapEventFromCloud);
  write(KEYS.eventsCloud, list);
  const mineIds = new Set(listMyEvents().map((e) => String(e.id)));
  list.filter((e) => e.isMine).forEach((e) => mineIds.add(String(e.id)));
  const mergedMine = list.filter((e) => e.isMine);
  mineIds.forEach((id) => {
    if (!mergedMine.some((e) => String(e.id) === id)) {
      const local = listMyEvents().find((e) => String(e.id) === id);
      if (local) mergedMine.push(local);
    }
  });
  if (mergedMine.length) write(KEYS.myEvents, mergedMine);
  return list;
}

function deleteCloudEvent(id) {
  const sid = String(id);
  write(KEYS.eventsCloud, listCloudEvents().filter((e) => String(e.id) !== sid));
  write(KEYS.myEvents, listMyEvents().filter((e) => String(e.id) !== sid));
  return true;
}

function listMyEvents() {
  const cloud = listCloudEvents().filter((e) => e.isMine);
  if (cloud.length) return cloud;
  return read(KEYS.myEvents, []);
}

function getMyEvent(id) {
  const sid = String(id);
  const fromCloud = listCloudEvents().find((e) => String(e.id) === sid);
  if (fromCloud) return fromCloud;
  return read(KEYS.myEvents, []).find((e) => String(e.id) === sid) || null;
}

function deleteMyEvent(id) {
  return deleteCloudEvent(id);
}

function getEventFromCache(id) {
  const sid = String(id);
  return listCloudEvents().find((e) => String(e.id) === sid) || getMyEvent(sid);
}

function addMyEvent(event) {
  const list = listMyEvents();
  const row = {
    id: uid('mev'),
    status: 'approved',
    auditStatus: 'approved',
    isMine: true,
    ...event,
    createdAt: new Date().toISOString(),
  };
  list.unshift(row);
  write(KEYS.myEvents, list);
  pushMessage('活动发布成功', '你的活动已上线，可生成海报邀请宠友', 'social');
  return row;
}

/** —— 活动发布资质 —— */
function getMerchantApply() {
  return read(KEYS.eventMerchantApply, null);
}

function submitMerchantApply(data) {
  const row = {
    id: uid('ema'),
    status: 'pending',
    companyName: data.companyName || '',
    licenseNo: data.licenseNo || '',
    legalPerson: data.legalPerson || '',
    contactPhone: data.contactPhone || '',
    licenseImage: data.licenseImage || '',
    idFrontImage: data.idFrontImage || '',
    idBackImage: data.idBackImage || '',
    shopFrontImage: data.shopFrontImage || '',
    submittedAt: new Date().toISOString(),
  };
  write(KEYS.eventMerchantApply, row);
  submitMerchantShopApply({
    shopName: data.companyName || data.shopName,
    ...data,
    contact: data.legalPerson || data.contact,
    phone: data.contactPhone || data.phone,
  });
  pushMessage('商家入驻申请已提交', '平台将审核营业资质，请耐心等待', 'system');
  return row;
}

function getMerchantShopApply() {
  const cache = read(KEYS.merchantShopApply, null);
  if (cache && cache.row) return cache.row;
  return null;
}

function submitMerchantShopApply(data) {
  const row = {
    id: uid('msa'),
    status: 'pending',
    shopName: data.shopName || data.companyName || '',
    contact: data.contact || data.legalPerson || '',
    phone: data.phone || data.contactPhone || '',
    city: data.city || getCity(),
    companyName: data.companyName || '',
    licenseNo: data.licenseNo || '',
    legalPerson: data.legalPerson || '',
    contactPhone: data.contactPhone || data.phone || '',
    licenseImage: data.licenseImage || '',
    idFrontImage: data.idFrontImage || '',
    idBackImage: data.idBackImage || '',
    shopFrontImage: data.shopFrontImage || '',
    address: data.address || '',
    intro: data.intro || '',
    submittedAt: new Date().toISOString(),
  };
  write(KEYS.merchantShopApply, {
    auditStatus: 'pending',
    row,
    syncedAt: new Date().toISOString(),
  });
  return row;
}

function applyMerchantApplyFromCloud(data) {
  if (!data) return null;
  const auditStatus = data.auditStatus || 'none';
  const pub = data.apply;
  const row = pub && pub.apply ? pub.apply : pub;
  write(KEYS.merchantShopApply, {
    auditStatus,
    row: row || null,
    syncedAt: new Date().toISOString(),
  });
  if (row && auditStatus !== 'none') {
    const legacy = {
      ...row,
      status: row.status || auditStatus,
    };
    write(KEYS.eventMerchantApply, legacy);
  }
  return row;
}

function clearMerchantShopApply() {
  write(KEYS.merchantShopApply, {
    auditStatus: 'none',
    row: null,
    syncedAt: new Date().toISOString(),
  });
}

function getIdentityVerify() {
  return read(KEYS.eventIdentityVerify, null);
}

function submitIdentityVerify(data) {
  const row = {
    id: uid('eiv'),
    status: 'pending',
    realName: data.realName || '',
    idCard: data.idCard || '',
    contactPhone: data.contactPhone || '',
    idFrontImage: data.idFrontImage || '',
    idBackImage: data.idBackImage || '',
    submittedAt: new Date().toISOString(),
  };
  write(KEYS.eventIdentityVerify, row);
  pushMessage('身份认证已提交', '后台审核通过后可发起个人活动', 'system');
  return row;
}

function mockApproveQualify(role) {
  if (role === 'merchant') {
    const apply = getMerchantApply();
    if (!apply || apply.status !== 'pending') return null;
    const next = { ...apply, status: 'approved', approvedAt: new Date().toISOString() };
    write(KEYS.eventMerchantApply, next);
    pushMessage('商家入驻审核通过', '可直接发布活动', 'system');
    return next;
  }
  const verify = getIdentityVerify();
  if (!verify || verify.status !== 'pending') return null;
  const next = { ...verify, status: 'approved', approvedAt: new Date().toISOString() };
  write(KEYS.eventIdentityVerify, next);
  pushMessage('身份认证审核通过', '可直接发布活动', 'system');
  return next;
}

/** —— 社区圈子 —— */
function listCircleMessages(circleId) {
  const all = read(KEYS.circleMessages, {});
  const stored = all[circleId] || [];
  const seed = seedCircleMessages(circleId);
  const seedIds = new Set(seed.map((m) => m.id));
  const userMsgs = stored.filter((m) => !seedIds.has(m.id));
  return [...userMsgs, ...seed].sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
}

function addCircleMessage(circleId, message) {
  const all = read(KEYS.circleMessages, {});
  const list = all[circleId] || [];
  const row = {
    id: uid('cm'),
    circleId,
    from: 'me',
    userName: message.userName || '我',
    petName: message.petName || '',
    avatar: message.avatar || '/assets/mock/real_avatar.jpg',
    topic: message.topic || '',
    content: message.content || '',
    mediaList: message.mediaList || [],
    time: '刚刚',
    createdAt: new Date().toISOString(),
  };
  list.unshift(row);
  all[circleId] = list.slice(0, 100);
  write(KEYS.circleMessages, all);
  return row;
}

function getCircleLastMessage(circleId) {
  const list = listCircleMessages(circleId);
  return list[0] || null;
}

function readQualifyCloudCache() {
  return read(KEYS.eventQualifyCloud, {});
}

function applyQualifyFromCloud(data) {
  if (!data || !data.role) return null;
  const r = data.role === 'merchant' ? 'merchant' : 'personal';
  const verifyStatus = data.verifyStatus || 'none';
  const verify = (data.qualify && data.qualify.verify) || data.verify || null;
  const canPublish = !!data.canPublish;
  const cache = readQualifyCloudCache();
  cache[r] = {
    verifyStatus,
    verify,
    canPublish,
    syncedAt: new Date().toISOString(),
  };
  write(KEYS.eventQualifyCloud, cache);
  if (verify) {
    const row = { ...verify, status: verifyStatus };
    if (r === 'merchant') write(KEYS.eventMerchantApply, row);
    else write(KEYS.eventIdentityVerify, row);
  }
  return getEventPublishQualify(r);
}

function getEventPublishQualify(role) {
  const r = role === 'merchant' ? 'merchant' : 'personal';
  const snap = readQualifyCloudCache()[r];
  if (snap && snap.syncedAt) {
    const verifyStatus = snap.verifyStatus || 'none';
    return {
      role: r,
      verifyStatus,
      verify: snap.verify || null,
      canPublish: !!snap.canPublish,
      nextStep: getNextStep(verifyStatus),
    };
  }
  let verifyStatus = 'none';
  let verify = null;
  if (r === 'merchant') {
    verify = getMerchantApply();
    verifyStatus = verify?.status || 'none';
  } else {
    verify = getIdentityVerify();
    verifyStatus = verify?.status || 'none';
  }
  const canPublish = verifyStatus === 'approved';
  return {
    role: r,
    verifyStatus,
    verify,
    canPublish,
    nextStep: getNextStep(verifyStatus),
  };
}

function listServiceBooks() {
  return read(KEYS.serviceBooks, []);
}

function addServiceBook(order) {
  const list = listServiceBooks();
  const row = { id: uid('sb'), status: '已预约', ...order, createdAt: new Date().toISOString() };
  list.unshift(row);
  write(KEYS.serviceBooks, list.slice(0, 50));
  pushMessage('预约成功', `已预约「${order.merchantName}」`, 'order');
  return row;
}

function getCityLocation() {
  const loc = read(KEYS.cityLocation, null);
  if (loc && loc.city) return loc;
  const legacy = read(KEYS.city, '北京');
  return {
    city: legacy,
    province: '',
    lat: 0,
    lng: 0,
    auto: false,
    updatedAt: '',
  };
}

function setCityLocation(location) {
  const row = {
    city: location.city || '北京',
    province: location.province || '',
    lat: location.lat || 0,
    lng: location.lng || 0,
    auto: !!location.auto,
    updatedAt: location.updatedAt || new Date().toISOString(),
  };
  write(KEYS.cityLocation, row);
  write(KEYS.city, row.city);
  return row;
}

function getCity() {
  return getCityLocation().city || '北京';
}

function mapBannerFromCloud(doc) {
  if (!doc) return null;
  const link = doc.link || doc.url || '';
  return {
    id: String(doc.id),
    title: doc.title || '',
    type: doc.type || 'official',
    cover: doc.cover || '',
    link,
    url: link,
    subtitle: doc.subtitle || '',
    tag: doc.tag || '',
    sortOrder: doc.sortOrder != null ? doc.sortOrder : 0,
  };
}

function listBannersCache() {
  return read(KEYS.homeBanners, []);
}

function replaceBannersFromCloud(list) {
  const rows = (list || []).map(mapBannerFromCloud).filter(Boolean);
  write(KEYS.homeBanners, rows);
  return rows;
}

function listHomeBanners() {
  const { MOCK_HOME } = require('./mock');
  const cloud = listBannersCache();
  if (cloud.length) return cloud;
  return MOCK_HOME.banners || [];
}

function mapSplashAdFromCloud(ad) {
  if (!ad) return null;
  return {
    id: String(ad.id),
    name: ad.name || '',
    imageUrl: ad.imageUrl || '',
    linkType: ad.linkType || 'none',
    linkTarget: ad.linkTarget || ad.url || '',
    url: ad.url || ad.linkTarget || '',
    durationSec: ad.durationSec != null ? ad.durationSec : 5,
    skippable: ad.skippable !== false,
    skipAfterSec: ad.skipAfterSec != null ? ad.skipAfterSec : 0,
    showRule: ad.showRule || 'oncePerDay',
    sortOrder: ad.sortOrder != null ? ad.sortOrder : 0,
    status: ad.status || 'online',
  };
}

function setSplashAdCache(ad) {
  const row = mapSplashAdFromCloud(ad);
  if (!row) return null;
  write(KEYS.splashAdCache, row);
  return row;
}

function getSplashAdCache() {
  const row = read(KEYS.splashAdCache, null);
  return row || null;
}

function getDefaultSplashAd() {
  const { MOCK_SPLASH_AD } = require('./mock');
  return MOCK_SPLASH_AD ? mapSplashAdFromCloud(MOCK_SPLASH_AD) : null;
}

function setDraft(key, data) {
  write(`mvp_draft_${key}`, { data, savedAt: new Date().toISOString() });
}

// 俱乐部：主理人入驻申请
function getClubApply() {
  return read(KEYS.clubApply, null);
}

function submitClubApply(data) {
  const row = {
    ...data,
    id: `club_${Date.now()}`,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };
  write(KEYS.clubApply, row);
  return row;
}

function clearClubApply() {
  write(KEYS.clubApply, null);
}

function mapClubFromCloud(doc) {
  if (!doc) return null;
  const id = doc.id || doc._id;
  const memberCount = doc.memberCount != null ? doc.memberCount : doc.members || 0;
  const onlineStatus = doc.onlineStatus || 'pending';
  return {
    id: String(id),
    name: doc.name || '',
    city: doc.city || '',
    intro: doc.intro || '',
    cover: doc.cover || '',
    members: memberCount,
    memberCount,
    eventCount: doc.eventCount != null ? doc.eventCount : 0,
    owner: doc.owner || doc.ownerNickname || '主理人',
    ownerNickname: doc.ownerNickname || doc.owner || '',
    onlineStatus,
    status: onlineStatus === 'online' ? 'approved' : onlineStatus,
    isMine: !!doc.isMine,
    isOwner: !!doc.isOwner,
    sourceApplyId: doc.sourceApplyId || '',
    createdAt: doc.createdAt,
  };
}

function listClubsFeed() {
  return read(KEYS.clubsFeed, []);
}

function listMyOwnedClubs() {
  return read(KEYS.clubsMine, []);
}

function getClubFromCache(id) {
  const sid = String(id);
  return listClubsFeed().find((c) => String(c.id) === sid)
    || listMyOwnedClubs().find((c) => String(c.id) === sid)
    || null;
}

function replaceClubsFeedFromCloud(list) {
  const rows = (list || []).map(mapClubFromCloud).filter(Boolean);
  write(KEYS.clubsFeed, rows);
  return rows;
}

function replaceMyOwnedClubsFromCloud(list) {
  const rows = (list || []).map(mapClubFromCloud).filter(Boolean);
  write(KEYS.clubsMine, rows);
  return rows;
}

function upsertClubInCache(club) {
  const row = mapClubFromCloud(club);
  if (!row) return null;
  const feed = listClubsFeed();
  const idx = feed.findIndex((c) => String(c.id) === String(row.id));
  if (idx >= 0) feed[idx] = { ...feed[idx], ...row };
  else if (row.onlineStatus === 'online') feed.unshift(row);
  write(KEYS.clubsFeed, feed.slice(0, 80));
  return row;
}

function upsertMyOwnedClub(club) {
  const row = mapClubFromCloud(club);
  if (!row) return null;
  const mine = listMyOwnedClubs();
  const idx = mine.findIndex((c) => String(c.id) === String(row.id));
  if (idx >= 0) mine[idx] = { ...mine[idx], ...row };
  else mine.unshift(row);
  write(KEYS.clubsMine, mine.slice(0, 20));
  upsertClubInCache(row);
  return row;
}

function applyHostApplyFromCloud(data) {
  if (!data || data.auditStatus === 'none' || !data.apply) {
    clearClubApply();
    return null;
  }
  const pub = data.apply;
  const row = pub.apply || pub;
  if (!row) {
    clearClubApply();
    return null;
  }
  const local = {
    id: row.id || pub.id,
    name: row.name || row.clubName || pub.clubName,
    city: row.city || pub.city,
    intro: row.intro || pub.intro,
    contact: row.contact || pub.contact || '',
    cover: row.cover || pub.cover,
    status: row.status || data.auditStatus || pub.auditStatus,
    submittedAt: row.submittedAt || pub.submittedAt,
  };
  write(KEYS.clubApply, local);
  return local;
}

// 俱乐部：加入/退出
function listJoinedClubs() {
  return read(KEYS.joinedClubs, []);
}

function isClubJoined(clubId) {
  return listJoinedClubs().some((c) => String(c.id) === String(clubId));
}

function joinClub(club) {
  const list = listJoinedClubs();
  if (list.some((c) => String(c.id) === String(club.id))) return list;
  const next = [...list, { ...club, joinedAt: new Date().toISOString() }];
  write(KEYS.joinedClubs, next);
  return next;
}

function leaveClub(clubId) {
  write(KEYS.joinedClubs, listJoinedClubs().filter((c) => String(c.id) !== String(clubId)));
}

function mapMemberToJoinedClub(member) {
  if (!member) return null;
  const club = member.club || {};
  const clubId = String(member.clubId || club.id || '');
  if (!clubId) return null;
  return {
    id: clubId,
    membershipId: member.membershipId || member.id,
    name: member.clubName || club.name || '俱乐部',
    city: club.city || member.clubCity || '',
    cover: club.cover || member.clubCover || '',
    intro: club.intro || member.clubIntro || '',
    role: member.role || 'member',
    joinedAt: member.joinedAt || new Date().toISOString(),
  };
}

function replaceJoinedClubsFromCloud(members) {
  const list = (members || [])
    .map(mapMemberToJoinedClub)
    .filter(Boolean);
  write(KEYS.joinedClubs, list);
  return list;
}

function upsertJoinedClubFromMember(member) {
  const row = mapMemberToJoinedClub(member);
  if (!row) return null;
  const list = listJoinedClubs();
  const idx = list.findIndex((c) => String(c.id) === String(row.id));
  if (idx >= 0) list[idx] = { ...list[idx], ...row };
  else list.push(row);
  write(KEYS.joinedClubs, list);
  return row;
}

function getDraft(key) {
  const row = read(`mvp_draft_${key}`, null);
  return row ? row.data : null;
}

function getProfileTags() {
  const row = read(KEYS.profileTags, null);
  if (!row || !Array.isArray(row.selected)) {
    return { selected: [], custom: [] };
  }
  return {
    selected: row.selected.slice(0, 8),
    custom: Array.isArray(row.custom) ? row.custom.slice(0, 8) : [],
  };
}

function setProfileTags(payload) {
  const selected = (payload.selected || []).slice(0, 8);
  const custom = (payload.custom || []).slice(0, 8);
  write(KEYS.profileTags, { selected, custom });
  return { selected, custom };
}

function getUserProfile() {
  const row = read(KEYS.userProfile, null);
  return {
    nickname: (row && row.nickname) || '',
    bio: (row && row.bio) || '',
  };
}

function setUserProfile(patch) {
  const prev = getUserProfile();
  const next = {
    nickname: patch.nickname !== undefined ? String(patch.nickname).trim() : prev.nickname,
    bio: patch.bio !== undefined ? String(patch.bio).trim() : prev.bio,
  };
  write(KEYS.userProfile, next);
  if (next.nickname) {
    const userInfo = wx.getStorageSync('userInfo') || {};
    wx.setStorageSync('userInfo', { ...userInfo, nickname: next.nickname });
  }
  return next;
}

function updateDefaultPetAvatar(avatarUrl) {
  if (!avatarUrl) return null;
  const pets = listPets();
  if (pets.length) {
    return updatePet(pets[0].id, { avatarUrl, avatar: avatarUrl });
  }
  return addPet({
    name: '我的宠物',
    species: 2,
    avatarUrl,
    avatar: avatarUrl,
  });
}

function setCity(city) {
  const prev = getCityLocation();
  return setCityLocation({ ...prev, city, auto: false });
}

module.exports = {
  KEYS,
  listPets,
  getPet,
  addPet,
  updatePet,
  upsertPetFromCloud,
  replaceAllPetsFromCloud,
  registerPublicPetCert,
  normalizePetAuditStatus,
  isPetAuditApproved,
  getPublicPetCert,
  listSocialPosts,
  upsertSocialPostFromCloud,
  replaceAllSocialPostsFromCloud,
  addSocialPost,
  getSocialPost,
  isMyUserContent,
  deleteSocialPost,
  updateSocialPost,
  getSocialOverride,
  listPostComments,
  replacePostCommentsFromCloud,
  upsertPostCommentFromCloud,
  removePostComment,
  addPostComment,
  listEventSignups,
  upsertSignupFromCloud,
  replaceAllSignupsFromCloud,
  removeSignupFromCache,
  addEventSignup,
  getEventSignupByEventId,
  ensureEventSignupTicket,
  buildEventSignupNotice,
  buildTicketPayload,
  listFollows,
  listFollowersOfMe,
  getProfileSocialStats,
  isFollowed,
  isFollowedByPeer,
  isMutualFollow,
  toggleFollow,
  listCollects,
  isCollected,
  toggleCollect,
  listHeartLikes,
  isHeartLiked,
  setHeartLike,
  recordPostThumbLike,
  listPostThumbLikes,
  listChatThreads,
  ensureChatThread,
  getChatMessages,
  addChatMessage,
  markThreadRead,
  replaceChatThreadsFromCloud,
  upsertChatThreadFromCloud,
  setChatMessagesForThread,
  appendChatMessageFromCloud,
  listMessages,
  markMessagesRead,
  countUnreadNotices,
  countUnreadChats,
  countUnreadMessages,
  pushMessage,
  listBuddyPosts,
  addBuddyPost,
  getBuddyPost,
  deleteBuddyPost,
  upsertBuddyPostFromCloud,
  replaceAllBuddyPostsFromCloud,
  getBuddyOverride,
  updateBuddyEngagement,
  listLocalPosts,
  upsertLocalPostFromCloud,
  replaceAllLocalPostsFromCloud,
  getLocalPost,
  deleteLocalPost,
  updateLocalPost,
  addLocalPost,
  mapMapPointFromCloud,
  replaceAllMapPointsFromCloud,
  listMapPoints,
  addMapPoint,
  mapMerchantFromCloud,
  listMerchants,
  getMerchantFromCache,
  replaceAllMerchantsFromCloud,
  upsertMerchantFromCloud,
  isValidMapMark,
  getUserPointsBalance,
  getUserPointsRow,
  applyPointsFromCloud,
  addUserPoints,
  MAP_MARK_POINTS_REWARD,
  listCloudEvents,
  upsertEventFromCloud,
  replaceAllEventsFromCloud,
  deleteCloudEvent,
  getEventFromCache,
  listMyEvents,
  getMyEvent,
  deleteMyEvent,
  addMyEvent,
  getMerchantApply,
  submitMerchantApply,
  getMerchantShopApply,
  submitMerchantShopApply,
  applyMerchantApplyFromCloud,
  clearMerchantShopApply,
  getIdentityVerify,
  submitIdentityVerify,
  mockApproveQualify,
  getEventPublishQualify,
  applyQualifyFromCloud,
  listCircleMessages,
  addCircleMessage,
  getCircleLastMessage,
  listServiceBooks,
  addServiceBook,
  getCity,
  listHomeBanners,
  replaceBannersFromCloud,
  mapBannerFromCloud,
  setSplashAdCache,
  getSplashAdCache,
  getDefaultSplashAd,
  mapSplashAdFromCloud,
  setCity,
  setDraft,
  getDraft,
  getPetLikes,
  addPetLike,
  consumePetSwipe,
  petLikeQuota,
  addPetLikeShareBonus,
  applyPetDiscoverFromCloud,
  applyPetDiscoverQuota,
  getClubApply,
  submitClubApply,
  clearClubApply,
  applyHostApplyFromCloud,
  listJoinedClubs,
  mapClubFromCloud,
  listClubsFeed,
  listMyOwnedClubs,
  getClubFromCache,
  replaceClubsFeedFromCloud,
  replaceMyOwnedClubsFromCloud,
  upsertClubInCache,
  upsertMyOwnedClub,
  isClubJoined,
  joinClub,
  leaveClub,
  mapMemberToJoinedClub,
  replaceJoinedClubsFromCloud,
  upsertJoinedClubFromMember,
  getCityLocation,
  setCityLocation,
  getProfileTags,
  setProfileTags,
  getUserProfile,
  setUserProfile,
  updateDefaultPetAvatar,
};
