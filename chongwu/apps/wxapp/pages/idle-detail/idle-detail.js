const api = require('../../utils/request');
const { findIdleItem } = require('../../utils/catalog');

Page({
  data: {
    item: null,
  },

  onLoad(options) {
    this.loadItemDetail(options.id);
  },

  async loadItemDetail(id) {
    const fallback = findIdleItem(id);
    try {
      const res = await api.get(`/idle/${id}`);
      if (res.data) {
        this.setData({ item: { ...fallback, ...res.data } });
        return;
      }
    } catch (e) {
      // mock / local
    }
    if (fallback) {
      this.setData({ item: fallback });
    } else {
      wx.showToast({ title: '商品不存在', icon: 'none' });
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
    wx.showModal({
      title: '联系卖家',
      content: '演示环境：可先下单，卖家信息将在订单中展示。',
      confirmText: '去下单',
      success: (res) => {
        if (res.confirm) this.onBuyTap();
      },
    });
  },
});
