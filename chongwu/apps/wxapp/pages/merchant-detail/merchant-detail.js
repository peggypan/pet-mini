const { findMerchant } = require('../../utils/catalog');

Page({
  data: { merchant: null },

  onLoad(options) {
    const merchant = findMerchant(options.id);
    if (!merchant) {
      wx.showToast({ title: '商家不存在', icon: 'none' });
      return;
    }
    this.setData({ merchant });
    wx.setNavigationBarTitle({ title: merchant.name });
  },

  onBook() {
    wx.navigateTo({ url: `/pages/service-book/service-book?id=${this.data.merchant.id}` });
  },
});
