const ROLES = ['personal', 'merchant'];
const STATUSES = ['none', 'pending', 'approved', 'rejected'];

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function maskIdCard(id) {
  const s = trim(id);
  if (s.length < 8) return s;
  return `${s.slice(0, 4)}********${s.slice(-4)}`;
}

function pickQualifyPayload(raw) {
  const p = raw || {};
  const role = ROLES.includes(p.role) ? p.role : 'personal';
  return {
    role,
    realName: trim(p.realName),
    idCard: trim(p.idCard),
    contactPhone: trim(p.contactPhone),
    idFrontImage: trim(p.idFrontImage),
    idBackImage: trim(p.idBackImage),
    companyName: trim(p.companyName),
    licenseNo: trim(p.licenseNo),
    legalPerson: trim(p.legalPerson),
    licenseImage: trim(p.licenseImage),
    shopFrontImage: trim(p.shopFrontImage),
  };
}

function validateQualify(body) {
  if (!ROLES.includes(body.role)) return '无效发布角色';
  if (body.role === 'personal') {
    if (!body.realName || !body.idCard || !body.contactPhone) {
      return '请填写姓名、身份证号、手机号';
    }
    if (!/^\d{17}[\dXx]$/.test(body.idCard)) return '身份证号格式不正确';
    if (!/^1\d{10}$/.test(body.contactPhone)) return '手机号格式不正确';
    if (!body.idFrontImage || !body.idBackImage) return '请上传身份证正反面';
    return '';
  }
  if (!body.companyName || !body.licenseNo || !body.legalPerson || !body.contactPhone) {
    return '请填写完整商家信息';
  }
  if (!/^1\d{10}$/.test(body.contactPhone)) return '手机号格式不正确';
  if (!body.licenseImage || !body.idFrontImage || !body.idBackImage) {
    return '请上传营业执照与法人身份证';
  }
  return '';
}

function toLocalVerifyShape(doc) {
  if (!doc) return null;
  return {
    id: doc.id,
    status: doc.verifyStatus,
    realName: doc.realName,
    idCard: doc.idCard,
    contactPhone: doc.contactPhone,
    idFrontImage: doc.idFrontImage,
    idBackImage: doc.idBackImage,
    companyName: doc.companyName,
    licenseNo: doc.licenseNo,
    legalPerson: doc.legalPerson,
    licenseImage: doc.licenseImage,
    shopFrontImage: doc.shopFrontImage,
    submittedAt: doc.submittedAt,
    approvedAt: doc.approvedAt,
    rejectReason: doc.rejectReason || '',
  };
}

function publicQualify(doc, viewerOpenid) {
  if (!doc) return null;
  const { _id, _openid, idCard, ...rest } = doc;
  const isMine = viewerOpenid && (doc.openid === viewerOpenid || doc._openid === viewerOpenid);
  const verifyStatus = rest.verifyStatus || 'none';
  const verify = toLocalVerifyShape({
    ...rest,
    id: _id,
    verifyStatus,
    idCard: isMine ? idCard : maskIdCard(idCard),
  });
  return {
    id: _id,
    role: rest.role,
    verifyStatus,
    verify,
    canPublish: verifyStatus === 'approved',
    isMine: !!isMine,
    rejectReason: rest.rejectReason || '',
    submittedAt: rest.submittedAt,
    approvedAt: rest.approvedAt,
  };
}

module.exports = {
  pickQualifyPayload,
  validateQualify,
  publicQualify,
  toLocalVerifyShape,
  maskIdCard,
  ROLES,
  STATUSES,
};
