function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function normalizeTags(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((t) => trim(t)).filter(Boolean).slice(0, 8);
}

function pickMerchantPayload(raw) {
  const p = raw || {};
  const type = trim(p.type) || trim(p.category) || '其他';
  const rating = Number(p.rating);
  return {
    name: trim(p.name),
    city: trim(p.city),
    type,
    category: trim(p.category) || type,
    rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 5,
    price: trim(p.price),
    cover: trim(p.cover),
    logoUrl: trim(p.logoUrl) || trim(p.cover),
    tags: normalizeTags(p.tags),
    intro: trim(p.intro),
    address: trim(p.address),
    contactName: trim(p.contactName),
    contactPhone: trim(p.contactPhone),
  };
}

function validateMerchant(body, isCreate) {
  if (!body.name) return '请填写门店名称';
  if (!body.city) return '请填写城市';
  if (isCreate && !body.category && !body.type) return '请填写服务类型';
  if (body.contactPhone && !/^1\d{10}$/.test(body.contactPhone)) return '手机号格式不正确';
  return '';
}

function publicMerchant(doc, viewerOpenid) {
  if (!doc) return null;
  const { _id, _openid, bizStatus, status: recordStatus, ...rest } = doc;
  const isMine = viewerOpenid && (doc.openid === viewerOpenid || doc._openid === viewerOpenid);
  const type = rest.type || rest.category || '';
  return {
    id: _id,
    ...rest,
    type,
    category: rest.category || type,
    status: bizStatus,
    bizStatus,
    isMine: !!isMine,
    recordStatus,
  };
}

module.exports = {
  pickMerchantPayload,
  validateMerchant,
  publicMerchant,
};
