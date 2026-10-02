const store = require('../../utils/store');
const cloudApi = require('../../utils/cloud-api');
const { refreshQualifyFromCloud, submitQualifyToCloud } = require('../../utils/event-qualify-cloud-sync');
const { STATUS_TEXT, maskIdCard, getStepHint } = require('../../utils/event-qualify');
const { chooseMedia } = require('../../utils/choose-media');

function pickImage(field) {
  return new Promise((resolve) => {
    console.log('fieldfieldfield', field);
    chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        console.log('resresres', res);
        
        const file = (res.tempFiles || [])[0];
        resolve(file ? file.tempFilePath : '');
      },
      fail: (err) => {
        console.log(`pickImage fail: ${field}`);
        console.log(err);
        resolve('');
      },
      complete: (res) => {
        console.log('completecompletecomplete', res);
      },
    });
  });
}

Page({
  data: {
    role: 'personal',
    qualify: null,
    stepHint: '',
    statusText: STATUS_TEXT,
    // 个人
    realName: '',
    idCard: '',
    personalPhone: '',
    idFrontImage: '',
    idBackImage: '',
    // 商家
    companyName: '',
    licenseNo: '',
    legalPerson: '',
    merchantPhone: '',
    licenseImage: '',
    merchantIdFront: '',
    merchantIdBack: '',
    shopFrontImage: '',
  },

  onLoad(options) {
    const role = options.role === 'merchant' ? 'merchant' : 'personal';
    this.setData({ role });
    this.loadForm(role);
    this.refreshQualify(true);
  },

  onShow() {
    this.refreshQualify(true);
  },

  loadForm(role) {
    if (role === 'merchant') {
      const apply = store.getMerchantApply();
      if (!apply) return;
      this.setData({
        companyName: apply.companyName || '',
        licenseNo: apply.licenseNo || '',
        legalPerson: apply.legalPerson || '',
        merchantPhone: apply.contactPhone || '',
        licenseImage: apply.licenseImage || '',
        merchantIdFront: apply.idFrontImage || '',
        merchantIdBack: apply.idBackImage || '',
        shopFrontImage: apply.shopFrontImage || '',
      });
      return;
    }
    const verify = store.getIdentityVerify();
    if (!verify) return;
    this.setData({
      realName: verify.realName || '',
      idCard: verify.idCard || '',
      personalPhone: verify.contactPhone || '',
      idFrontImage: verify.idFrontImage || '',
      idBackImage: verify.idBackImage || '',
    });
  },

  async refreshQualify(fromCloud) {
    const { role } = this.data;
    let qualify;
    if (fromCloud && cloudApi.cloudEnabled()) {
      qualify = await refreshQualifyFromCloud(role);
    } else {
      qualify = store.getEventPublishQualify(role);
    }
    const maskedId = qualify.verify?.idCard ? maskIdCard(qualify.verify.idCard) : '';
    this.setData({
      qualify: { ...qualify, maskedId },
      stepHint: getStepHint(qualify.nextStep, role),
    });
  },

  onSwitchRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ role });
    this.loadForm(role);
    this.refreshQualify(true);
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  async onPickImage(e) {
    const field = e.currentTarget.dataset.field;
    console.log('fieldhahah', field);
    
    const url = await pickImage(field);
    if (url) this.setData({ [field]: url });
  },

  async onSubmitPersonal() {
    const { realName, idCard, personalPhone, idFrontImage, idBackImage, qualify } = this.data;
    if (qualify.verifyStatus === 'pending') {
      wx.showToast({ title: '审核中，请耐心等待', icon: 'none' });
      return;
    }
    if (qualify.verifyStatus === 'approved') {
      wx.showToast({ title: '已通过认证', icon: 'none' });
      return;
    }
    if (!realName || !idCard || !personalPhone) {
      wx.showToast({ title: '请填写姓名、身份证号、手机号', icon: 'none' });
      return;
    }
    if (!/^\d{17}[\dXx]$/.test(idCard)) {
      wx.showToast({ title: '身份证号格式不正确', icon: 'none' });
      return;
    }
    if (!idFrontImage || !idBackImage) {
      wx.showToast({ title: '请上传身份证正反面', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '提交中', mask: true });
    try {
      await submitQualifyToCloud({
        role: 'personal',
        realName,
        idCard,
        contactPhone: personalPhone,
        idFrontImage,
        idBackImage,
      });
      wx.showToast({ title: '已提交审核', icon: 'success' });
      this.refreshQualify(true);
    } catch (e) {
      wx.showToast({ title: e.message || '提交失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async onSubmitMerchant() {
    const {
      companyName, licenseNo, legalPerson, merchantPhone,
      licenseImage, merchantIdFront, merchantIdBack, shopFrontImage, qualify,
    } = this.data;
    if (qualify.verifyStatus === 'pending') {
      wx.showToast({ title: '审核中，请耐心等待', icon: 'none' });
      return;
    }
    if (qualify.verifyStatus === 'approved') {
      wx.showToast({ title: '已入驻平台', icon: 'none' });
      return;
    }
    if (!companyName || !licenseNo || !legalPerson || !merchantPhone) {
      wx.showToast({ title: '请填写完整商家信息', icon: 'none' });
      return;
    }
    if (!licenseImage || !merchantIdFront || !merchantIdBack) {
      wx.showToast({ title: '请上传营业执照与法人身份证', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '提交中', mask: true });
    try {
      await submitQualifyToCloud({
        role: 'merchant',
        companyName,
        licenseNo,
        legalPerson,
        contactPhone: merchantPhone,
        licenseImage,
        idFrontImage: merchantIdFront,
        idBackImage: merchantIdBack,
        shopFrontImage,
      });
      wx.showToast({ title: '入驻申请已提交', icon: 'success' });
      this.refreshQualify(true);
    } catch (e) {
      wx.showToast({ title: e.message || '提交失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onMockApprove() {
    if (cloudApi.cloudEnabled()) {
      wx.showToast({ title: '云开发模式下请后台审核', icon: 'none' });
      return;
    }
    const { role, qualify } = this.data;
    if (qualify.verifyStatus !== 'pending') return;
    store.mockApproveQualify(role);
    wx.showToast({ title: '模拟审核通过', icon: 'success' });
    this.refreshQualify();
  },

  onGoPublish() {
    const { role, qualify } = this.data;
    if (!qualify.canPublish) {
      wx.showToast({ title: '请先完成资质认证', icon: 'none' });
      return;
    }
    wx.redirectTo({ url: `/pages/event-publish/event-publish?role=${role}` });
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.previewImage({ urls: [url], current: url });
  },
});
