function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function publicLedgerEntry(doc) {
  if (!doc) return null;
  const { _id, _openid, ...rest } = doc;
  return {
    id: _id,
    userId: rest.userId,
    nickname: rest.userNickname || '',
    amount: Number(rest.amount) || 0,
    reason: rest.reason || '',
    type: rest.type || 'other',
    refId: rest.refId || '',
    refType: rest.refType || '',
    createdAt: rest.createdAt,
  };
}

function pickCreditPayload(raw) {
  const p = raw || {};
  return {
    amount: Number(p.amount),
    reason: trim(p.reason) || trim(p.title) || '积分变动',
    type: trim(p.type) || 'other',
    refId: trim(p.refId),
    refType: trim(p.refType),
  };
}

module.exports = {
  publicLedgerEntry,
  pickCreditPayload,
};
