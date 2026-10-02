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
  localPosts: 'mvp_local_posts',
  mapPoints: 'mvp_map_points',
  serviceBooks: 'mvp_service_books',
  messages: 'mvp_messages',
  follows: 'social_follows',
  followersOfMe: 'social_followers_of_me',
  chatThreads: 'social_chat_threads',
  chatMessages: 'social_chat_messages',
  city: 'mvp_current_city',
  cityLocation: 'mvp_city_location',
  eventMerchantApply: 'mvp_event_merchant_apply',
  eventIdentityVerify: 'mvp_event_identity_verify',
  eventDeposits: 'mvp_event_deposits',
  circleMessages: 'mvp_circle_messages',
  clubApply: 'mvp_club_apply',
  joinedClubs: 'mvp_joined_clubs',
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

/** —— 动态 —— */
function listSocialPosts() {
  return read(KEYS.socialPosts, []);
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
  return row.userName === '我' || row.isMine === true;
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
function ensureChatThreads() {
  let threads = read(KEYS.chatThreads, []);
  if (!threads.length) {
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

/** —— 地图点位 —— */
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
function listMyEvents() {
  return read(KEYS.myEvents, []);
}

function getMyEvent(id) {
  return listMyEvents().find((e) => String(e.id) === String(id)) || null;
}

function deleteMyEvent(id) {
  const sid = String(id);
  write(KEYS.myEvents, listMyEvents().filter((e) => String(e.id) !== sid));
  return true;
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
  pushMessage('商家入驻申请已提交', '平台将审核营业资质，请耐心等待', 'system');
  return row;
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

function getEventPublishQualify(role) {
  const r = role === 'merchant' ? 'merchant' : 'personal';
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
  registerPublicPetCert,
  normalizePetAuditStatus,
  isPetAuditApproved,
  getPublicPetCert,
  listSocialPosts,
  addSocialPost,
  getSocialPost,
  isMyUserContent,
  deleteSocialPost,
  updateSocialPost,
  getSocialOverride,
  listPostComments,
  addPostComment,
  listEventSignups,
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
  getBuddyOverride,
  updateBuddyEngagement,
  listLocalPosts,
  getLocalPost,
  deleteLocalPost,
  addLocalPost,
  listMapPoints,
  addMapPoint,
  isValidMapMark,
  getUserPointsBalance,
  addUserPoints,
  MAP_MARK_POINTS_REWARD,
  listMyEvents,
  getMyEvent,
  deleteMyEvent,
  addMyEvent,
  getMerchantApply,
  submitMerchantApply,
  getIdentityVerify,
  submitIdentityVerify,
  mockApproveQualify,
  getEventPublishQualify,
  listCircleMessages,
  addCircleMessage,
  getCircleLastMessage,
  listServiceBooks,
  addServiceBook,
  getCity,
  setCity,
  setDraft,
  getDraft,
  getPetLikes,
  addPetLike,
  consumePetSwipe,
  petLikeQuota,
  addPetLikeShareBonus,
  getClubApply,
  submitClubApply,
  clearClubApply,
  listJoinedClubs,
  isClubJoined,
  joinClub,
  leaveClub,
  getCityLocation,
  setCityLocation,
  getProfileTags,
  setProfileTags,
  getUserProfile,
  setUserProfile,
  updateDefaultPetAvatar,
};
