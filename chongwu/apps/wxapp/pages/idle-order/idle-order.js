const api = require('../../utils/request');
const { findIdleItem } = require('../../utils/catalog');
const store = require('../../utils/store');

Page({
  data: {
    itemId: null,
    item: null,
    deliveryType: 1,
    address: '',
    platformFee: '0.00',
    submitting: false,
  },

  onLoad(options) {
    this.setData({ itemId: options.itemId });
    this.loadItemDetail(options.itemId);
  },

  async loadItemDetail(id) {
    const fallback = findIdleItem(id);
    try {
      const res = await api.get(`/idle/${id}`);
      if (res.data) {
        const item = { ...fallback, ...res.data };
        this.setData({
          item,
          platformFee: (Number(item.price || 0) * 0.05).toFixed(2),
        });
        return;
      }
    } catch (e) {
      // local
    }
    if (fallback) {
      this.setData({
        item: fallback,
        platformFee: (Number(fallback.price || 0) * 0.05).toFixed(2),
      });
    }
  },

  onDeliveryTypeChange(e) {
    this.setData({ deliveryType: Number(e.detail.value) + 1 });
  },

  onInputChange(e) {
    this.setData({ address: e.detail.value });
  },

  async onSubmit() {
    const { itemId, item, deliveryType, address, submitting } = this.data;
    if (submitting || !item) return;

    if (!address) {
      wx.showToast({ title: '请填写地址或见面地点', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      await api.post('/idle/orders', {
        idleItemId: itemId,
        deliveryType,
        address,
      });
    } catch (e) {
      // local
    }

    store.addIdleBuyOrder({
      itemId,
      itemTitle: item.title,
      payAmount: Number(item.price || 0),
      images: item.images || [],
      deliveryType,
      address,
      seller: item.seller,
    });

    wx.showToast({ title: '下单成功', icon: 'success' });
    setTimeout(() => {
      wx.redirectTo({ url: '/pages/orders/orders?type=idle' });
    }, 800);
  },
});
