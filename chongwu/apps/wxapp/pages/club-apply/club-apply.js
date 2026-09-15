const store = require('../../utils/store');
const { chooseMedia } = require('../../utils/choose-media');

Page({
  data: {
    apply: null,
    name: '',
    city: '',
    intro: '',
    contact: '',
    cover: '',
  },

  onShow() {
    const storeCity = store.getCity();
    // 首次进入用当前城市；从城市选择器返回时同步用户选中的城市
    const city = this.data.city && this._lastStoreCity === storeCity ? this.data.city : storeCity;
    this._lastStoreCity = storeCity;
    this.setData({ city, apply: store.getClubApply() });
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
      success: (res) => {
        if (res.confirm) {
          store.clearClubApply();
          this.setData({ apply: null });
        }
      },
    });
  },

  onSubmit() {
    const { name, city, intro, contact, cover } = this.data;
    if (!name) return wx.showToast({ title: '请填写俱乐部名称', icon: 'none' });
    if (!city) return wx.showToast({ title: '请选择所在城市', icon: 'none' });
    if (!intro) return wx.showToast({ title: '请填写俱乐部介绍', icon: 'none' });
    if (!cover) return wx.showToast({ title: '请上传俱乐部封面', icon: 'none' });

    store.submitClubApply({ name, city, intro, contact, cover });
    this.setData({ apply: store.getClubApply() });
    wx.showToast({ title: '已提交审核', icon: 'success' });
  },
});
