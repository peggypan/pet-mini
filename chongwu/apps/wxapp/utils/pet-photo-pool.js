const { MOCK_PET } = require('./mock');

const MOCK_PATH = '/assets/mock/';

function trimUrl(url) {
  return (url || '').trim();
}

function isMockOrEmpty(url) {
  const u = trimUrl(url);
  return !u || u.includes(MOCK_PATH);
}

function getUserAvatarUrl() {
  try {
    const user = wx.getStorageSync('userInfo') || {};
    return trimUrl(user.avatarUrl);
  } catch (e) {
    return '';
  }
}

/** 与主人微信头像相同则视为误写入，展示/海报应优先用相册 */
function isLikelyUserAvatar(url) {
  const u = trimUrl(url);
  if (isMockOrEmpty(u)) return false;
  const userAv = getUserAvatarUrl();
  return !!(userAv && u === userAv);
}

function collectPetPhotoUrls(pet) {
  const p = pet || {};
  const urls = [];
  const seen = new Set();
  const add = (url) => {
    const u = trimUrl(url);
    if (!u || isMockOrEmpty(u) || isLikelyUserAvatar(u)) return;
    if (seen.has(u)) return;
    seen.add(u);
    urls.push(u);
  };

  (Array.isArray(p.galleryPhotos) ? p.galleryPhotos : []).forEach(add);
  add(p.avatarUrl);
  add(p.avatar);
  add(p.coverUrl);
  add(p.cover);
  return urls;
}

function defaultPetFallbackPhoto() {
  return MOCK_PET.cover || `${MOCK_PATH}real_hero.jpg`;
}

function pickPetDisplayPhoto(pet) {
  const pool = collectPetPhotoUrls(pet);
  if (pool.length) return pool[0];
  return defaultPetFallbackPhoto();
}

function shuffleUrls(list) {
  const arr = (list || []).slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 为 N 张海报各选一张图；池子不足时循环使用 */
function pickPosterPhotoUrls(pet, count) {
  const n = Math.max(1, Number(count) || 1);
  const pool = collectPetPhotoUrls(pet);
  const fallback = defaultPetFallbackPhoto();
  if (!pool.length) {
    return Array.from({ length: n }, () => fallback);
  }
  const shuffled = shuffleUrls(pool);
  return Array.from({ length: n }, (_, i) => shuffled[i % shuffled.length]);
}

module.exports = {
  collectPetPhotoUrls,
  pickPetDisplayPhoto,
  pickPosterPhotoUrls,
  isLikelyUserAvatar,
  defaultPetFallbackPhoto,
};
