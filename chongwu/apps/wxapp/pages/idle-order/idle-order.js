const api = require('../../utils/request');

Page({
  data: {
    itemId: null,
    item: null,
    deliveryType: 1,
    address: '',
  },

  onLoad(options) {
    this.setData({ itemId: options.itemId });
    this.loadItemDetail(options.itemId);
  },

  async loadItemDetail(id) {
    try {
      const res = await api.get(`/idle/${id}`);
      this.setData({ item: res.data });
    } catch (e) {
      console.error(e);
    }
  },

  onDeliveryTypeChange(e) {
    this.setData({ deliveryType: Number(e.detail.value) + 1 });
  },

  onInputChange(e) {
    this.setData({ address: e.detail.value });
  },

  async onSubmit() {
    const { itemId, deliveryType, address } = this.data;
    
    try {
      const res = await api.post('/idle/orders', {
        idleItemId: Number(itemId),
        deliveryType,
        address,
      });

      wx.showToast({ title: '下单成功', icon: 'success' });
      
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/orders/orders?type=idle`,
        });
      }, 1500);
    } catch (e) {
      wx.showToast({ title: '下单失败', icon: 'none' });
    }
  },
});
