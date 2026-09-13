const petRaise = require('../../utils/pet-raise');
const { getDefaultPet } = require('../../utils/catalog');
const { chooseMedia } = require('../../utils/choose-media');

Page({
  data: {
    pet: null,
    showShop: false,
    showLog: false,
    shopItems: [],
    animating: false,
    bubbleAnim: false,
    generating: false,
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const profile = getDefaultPet();
    const pet = petRaise.getState(profile);
    this.setData({
      pet,
      shopItems: petRaise.listShop().map((item) => ({
        ...item,
        owned: pet.inventory[item.id] || 0,
      })),
    });
  },

  onUploadPhoto() {
    if (this.data.generating) return;
    chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.tempFilePath) return;
        this.setData({ generating: true });
        wx.showLoading({ title: '生成数字宠物…', mask: true });
        setTimeout(() => {
          const result = petRaise.generateFromPhoto(file.tempFilePath, getDefaultPet());
          wx.hideLoading();
          this.setData({ generating: false, pet: result.state, animating: true, bubbleAnim: true });
          setTimeout(() => this.setData({ animating: false, bubbleAnim: false }), 800);
          wx.showToast({ title: result.message, icon: result.ok ? 'success' : 'none' });
          this.refresh();
        }, 600);
      },
    });
  },

  onCheckIn() {
    const res = petRaise.dailyCheckIn(getDefaultPet());
    wx.showToast({ title: res.message, icon: res.ok ? 'success' : 'none' });
    if (res.state) this.setData({ pet: res.state });
    this.refresh();
  },

  onAction(e) {
    const action = e.currentTarget.dataset.action;
    if (!action || this.data.animating) return;
    this.setData({ animating: true, bubbleAnim: true });
    const res = petRaise.interact(action, getDefaultPet());
    setTimeout(() => {
      this.setData({ animating: false, bubbleAnim: false });
    }, 600);
    if (!res.ok) {
      wx.showToast({ title: res.message, icon: 'none' });
      return;
    }
    wx.showToast({ title: res.message, icon: 'none' });
    this.setData({ pet: res.state });
    this.refresh();
  },

  onOpenShop() {
    this.refresh();
    this.setData({ showShop: true });
  },

  onCloseShop() {
    this.setData({ showShop: false });
  },

  onBuy(e) {
    const id = e.currentTarget.dataset.id;
    const res = petRaise.buyItem(id, getDefaultPet());
    wx.showToast({ title: res.message, icon: res.ok ? 'success' : 'none' });
    if (res.state) {
      this.setData({ pet: res.state });
      this.refresh();
    }
  },

  onToggleLog() {
    this.setData({ showLog: !this.data.showLog });
  },

  onReset() {
    wx.showModal({
      title: '重新开始',
      content: '将重置生长进度、等级和背包，照片保留。确定吗？',
      success: (res) => {
        if (!res.confirm) return;
        const state = petRaise.resetPet(getDefaultPet());
        this.setData({ pet: state });
        this.refresh();
        wx.showToast({ title: '已重置', icon: 'success' });
      },
    });
  },

  onTapPet() {
    const res = petRaise.interact('stroke', getDefaultPet());
    this.setData({ animating: true, bubbleAnim: true, pet: res.state });
    setTimeout(() => this.setData({ animating: false, bubbleAnim: false }), 500);
  },
});
