function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function publicWord(doc) {
  if (!doc) return null;
  return {
    id: doc._id,
    word: trim(doc.word),
    status: doc.status != null ? doc.status : 1,
    note: trim(doc.note),
    createdAt: doc.createdAt,
  };
}

function pickWordPayload(raw) {
  const p = raw || {};
  return {
    word: trim(p.word),
    status: p.status != null ? Number(p.status) : 1,
    note: trim(p.note),
  };
}

module.exports = {
  publicWord,
  pickWordPayload,
};
