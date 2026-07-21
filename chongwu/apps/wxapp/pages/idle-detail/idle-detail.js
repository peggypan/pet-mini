const api = require('../../utils/request');

Page({
  data: {
    item: null,
  },

  onLoad(options) {
    this.loadItemDetail(options.id);
  },

  async loadItemDetail(id) {
    try {
      const res = await api.get(`/idle/${id}`);
      this.setData({ item: res.data });
    } catch (e) {
      console.error(e);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onBuyTap() {
    const { item } = this.data;
    if (!item) return;
    
    wx.navigateTo({
      url: `/pages/idle-order/idle-order?itemId=${item.id}`,
    });
  },

  onContactTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },
});
