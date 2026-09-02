/**
 * 宠头头 · 宠物交友本地数据层
 */

const { MOCK_CHATS } = require('./mock');

const KEYS = {
  pets: 'social_pets',
  socialPosts: 'mvp_social_posts',
  eventSignups: 'mvp_event_signups',
  messages: 'mvp_messages',
  follows: 'social_follows',
  chatThreads: 'social_chat_threads',
  chatMessages: 'social_chat_messages',
};

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
    content: comment.content,
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

function getChatMessages(threadId) {
  const all = read(KEYS.chatMessages, {});
  return all[threadId] || [];
}

function addChatMessage(threadId, message) {
  const all = read(KEYS.chatMessages, {});
  const list = all[threadId] || [];
  const row = {
    id: uid('chat'),
    from: message.from || 'me',
    content: message.content,
    time: '刚刚',
    createdAt: new Date().toISOString(),
  };
  list.push(row);
  all[threadId] = list.slice(-200);
  write(KEYS.chatMessages, all);

  const threads = ensureChatThreads().map((t) => {
    if (String(t.id) !== String(threadId)) return t;
    return {
      ...t,
      lastMessage: row.content,
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
  getChatMessages,
  addChatMessage,
  markThreadRead,
  listMessages,
  markMessagesRead,
  countUnreadMessages,
  pushMessage,
};
