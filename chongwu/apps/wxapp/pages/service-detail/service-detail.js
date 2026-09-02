const api = require('../../utils/request');
const { findService } = require('../../utils/catalog');

Page({
  data: {
    service: null,
    quantity: 1,
  },

  onLoad(options) {
    this.loadServiceDetail(options.id);
  },

  async loadServiceDetail(id) {
    const fallback = findService(id);
    try {
      const res = await api.get(`/services/${id}`);
      if (res.data) {
        this.setData({
          service: {
            ...fallback,
            ...res.data,
            coverUrls: res.data.coverUrls?.length
              ? res.data.coverUrls
              : fallback?.coverUrls || [],
            merchant: res.data.merchant || fallback?.merchant,
          },
        });
        return;
      }
    } catch (e) {
      // 无后端时走 Mock
    }

    if (fallback) {
      this.setData({ service: fallback });
    } else {
      wx.showToast({ title: '服务不存在', icon: 'none' });
    }
  },

  onQuantityChange(e) {
    const quantity = Math.max(1, Number(e.detail.value) || 1);
    this.setData({ quantity });
  },

  onBookTap() {
    const { service, quantity } = this.data;
    if (!service) return;
    wx.navigateTo({
      url: `/pages/service-order/service-order?serviceId=${service.id}&quantity=${quantity}`,
    });
  },
});
