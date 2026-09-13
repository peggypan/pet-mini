const { findMerchant } = require('../../utils/catalog');
const store = require('../../utils/store');

Page({
  data: { merchant: null, date: '', time: '', remark: '' },

  onLoad(options) {
    this.setData({ merchant: findMerchant(options.id) });
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onSubmit() {
    const { merchant, date, time, remark } = this.data;
    if (!merchant) return;
    if (!date) {
      wx.showToast({ title: '请选择预约日期', icon: 'none' });
      return;
    }
    store.addServiceBook({
      merchantId: merchant.id,
      merchantName: merchant.name,
      date,
      time,
      remark,
      payAmount: merchant.price,
    });
    wx.showToast({ title: '预约成功', icon: 'success' });
    setTimeout(() => wx.navigateBack({ delta: 2 }), 700);
  },
});
