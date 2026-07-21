const api = require('../../utils/request');

Page({
  data: {
    service: null,
    quantity: 1,
  },

  onLoad(options) {
    this.loadServiceDetail(options.id);
  },

  async loadServiceDetail(id) {
    try {
      const res = await api.get(`/services/${id}`);
      this.setData({ service: res.data });
    } catch (e) {
      console.error(e);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onQuantityChange(e) {
    this.setData({ quantity: e.detail.value });
  },

  onBookTap() {
    const { service, quantity } = this.data;
    if (!service) return;
    
    wx.navigateTo({
      url: `/pages/service-order/service-order?serviceId=${service.id}&quantity=${quantity}`,
    });
  },
});
