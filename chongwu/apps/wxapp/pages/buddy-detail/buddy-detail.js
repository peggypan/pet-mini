const { findBuddy } = require('../../utils/catalog');
const { RISK_TIPS } = require('../../utils/mock');
const store = require('../../utils/store');

Page({
  data: { buddy: null, followed: false },

  onLoad(options) {
    const buddy = findBuddy(options.id);
    if (!buddy) {
      wx.showToast({ title: '搭子不存在', icon: 'none' });
      return;
    }
    this.setData({
      buddy,
      followed: store.isFollowed(buddy.id),
    });
    if (buddy.zone === 'match') {
      wx.showModal({ title: '风险提示', content: RISK_TIPS.match, showCancel: false });
    }
  },

  onChat() {
    wx.showModal({
      title: '线下见面提示',
      content: RISK_TIPS.meet,
      confirmText: '发起私聊',
      success: (res) => {
        if (res.confirm) wx.navigateTo({ url: `/pages/chat/chat?peerId=${this.data.buddy.id}` });
      },
    });
  },

  onFollow() {
    const result = store.toggleFollow(this.data.buddy);
    this.setData({ followed: result.followed });
    wx.showToast({ title: result.followed ? '已收藏搭子' : '已取消收藏', icon: 'none' });
  },

  onReport() {
    wx.showToast({ title: '举报已提交审核', icon: 'none' });
  },

  onCert() {
    wx.navigateTo({ url: '/pages/pet-cert/pet-cert' });
  },

  onPreviewMedia(e) {
    const index = Number(e.currentTarget.dataset.index);
    const list = this.data.buddy?.mediaList || [];
    const item = list[index];
    if (!item) return;
    if (item.type === 'video') {
      if (!item.url || item.url === item.poster) {
        wx.showToast({ title: '演示视频暂不可播放', icon: 'none' });
        return;
      }
      wx.previewMedia({
        sources: [{ url: item.url, type: 'video', poster: item.poster || '' }],
      });
      return;
    }
    const images = list.filter((m) => m.type === 'image').map((m) => m.url);
    wx.previewImage({ urls: images, current: item.url });
  },
});
