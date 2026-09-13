const { getDefaultPet } = require('../../utils/catalog');
const petRaise = require('../../utils/pet-raise');
const { chooseMedia } = require('../../utils/choose-media');

Page({
  data: {
    pet: {},
    virtualPet: null,
  },

  onShow() {
    const pet = getDefaultPet();
    this.setData({
      pet,
      virtualPet: petRaise.getState(pet),
    });
  },

  onEdit() {
    wx.navigateTo({ url: '/pages/pet-form/pet-form' });
  },

  onShare() {
    wx.showToast({ title: '海报生成（演示）', icon: 'none' });
  },

  onEnterRaise() {
    wx.navigateTo({ url: '/pages/pet-raise/pet-raise' });
  },

  onUploadPhoto() {
    chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (!file) return;
        wx.showLoading({ title: '生成中…', mask: true });
        setTimeout(() => {
          const result = petRaise.generateFromPhoto(file.tempFilePath, getDefaultPet());
          wx.hideLoading();
          wx.showToast({ title: result.message, icon: result.ok ? 'success' : 'none' });
          if (result.state) {
            this.setData({ virtualPet: result.state });
          }
        }, 500);
      },
    });
  },

  onQuickFeed() {
    const result = petRaise.interact('feed', getDefaultPet());
    wx.showToast({ title: result.message, icon: result.ok ? 'success' : 'none' });
    if (result.state) {
      this.setData({ virtualPet: result.state });
    }
  },
});
