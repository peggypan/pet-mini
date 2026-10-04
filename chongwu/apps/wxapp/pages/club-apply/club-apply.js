const store = require('../../utils/store');
const cloudApi = require('../../utils/cloud-api');
const {
  refreshHostApplyFromCloud,
  submitHostApplyToCloud,
  withdrawHostApplyFromCloud,
} = require('../../utils/host-apply-cloud-sync');
const { chooseMedia } = require('../../utils/choose-media');
const { blockSubPageWithoutLogin } = require('../../utils/pet-profile-guard');
const { requireLogin } = require('../../utils/require-login');

Page({
  data: {
    apply: null,
    name: '',
    city: '',
    intro: '',
    contact: '',
    cover: '',
  },

  onLoad() {
    blockSubPageWithoutLogin(this);
  },

  onShow() {
    const storeCity = store.getCity();
    const city = this.data.city && this._lastStoreCity === storeCity ? this.data.city : storeCity;
    this._lastStoreCity = storeCity;
    this.setData({ city, apply: store.getClubApply() });
    if (cloudApi.cloudEnabled()) {
      refreshHostApplyFromCloud()
        .then((apply) => this.setData({ apply: apply || store.getClubApply() }))
        .catch(() => {});
    }
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onPickCity() {
    wx.navigateTo({ url: '/pages/city-picker/city-picker' });
  },

  onChooseCover() {
    chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (file) this.setData({ cover: file.tempFilePath });
      },
    });
  },

  onReset() {
    wx.showModal({
      title: '撤回申请',
      content: '撤回后可重新填写入驻信息',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中', mask: true });
        try {
          await withdrawHostApplyFromCloud();
          this.setData({ apply: null });
          wx.showToast({ title: '已撤回', icon: 'success' });
        } catch (e) {
          wx.showToast({ title: e.message || '撤回失败', icon: 'none' });
        } finally {
          wx.hideLoading();
        }
      },
    });
  },

  async onSubmit() {
    if (!requireLogin()) return;
    const { name, city, intro, contact, cover, apply } = this.data;
    if (apply && apply.status === 'pending') {
      wx.showToast({ title: '审核中，请耐心等待', icon: 'none' });
      return;
    }
    if (apply && apply.status === 'approved') {
      wx.showToast({ title: '已成为主理人', icon: 'none' });
      return;
    }
    if (!name) return wx.showToast({ title: '请填写俱乐部名称', icon: 'none' });
    if (!city) return wx.showToast({ title: '请选择所在城市', icon: 'none' });
    if (!intro) return wx.showToast({ title: '请填写俱乐部介绍', icon: 'none' });
    if (!cover) return wx.showToast({ title: '请上传俱乐部封面', icon: 'none' });

    wx.showLoading({ title: '提交中', mask: true });
    try {
      const row = await submitHostApplyToCloud({ name, city, intro, contact, cover });
      this.setData({ apply: row });
      wx.showToast({ title: '已提交审核', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: e.message || '提交失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },
});
