/**
 * 宠头头 · 宠物交友本地数据层
 */

const { MOCK_CHATS } = require('./mock');
const { DEPOSIT, getNextStep } = require('./event-qualify');
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
};

const PET_LIKE_DAILY_LIMIT = 20;

function petLikeToday() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function getPetLikes() {
  const row = read(KEYS.petLikes, null);
  if (!row || row.date !== petLikeToday()) return { date: petLikeToday(), items: [] };
  return row;
}

// 每日最多喜欢 PET_LIKE_DAILY_LIMIT 只，跨天自动重置
function addPetLike(pet) {
  const row = getPetLikes();
  if (row.items.length >= PET_LIKE_DAILY_LIMIT) return { ok: false, quota: true };
  if (row.items.some((x) => String(x.id) === String(pet.id))) return { ok: true };
  row.items.push({
    id: pet.id,
    userName: pet.userName,
    petName: pet.petName,
    breed: pet.breed,
    avatar: pet.cover || pet.avatar,
    distance: pet.distance,
    likedAt: new Date().toISOString(),
  });
  write(KEYS.petLikes, row);
  return { ok: true };
}

function petLikeQuota() {
  const row = getPetLikes();
  return { used: row.items.length, limit: PET_LIKE_DAILY_LIMIT, left: Math.max(0, PET_LIKE_DAILY_LIMIT - row.items.length) };
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

function pushMessage(title, content, type) {
  const list = read(KEYS.messages, []);
  list.unshift({
    id: uid('msg'),
    title,
    content,
    type: type || 'system',
    read: false,
    createdAt: new Date().toISOString(),
  });
  write(KEYS.messages, list.slice(0, 80));
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

function addPet(pet) {
  const pets = listPets();
  const row = {
    id: uid('pet'),
    avatarUrl: '/assets/mock/real_avatar.jpg',
    personality: '活泼友好',
    socialTags: [],
    ...pet,
    createdAt: new Date().toISOString(),
  };
  pets.unshift(row);
  savePets(pets);
  pushMessage('宠物档案已创建', `「${row.name}」的交友名片已就绪`, 'social');
  return row;
}

function updatePet(id, patch) {
  const pets = listPets().map((p) => (String(p.id) === String(id) ? { ...p, ...patch } : p));
  savePets(pets);
  return getPet(id);
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
  pushMessage('动态发布成功', '你的新动态已在广场展示', 'social');
  return row;
}

function getSocialPost(id) {
  return listSocialPosts().find((p) => String(p.id) === String(id)) || null;
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

function addEventSignup(event) {
  const list = listEventSignups();
  if (list.some((x) => String(x.eventId) === String(event.id))) {
    return { duplicated: true, list };
  }
  list.unshift({
    id: uid('ev'),
    eventId: event.id,
    title: event.title,
    place: event.place,
    time: event.time,
    fee: event.fee,
    createdAt: new Date().toISOString(),
  });
  write(KEYS.eventSignups, list);
  pushMessage('活动报名成功', `已报名「${event.title}」，记得准时赴约～`, 'social');
  return { duplicated: false, list };
}

/** —— 关注宠友 —— */
function listFollows() {
  return read(KEYS.follows, []);
}

function isFollowed(friendId) {
  return listFollows().some((f) => String(f.id) === String(friendId));
}

function toggleFollow(friend) {
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
  pushMessage('新宠友关注', `你已关注 ${friend.userName} · ${friend.petName}`, 'social');
  return { followed: true, list };
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
  return list;
}

function countUnreadMessages() {
  const sys = listMessages().filter((m) => !m.read).length;
  const chat = ensureChatThreads().reduce((sum, t) => sum + (t.unread || 0), 0);
  return sys + chat;
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

/** —— 本地帖子（寻宠/领养/互助） —— */
function listLocalPosts(type) {
  const all = read(KEYS.localPosts, []);
  return type ? all.filter((p) => p.type === type) : all;
}

function addLocalPost(post) {
  const all = read(KEYS.localPosts, []);
  const row = { id: uid('lp'), time: '刚刚', ...post, createdAt: new Date().toISOString() };
  all.unshift(row);
  write(KEYS.localPosts, all.slice(0, 50));
  pushMessage('发布成功', '信息已提交，将在同城展示', 'social');
  return row;
}

/** —— 地图点位 —— */
function listMapPoints() {
  return read(KEYS.mapPoints, []);
}

function addMapPoint(point) {
  const list = listMapPoints();
  const row = { id: uid('mp'), status: 'pending', ...point, createdAt: new Date().toISOString() };
  list.unshift(row);
  write(KEYS.mapPoints, list.slice(0, 50));
  pushMessage('点位已提交', '审核通过后将展示在友好地图', 'social');
  return row;
}

/** —— 活动发起 / 商家预约 —— */
function listMyEvents() {
  return read(KEYS.myEvents, []);
}

function addMyEvent(event) {
  const list = listMyEvents();
  const row = {
    id: uid('mev'),
    status: 'approved',
    auditStatus: 'approved',
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

function getEventDeposit(role) {
  const all = read(KEYS.eventDeposits, {});
  const key = role === 'merchant' ? 'merchant' : 'personal';
  return all[key] || { paid: false, amount: 0, paidAt: '' };
}

function payEventDeposit(role) {
  const key = role === 'merchant' ? 'merchant' : 'personal';
  const cfg = DEPOSIT[key];
  const all = read(KEYS.eventDeposits, {});
  all[key] = {
    paid: true,
    amount: cfg.amount,
    paidAt: new Date().toISOString(),
  };
  write(KEYS.eventDeposits, all);
  pushMessage('保证金缴纳成功', `已缴纳${cfg.label} ¥${cfg.amount}`, 'order');
  return all[key];
}

function mockApproveQualify(role) {
  if (role === 'merchant') {
    const apply = getMerchantApply();
    if (!apply || apply.status !== 'pending') return null;
    const next = { ...apply, status: 'approved', approvedAt: new Date().toISOString() };
    write(KEYS.eventMerchantApply, next);
    pushMessage('商家入驻审核通过', '请缴纳保证金后即可发布活动', 'system');
    return next;
  }
  const verify = getIdentityVerify();
  if (!verify || verify.status !== 'pending') return null;
  const next = { ...verify, status: 'approved', approvedAt: new Date().toISOString() };
  write(KEYS.eventIdentityVerify, next);
  pushMessage('身份认证审核通过', '请缴纳保证金后即可发布活动', 'system');
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
  return {
    role: r,
    verifyStatus: 'approved',
    verify: null,
    depositPaid: false,
    depositAmount: 0,
    depositLabel: '',
    canPublish: true,
    nextStep: 'ready',
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
  listSocialPosts,
  addSocialPost,
  getSocialPost,
  updateSocialPost,
  getSocialOverride,
  listPostComments,
  addPostComment,
  listEventSignups,
  addEventSignup,
  listFollows,
  isFollowed,
  toggleFollow,
  listChatThreads,
  ensureChatThread,
  getChatMessages,
  addChatMessage,
  markThreadRead,
  listMessages,
  markMessagesRead,
  countUnreadMessages,
  pushMessage,
  listBuddyPosts,
  addBuddyPost,
  getBuddyPost,
  listLocalPosts,
  addLocalPost,
  listMapPoints,
  addMapPoint,
  listMyEvents,
  addMyEvent,
  getMerchantApply,
  submitMerchantApply,
  getIdentityVerify,
  submitIdentityVerify,
  getEventDeposit,
  payEventDeposit,
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
  petLikeQuota,
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
