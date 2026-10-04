const { findMerchant } = require('../../utils/catalog');
const store = require('../../utils/store');
const cloudApi = require('../../utils/cloud-api');
const { fetchMerchantFromCloud } = require('../../utils/merchant-cloud-sync');
const { requireLogin } = require('../../utils/require-login');

Page({
  data: { merchant: null, date: '', time: '', remark: '' },

  onLoad(options) {
    const id = options.id;
    const merchant = findMerchant(id);
    this.setData({ merchant: merchant || null });
    if (cloudApi.cloudEnabled() && id) {
      fetchMerchantFromCloud(id)
        .then((row) => {
          if (row) this.setData({ merchant: row });
        })
        .catch(() => {});
    }
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onSubmit() {
    if (!requireLogin()) return;
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
