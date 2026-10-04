const store = require('../../utils/store');
const { getDefaultPet } = require('../../utils/catalog');
const { generatePetCertPosters } = require('../../utils/pet-cert-poster');
const { publishPetCertToCloud } = require('../../utils/pet-cert-cloud-sync');
const { requireInteract } = require('../../utils/pet-profile-guard');

Page({
  data: {
    pet: null,
    posters: [],
    current: 0,
    generating: true,
    error: '',
  },

  onLoad(options) {
    const { blockSubPageWithoutLogin } = require('../../utils/pet-profile-guard');
    if (!blockSubPageWithoutLogin(this)) return;
    if (!requireInteract()) {
      setTimeout(() => wx.navigateBack(), 300);
      return;
    }
    let pet = null;
    if (options.petId) {
      pet = store.getPet(options.petId);
    }
    if (!pet) pet = getDefaultPet();
    this.setData({ pet });
    wx.setNavigationBarTitle({ title: '宠证分享海报' });
  },

  onReady() {
    if (!this.data.pet) return;
    this.buildPosters();
  },

  async buildPosters() {
    const { pet } = this.data;
    if (!pet) return;
    this.setData({ generating: true, error: '' });
    try {
      if (pet.id) {
        await publishPetCertToCloud(pet.id).catch(() => {});
      }
      const posters = await generatePetCertPosters(this, pet);
      this.setData({ posters, generating: false });
    } catch (err) {
      this.setData({
        generating: false,
        error: '海报生成失败，请重试',
      });
      wx.showToast({ title: '海报生成失败', icon: 'none' });
    }
  },

  onSwiperChange(e) {
    this.setData({ current: e.detail.current });
  },

  onRetry() {
    this.buildPosters();
  },

  onPreview() {
    const { posters, current } = this.data;
    const item = posters[current];
    if (!item) return;
    wx.previewImage({
      urls: posters.map((p) => p.url),
      current: item.url,
    });
  },

  onSave() {
    const { posters, current } = this.data;
    const item = posters[current];
    if (!item) return;
    wx.showLoading({ title: '保存中...' });
    wx.saveImageToPhotosAlbum({
      filePath: item.url,
      success: () => {
        wx.hideLoading();
        wx.showToast({ title: '已保存到相册', icon: 'success' });
      },
      fail: (err) => {
        wx.hideLoading();
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许保存到相册，以便保存分享海报',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) wx.openSetting();
            },
          });
          return;
        }
        wx.showToast({ title: '保存失败', icon: 'none' });
      },
    });
  },

  onShareAppMessage() {
    const { pet, posters, current } = this.data;
    const name = pet && pet.name ? pet.name : '毛孩子';
    return {
      title: `${name} 的电子宠证 · 宠头头`,
      path: '/pages/pet-cert/pet-cert',
      imageUrl: posters[current]?.url || '',
    };
  },
});
