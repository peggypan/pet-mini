const { resolveVerifyPet } = require('../../utils/pet-cert-qrcode');
const { fetchPublicPetCertFromCloud } = require('../../utils/pet-cert-cloud-sync');

Page({
  data: {
    pet: null,
    loadError: '',
    loading: true,
  },

  async onLoad(options) {
    wx.setNavigationBarTitle({ title: '宠证查验' });
    let pet = resolveVerifyPet(options);
    if ((!pet || !pet.name) && options.petId) {
      pet = await fetchPublicPetCertFromCloud(options.petId);
    }
    if ((!pet || !pet.name) && options.petId) {
      pet = await fetchPublicPetCertFromCloud(decodeURIComponent(options.petId));
    }
    if (!pet || !pet.name) {
      this.setData({
        loading: false,
        loadError: '未找到有效的电子宠证信息，请确认二维码是否完整或已过期',
      });
      return;
    }
    this.setData({ pet, loading: false });
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
