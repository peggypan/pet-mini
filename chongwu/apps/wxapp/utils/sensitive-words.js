const STORAGE_KEY = 'mvp_sensitive_words';

const DEFAULT_WORDS = [
  '活体',
  '出售猫',
  '出售狗',
  '卖猫',
  '卖狗',
  '开药',
  '诊疗',
  '买卖',
  '配种',
  '繁殖',
  '幼崽',
  '公猫配种',
  '种公',
];

function readList() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY);
    if (Array.isArray(raw) && raw.length) {
      return raw.filter((w) => typeof w === 'string' && w.trim()).map((w) => w.trim());
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_WORDS.slice();
}

function replaceFromCloud(list) {
  const words = (list || [])
    .map((w) => (typeof w === 'string' ? w.trim() : ''))
    .filter(Boolean);
  if (!words.length) return readList();
  const unique = [...new Set(words)];
  try {
    wx.setStorageSync(STORAGE_KEY, unique);
  } catch (e) {
    // ignore
  }
  return unique;
}

function findHit(text, words) {
  const t = typeof text === 'string' ? text : '';
  if (!t) return '';
  const list = words || readList();
  for (let i = 0; i < list.length; i += 1) {
    if (t.includes(list[i])) return list[i];
  }
  return '';
}

function textBlocked(text) {
  return !!findHit(text);
}

function getSensitiveWords() {
  return readList();
}

module.exports = {
  DEFAULT_WORDS,
  getSensitiveWords,
  replaceFromCloud,
  findHit,
  textBlocked,
};
