const store = require('../../utils/store');

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

Page({
  data: {
    tab: 'chat',
    chats: [],
    notices: [],
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    const chats = store.listChatThreads();
    const notices = store.listMessages().map((m) => ({
      ...m,
      timeText: formatTime(m.createdAt),
    }));
    this.setData({ chats, notices });
    store.markMessagesRead();
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  onChatTap(e) {
    const { peerid } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/chat/chat?peerId=${peerid}` });
  },

  onDiscoverTap() {
    wx.switchTab({ url: '/pages/discover/discover' });
  },
});
