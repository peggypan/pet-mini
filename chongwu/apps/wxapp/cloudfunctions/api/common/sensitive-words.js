const { sensitiveWords } = require('./db');

/** 库为空时的兜底（合并原 social / local / idle 页内正则） */
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

let cache = { words: null, expiresAt: 0 };
const CACHE_MS = 60 * 1000;

function normalizeWordList(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return [...new Set(list.map((w) => (typeof w === 'string' ? w.trim() : '')).filter(Boolean))];
}

function findHitInText(text, words) {
  const t = typeof text === 'string' ? text : '';
  if (!t) return '';
  const list = normalizeWordList(words);
  for (let i = 0; i < list.length; i += 1) {
    if (t.includes(list[i])) return list[i];
  }
  return '';
}

async function loadActiveWords() {
  const now = Date.now();
  if (cache.words && cache.expiresAt > now) {
    return cache.words;
  }

  let rows = [];
  try {
    const res = await sensitiveWords().where({ status: 1 }).limit(500).get();
    rows = res.data || [];
  } catch (e) {
    rows = [];
  }

  let words = normalizeWordList(rows.map((d) => d.word));
  if (!words.length) {
    words = DEFAULT_WORDS.slice();
  }

  cache = { words, expiresAt: now + CACHE_MS };
  return words;
}

function invalidateSensitiveWordsCache() {
  cache = { words: null, expiresAt: 0 };
}

async function rejectIfSensitive(text) {
  const hit = findHitInText(text, await loadActiveWords());
  return hit ? '内容含违规词，请修改' : '';
}

module.exports = {
  DEFAULT_WORDS,
  normalizeWordList,
  findHitInText,
  loadActiveWords,
  invalidateSensitiveWordsCache,
  rejectIfSensitive,
};
