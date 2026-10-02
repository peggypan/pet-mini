const { ok, fail } = require('../common/response');
const { sensitiveWords, now } = require('../common/db');
const { publicWord, pickWordPayload } = require('../common/sensitive-words-fields');
const {
  loadActiveWords,
  findHitInText,
  invalidateSensitiveWordsCache,
  DEFAULT_WORDS,
  normalizeWordList,
} = require('../common/sensitive-words');

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

async function listActive(_payload, _wxContext) {
  const words = await loadActiveWords();
  return ok({ list: words });
}

async function check(payload, _wxContext) {
  const text = trim(payload && payload.text);
  const words = await loadActiveWords();
  const word = findHitInText(text, words);
  return ok({ hit: !!word, word: word || '' });
}

async function listFeed(payload, _wxContext) {
  const limit = Math.min(500, Math.max(1, Number(payload && payload.limit) || 200));
  let rows = [];
  try {
    const res = await sensitiveWords().orderBy('createdAt', 'desc').limit(limit).get();
    rows = res.data || [];
  } catch (e) {
    const res = await sensitiveWords().limit(limit).get();
    rows = res.data || [];
  }
  if (!rows.length) {
    return ok({
      list: DEFAULT_WORDS.map((word, i) => ({
        id: `default_${i}`,
        word,
        status: 1,
        note: '内置兜底',
      })),
      fromDefault: true,
    });
  }
  return ok({ list: rows.map((d) => publicWord(d)).filter((d) => d && d.word) });
}

async function save(payload, _wxContext) {
  return fail(403, '敏感词由运营后台维护，请使用 admin 接口');
}

async function remove(_payload, _wxContext) {
  return fail(403, '敏感词由运营后台维护，请使用 admin 接口');
}

/** 供 admin 或脚本写入（非 router 暴露） */
async function upsertWord(payload) {
  const body = pickWordPayload(payload);
  if (!body.word) return fail(400, '缺少 word');
  if (body.status !== 0 && body.status !== 1) return fail(400, 'status 无效');

  const existing = await sensitiveWords().where({ word: body.word }).limit(1).get();
  const doc = existing.data && existing.data[0];
  if (doc) {
    await sensitiveWords()
      .doc(doc._id)
      .update({
        data: {
          status: body.status,
          note: body.note || doc.note || '',
          updatedAt: now(),
        },
      });
    invalidateSensitiveWordsCache();
    const got = await sensitiveWords().doc(doc._id).get();
    return ok({ word: publicWord(got.data) });
  }

  const addRes = await sensitiveWords().add({
    data: {
      word: body.word,
      status: body.status,
      note: body.note || '',
      createdAt: now(),
      updatedAt: now(),
    },
  });
  invalidateSensitiveWordsCache();
  const got = await sensitiveWords().doc(addRes._id).get();
  return ok({ word: publicWord(got.data) });
}

async function seedDefaultsIfEmpty() {
  const res = await sensitiveWords().limit(1).get();
  if (res.data && res.data.length) return ok({ seeded: false });
  const words = normalizeWordList(DEFAULT_WORDS);
  for (let i = 0; i < words.length; i += 1) {
    await sensitiveWords().add({
      data: {
        word: words[i],
        status: 1,
        note: 'seed',
        createdAt: now(),
        updatedAt: now(),
      },
    });
  }
  invalidateSensitiveWordsCache();
  return ok({ seeded: true, count: words.length });
}

module.exports = {
  listActive,
  check,
  listFeed,
  save,
  remove,
  upsertWord,
  seedDefaultsIfEmpty,
};
