const store = require('../../utils/store');
const { RISK_TIPS } = require('../../utils/mock');

Page({
  data: { title: '', desc: '', contact: '' },

  onLoad() {
    wx.showModal({ title: '风险提示', content: RISK_TIPS.help, showCancel: false });
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onSubmit() {
    if (!this.data.title || !this.data.desc) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    store.addLocalPost({ type: 'help', ...this.data });
    wx.showToast({ title: '发布成功', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 700);
  },
});
