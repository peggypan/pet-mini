const { users, getDb } = require('./db');

function authorOpenid(doc) {
  if (!doc) return '';
  return String(doc.openid || doc._openid || '').trim();
}

function isUsableAvatarUrl(url) {
  const s = String(url || '').trim();
  return !!s && !s.includes('/assets/mock/');
}

async function usersByOpenids(openids) {
  const ids = [...new Set((openids || []).map(String).filter(Boolean))];
  const map = new Map();
  if (!ids.length) return map;
  const _ = getDb().command;
  const chunkSize = 20;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    try {
      const res = await users()
        .where({ openid: _.in(chunk) })
        .limit(chunkSize)
        .get();
      (res.data || []).forEach((u) => {
        if (u && u.openid) map.set(String(u.openid), u);
      });
    } catch (e) {
      // ignore batch failure
    }
  }
  return map;
}

/** 展示用：网名 + 头像以 users 表为准，避免帖内快照仍是 MOCK */
function applyAuthorProfile(doc, userDoc) {
  if (!doc || !userDoc) return doc;
  const nickname = String(userDoc.nickname || '').trim();
  const avatarUrl = String(userDoc.avatarUrl || userDoc.avatar || '').trim();
  const next = { ...doc };
  if (nickname) next.userName = nickname;
  if (isUsableAvatarUrl(avatarUrl)) next.avatar = avatarUrl;
  return next;
}

async function enrichPostsWithAuthorProfiles(rows) {
  const list = rows || [];
  if (!list.length) return list;
  const map = await usersByOpenids(list.map(authorOpenid));
  return list.map((doc) => applyAuthorProfile(doc, map.get(authorOpenid(doc))));
}

module.exports = {
  authorOpenid,
  isUsableAvatarUrl,
  usersByOpenids,
  applyAuthorProfile,
  enrichPostsWithAuthorProfiles,
};
