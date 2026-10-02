const { resolveVerifyPet } = require('../../utils/pet-cert-qrcode');

Page({
  data: {
    pet: null,
    loadError: '',
  },

  onLoad(options) {
    wx.setNavigationBarTitle({ title: '宠证查验' });
    const pet = resolveVerifyPet(options);
    if (!pet || !pet.name) {
      this.setData({
        loadError: '未找到有效的电子宠证信息，请确认二维码是否完整或已过期',
      });
      return;
    }
    this.setData({ pet });
  },

  onPreviewProof() {
    const url = this.data.pet && this.data.pet.vaccineProofUrl;
    if (!url) return;
    wx.previewImage({ urls: [url], current: url });
  },

  onUnload() {
    wx.removeStorageSync('_scan_pet_cert');
  },
});
