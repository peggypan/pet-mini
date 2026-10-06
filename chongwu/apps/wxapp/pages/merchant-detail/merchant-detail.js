const { findMerchant } = require('../../utils/catalog');
const cloudApi = require('../../utils/cloud-api');
const { fetchMerchantFromCloud } = require('../../utils/merchant-cloud-sync');
const amap = require('../../utils/amap');

Page({
  data: {
    merchant: null,
    loading: true,
  },

  onLoad(options) {
    const id = options.id || '';
    this._merchantId = id;
    this.loadMerchant(id);
  },

  loadMerchant(id) {
    if (!id) {
      this.setData({ loading: false, merchant: null });
      wx.showToast({ title: '缺少商家信息', icon: 'none' });
      return;
    }
    let merchant = findMerchant(id);
    if (merchant) {
      this.setData({ merchant, loading: false });
      wx.setNavigationBarTitle({ title: merchant.name || '商家详情' });
    }
    if (cloudApi.cloudEnabled()) {
      fetchMerchantFromCloud(id)
        .then((row) => {
          if (row) {
            this.setData({ merchant: row, loading: false });
            wx.setNavigationBarTitle({ title: row.name || '商家详情' });
          } else if (!merchant) {
            this.setData({ loading: false });
          }
        })
        .catch(() => {
          if (!merchant) this.setData({ loading: false });
        });
    } else if (!merchant) {
      this.setData({ loading: false });
    }
  },

  onOpenPlace() {
    const { merchant } = this.data;
    if (!merchant || !merchant.address) return;
    amap.openPlace({
      name: merchant.name,
      address: merchant.address,
      city: merchant.city,
    });
  },

  onBook() {
    const id = this._merchantId || (this.data.merchant && this.data.merchant.id);
    if (!id) return;
    wx.navigateTo({ url: `/pages/service-book/service-book?id=${id}` });
  },

  onCall() {
    const phone = this.data.merchant && this.data.merchant.contactPhone;
    if (!phone) {
      wx.showToast({ title: '暂无联系电话', icon: 'none' });
      return;
    }
    wx.makePhoneCall({ phoneNumber: phone });
  },
});
