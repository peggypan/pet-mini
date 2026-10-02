/** 活动发布 · 资质规则（认证通过即可发布，无需保证金） */

const STATUS_TEXT = {
  none: '未提交',
  pending: '审核中',
  approved: '已通过',
  rejected: '未通过',
};

const ROLE_LABEL = {
  personal: '个人发布',
  merchant: '商家发布',
};

function maskIdCard(id) {
  if (!id || id.length < 8) return id || '';
  return `${id.slice(0, 4)}********${id.slice(-4)}`;
}

function getNextStep(verifyStatus) {
  if (!verifyStatus || verifyStatus === 'none' || verifyStatus === 'rejected') return 'verify';
  if (verifyStatus === 'pending') return 'wait';
  return 'ready';
}

function getStepHint(nextStep, role) {
  const isMerchant = role === 'merchant';
  if (nextStep === 'verify') {
    return isMerchant
      ? '请先完成商家入驻，提交营业资质'
      : '请先上传身份信息，等待后台审核';
  }
  if (nextStep === 'wait') {
    return isMerchant ? '营业资质审核中，预计 1-3 个工作日' : '身份认证审核中，预计 1-3 个工作日';
  }
  return '资质已完成，可发布活动';
}

module.exports = {
  STATUS_TEXT,
  ROLE_LABEL,
  maskIdCard,
  getNextStep,
  getStepHint,
};
