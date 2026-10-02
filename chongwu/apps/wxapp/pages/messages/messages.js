const store = require('../../utils/store');
const { buildNotices, countUnreadNotices } = require('../../utils/notice-feed');
const { syncPetProfileGate, requirePetProfile } = require('../../utils/pet-profile-guard');

Page({
  data: {
    tab: 'chat',
    chats: [],
    notices: [],
    noticeUnread: 0,
    chatUnread: 0,
    petProfileBlocked: false,
  },

  refreshTabBadge() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const bar = this.getTabBar();
      bar.setData({ selected: 3 });
      if (typeof bar.refreshUnread === 'function') bar.refreshUnread();
    }
  },

  consumeNoticeUnread() {
    store.markMessagesRead();
    const notices = (this.data.notices || []).map((n) => ({ ...n, read: true }));
    this.setData({ notices, noticeUnread: 0 });
    this.refreshTabBadge();
  },

  onShow() {
    syncPetProfileGate(this);
    const notices = buildNotices();
    const noticeUnread = countUnreadNotices();
    this.setData({
      chats: store.listChatThreads(),
      notices,
      noticeUnread,
      chatUnread: store.countUnreadChats(),
    }, () => {
      if (this.data.tab === 'notice') this.consumeNoticeUnread();
      else this.refreshTabBadge();
    });
  },

  onTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab });
    if (tab === 'notice') this.consumeNoticeUnread();
  },

  onChatTap(e) {
    if (!requirePetProfile()) return;
    const { peerid } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/chat/chat?peerId=${peerid}` });
  },

  onDiscoverTap() {
    wx.switchTab({ url: '/pages/discover/discover' });
  },

  onNoticeTap(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.navigateTo({ url });
  },
});
