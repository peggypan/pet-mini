/** 活动发布 · 资质与保证金规则 */

const DEPOSIT = {
  personal: { amount: 200, label: '个人活动保证金', desc: '活动结束且无投诉可申请退还' },
  merchant: { amount: 500, label: '商家活动保证金', desc: '用于保障活动履约，违规将扣除' },
};

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

function getNextStep(verifyStatus, depositPaid) {
  if (!verifyStatus || verifyStatus === 'none' || verifyStatus === 'rejected') return 'verify';
  if (verifyStatus === 'pending') return 'wait';
  if (!depositPaid) return 'deposit';
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
  if (nextStep === 'deposit') {
    return `资质已通过，请缴纳${isMerchant ? '商家' : '个人'}活动保证金`;
  }
  return '资质与保证金已完成，可发布活动';
}

module.exports = {
  DEPOSIT,
  STATUS_TEXT,
  ROLE_LABEL,
  maskIdCard,
  getNextStep,
  getStepHint,
};
