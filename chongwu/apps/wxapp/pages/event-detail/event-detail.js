const { findEvent } = require('../../utils/catalog');
const { RISK_TIPS } = require('../../utils/mock');
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

  onSharePoster() {
    const { event } = this.data;
    if (!event) return;
    wx.navigateTo({ url: `/pages/event-poster/event-poster?id=${event.id}` });
  },

  onChatHost() {
    const { event } = this.data;
    if (!event) return;
    const peerId = event.hostId || `host_${event.id}`;
    const peerName = encodeURIComponent(event.host || '主理人');
    const petName = encodeURIComponent(event.hostPetName || '活动主理');
    const avatar = encodeURIComponent(event.hostAvatar || '');
    wx.showModal({
      title: '联系主理人',
      content: `将向「${event.host}」发起私信。${RISK_TIPS.meet}`,
      confirmText: '发起私聊',
      success: (res) => {
        if (!res.confirm) return;
        store.ensureChatThread({
          id: `c_${peerId}`,
          peerId,
          peerName: event.host || '主理人',
          petName: event.hostPetName || '活动主理',
          avatar: event.hostAvatar || '',
        });
        wx.navigateTo({
          url: `/pages/chat/chat?peerId=${peerId}&peerName=${peerName}&petName=${petName}&avatar=${avatar}`,
        });
      },
    });
  },
});
