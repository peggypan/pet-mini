function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function pickMerchantApplyPayload(raw) {
  const p = raw || {};
  const companyName = trim(p.companyName);
  const shopName = trim(p.shopName) || companyName;
  const contactPhone = trim(p.contactPhone) || trim(p.phone);
  const contact = trim(p.contact) || trim(p.legalPerson);
  return {
    shopName,
    contact,
    phone: contactPhone,
    contactPhone,
    city: trim(p.city),
    companyName,
    licenseNo: trim(p.licenseNo),
    legalPerson: trim(p.legalPerson),
    licenseImage: trim(p.licenseImage),
    idFrontImage: trim(p.idFrontImage),
    idBackImage: trim(p.idBackImage),
    shopFrontImage: trim(p.shopFrontImage),
    address: trim(p.address),
    intro: trim(p.intro),
  };
}

function validateMerchantApply(body) {
  if (!body.shopName && !body.companyName) return '请填写店铺/公司名称';
  if (!body.contactPhone) return '请填写联系电话';
  if (!/^1\d{10}$/.test(body.contactPhone)) return '手机号格式不正确';
  if (!body.companyName || !body.licenseNo || !body.legalPerson) {
    return '请填写完整营业资质';
  }
  if (!body.licenseImage || !body.idFrontImage || !body.idBackImage) {
    return '请上传营业执照与法人身份证';
  }
  return '';
}

function toLocalApplyShape(doc) {
  if (!doc) return null;
  return {
    id: doc.id,
    status: doc.auditStatus,
    shopName: doc.shopName,
    contact: doc.contact,
    phone: doc.phone || doc.contactPhone,
    city: doc.city,
    companyName: doc.companyName,
    licenseNo: doc.licenseNo,
    legalPerson: doc.legalPerson,
    contactPhone: doc.contactPhone || doc.phone,
    licenseImage: doc.licenseImage,
    idFrontImage: doc.idFrontImage,
    idBackImage: doc.idBackImage,
    shopFrontImage: doc.shopFrontImage,
    address: doc.address,
    intro: doc.intro,
    submittedAt: doc.submittedAt,
    approvedAt: doc.approvedAt,
    rejectReason: doc.rejectReason || '',
    merchantId: doc.merchantId || '',
  };
}

function publicMerchantApply(doc, viewerOpenid) {
  if (!doc) return null;
  const { _id, _openid, ...rest } = doc;
  const isMine = viewerOpenid && (doc.openid === viewerOpenid || doc._openid === viewerOpenid);
  const auditStatus = rest.auditStatus || 'pending';
  return {
    id: _id,
    ...rest,
    status: auditStatus,
    auditStatus,
    apply: toLocalApplyShape({ ...rest, id: _id, auditStatus }),
    isMine: !!isMine,
  };
}

module.exports = {
  pickMerchantApplyPayload,
  validateMerchantApply,
  publicMerchantApply,
  toLocalApplyShape,
};
