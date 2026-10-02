function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function pickHostApplyPayload(raw) {
  const p = raw || {};
  const clubName = trim(p.clubName) || trim(p.name);
  return {
    clubName,
    city: trim(p.city),
    intro: trim(p.intro),
    contact: trim(p.contact),
    cover: trim(p.cover),
  };
}

function validateHostApply(body) {
  if (!body.clubName) return '请填写俱乐部名称';
  if (!body.city) return '请选择所在城市';
  if (!body.intro) return '请填写俱乐部介绍';
  if (!body.cover) return '请上传俱乐部封面';
  const contact = body.contact;
  if (contact && /^\d{11}$/.test(contact) && !/^1\d{10}$/.test(contact)) {
    return '手机号格式不正确';
  }
  return '';
}

function toLocalClubApplyShape(doc) {
  if (!doc) return null;
  const auditStatus = doc.auditStatus || doc.status || 'pending';
  return {
    id: doc.id,
    name: doc.clubName,
    clubName: doc.clubName,
    city: doc.city,
    intro: doc.intro,
    contact: doc.contact || '',
    cover: doc.cover,
    status: auditStatus,
    submittedAt: doc.submittedAt,
    approvedAt: doc.approvedAt,
    rejectReason: doc.rejectReason || '',
    clubId: doc.clubId || '',
  };
}

function publicHostApply(doc, viewerOpenid) {
  if (!doc) return null;
  const { _id, _openid, ...rest } = doc;
  const isMine = viewerOpenid && (doc.openid === viewerOpenid || doc._openid === viewerOpenid);
  const auditStatus = rest.auditStatus || 'pending';
  return {
    id: _id,
    applicantId: rest.userId || rest.openid,
    applicantNickname: rest.userName || '宠友',
    clubName: rest.clubName,
    city: rest.city,
    intro: rest.intro,
    contact: rest.contact,
    cover: rest.cover,
    auditStatus,
    status: auditStatus,
    apply: toLocalClubApplyShape({ ...rest, id: _id, auditStatus }),
    isMine: !!isMine,
    rejectReason: rest.rejectReason || '',
    submittedAt: rest.submittedAt,
    clubId: rest.clubId || '',
  };
}

module.exports = {
  pickHostApplyPayload,
  validateHostApply,
  publicHostApply,
  toLocalClubApplyShape,
};
