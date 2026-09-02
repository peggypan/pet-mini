const { findEvent } = require('../../utils/catalog');
const store = require('../../utils/store');

Page({
  data: {
    event: null,
    signedUp: false,
  },

  onLoad(options) {
    const event = findEvent(options.id);
    if (!event) {
      wx.showToast({ title: '活动不存在', icon: 'none' });
      return;
    }
    const signedUp = store.listEventSignups().some((x) => String(x.eventId) === String(event.id));
    this.setData({ event, signedUp });
    wx.setNavigationBarTitle({ title: '约局详情' });
  },

  onSignup() {
    const { event, signedUp } = this.data;
    if (!event || signedUp) return;
    const result = store.addEventSignup(event);
    wx.showToast({
      title: result.duplicated ? '已报名过' : '报名成功',
      icon: result.duplicated ? 'none' : 'success',
    });
    this.setData({ signedUp: true });
  },

  onChatHost() {
    wx.showToast({ title: '已通过活动群发起联系', icon: 'none' });
  },
});
