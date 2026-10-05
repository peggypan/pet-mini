const { validateMediaPayload, isBrokenMediaUrl } = require('./media-urls');

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function maskIdCard(id) {
  const s = trim(id);
  if (s.length < 8) return s;
  return `${s.slice(0, 4)}********${s.slice(-4)}`;
}

const ENTITY_TYPES = ['personal', 'corporate'];

function pickHostApplyPayload(raw) {
  const p = raw || {};
  const clubName = trim(p.clubName) || trim(p.name);
  const entityType = ENTITY_TYPES.includes(p.entityType) ? p.entityType : 'personal';
  return {
    clubName,
    city: trim(p.city),
    intro: trim(p.intro),
    contact: trim(p.contact),
    cover: trim(p.cover),
    entityType,
    realName: trim(p.realName),
    idCard: trim(p.idCard),
    idFrontImage: trim(p.idFrontImage),
    idBackImage: trim(p.idBackImage),
    companyName: trim(p.companyName),
    licenseNo: trim(p.licenseNo),
    legalPerson: trim(p.legalPerson),
    licenseImage: trim(p.licenseImage),
  };
}

function validateHostApply(body) {
  if (!body.clubName) return '请填写俱乐部名称';
  if (!body.city) return '请选择所在城市';
  if (!body.intro) return '请填写俱乐部介绍';
  if (!body.cover) return '请上传俱乐部封面';
  const contact = body.contact;
  if (contact && /^\d+$/.test(contact) && !/^1\d{10}$/.test(contact)) {
    return '手机号格式不正确';
  }

  const entityType = body.entityType === 'corporate' ? 'corporate' : 'personal';
  if (entityType === 'personal') {
    if (!body.realName || !body.idCard) return '请填写对私身份信息（姓名、身份证号）';
    if (!/^\d{17}[\dXx]$/.test(body.idCard)) return '身份证号格式不正确';
    if (!body.idFrontImage || !body.idBackImage) return '请上传身份证正反面';
    if (!body.contact) return '请填写联系方式（手机号或微信号）';
  } else {
    if (!body.companyName || !body.licenseNo || !body.legalPerson) {
      return '请填写企业名称、统一社会信用代码与法人姓名';
    }
    if (!body.licenseImage) return '请上传营业执照';
    if (!body.contact) return '请填写联系手机或微信号';
  }

  const extraUrls = [
    body.idFrontImage,
    body.idBackImage,
    body.licenseImage,
  ].filter(Boolean);
  const bad = extraUrls.find((u) => isBrokenMediaUrl(u));
  if (bad) return '证件图片尚未上传到云存储，请重新选择后再提交';

  const mediaMsg = validateMediaPayload(body);
  if (mediaMsg) return mediaMsg;
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
    entityType: doc.entityType || 'personal',
    status: auditStatus,
    submittedAt: doc.submittedAt,
    approvedAt: doc.approvedAt,
    rejectReason: doc.rejectReason || '',
    clubId: doc.clubId || '',
  };
}

function publicHostApply(doc, viewerOpenid) {
  if (!doc) return null;
  const { _id, _openid, idCard, idFrontImage, idBackImage, licenseImage, ...rest } = doc;
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
    entityType: rest.entityType || 'personal',
    realName: isMine ? rest.realName : (rest.realName ? `${(rest.realName || '').slice(0, 1)}*` : ''),
    idCard: isMine ? maskIdCard(idCard) : '',
    companyName: rest.companyName || '',
    licenseNo: isMine ? rest.licenseNo : (rest.licenseNo ? `${(rest.licenseNo || '').slice(0, 4)}****` : ''),
    legalPerson: rest.legalPerson || '',
    auditStatus,
    status: auditStatus,
    apply: toLocalClubApplyShape({ ...rest, id: _id, auditStatus, idCard }),
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
  maskIdCard,
};
