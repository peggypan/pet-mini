const store = require('../../utils/store');
const cloudApi = require('../../utils/cloud-api');
const {
  refreshChatThreadsFromCloud,
  removeChatThreadOnCloud,
  CHAT_THREAD_POLL_MS,
} = require('../../utils/chat-cloud-sync');
const { requireLogin } = require('../../utils/require-login');
const { buildNotices, countUnreadNotices } = require('../../utils/notice-feed');
const { syncPetProfileGate, requireInteract } = require('../../utils/pet-profile-guard');
const { decorateChatThreadsForList } = require('../../utils/chat-thread-display');
const { refreshAllTabBars } = require('../../utils/tab-bar-badge');

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
      this.getTabBar().setData({ selected: 3 });
    }
    refreshAllTabBars();
  },

  refreshNoticeList() {
    this.setData({
      notices: buildNotices(),
      noticeUnread: countUnreadNotices(),
    });
    this.refreshTabBadge();
  },

  applyChatTabFromCache(silent) {
    store.persistChatThreadsCompact();
    const patch = {
      chats: decorateChatThreadsForList(store.listChatThreads()),
      chatUnread: store.countUnreadChats(),
    };
    if (!silent) {
      patch.notices = buildNotices();
      patch.noticeUnread = countUnreadNotices();
    }
    this.setData(patch, () => {
      this.refreshTabBadge();
    });
  },

  async refreshChatTab(silent) {
    this.applyChatTabFromCache(silent);
    if (!cloudApi.cloudEnabled()) return;
    try {
      await refreshChatThreadsFromCloud();
    } catch (e) {
      // keep cache
    }
    this.applyChatTabFromCache(silent);
  },

  onShow() {
    syncPetProfileGate(this);
    this.applyChatTabFromCache(false);
    this.refreshChatTab(true);
    this._chatListPollTimer = setInterval(() => {
      if (this.data.tab === 'chat') this.refreshChatTab(true);
    }, CHAT_THREAD_POLL_MS);
  },

  onHide() {
    if (this._chatListPollTimer) {
      clearInterval(this._chatListPollTimer);
      this._chatListPollTimer = null;
    }
  },

  onTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab });
    if (tab === 'notice') this.refreshNoticeList();
  },

  onOpenNoticeTab() {
    this.setData({ tab: 'notice' });
    this.refreshNoticeList();
  },

  onMarkAllNoticesRead() {
    if (!countUnreadNotices()) return;
    wx.showModal({
      title: '全部标为已读',
      content: '将全部通知标为已读，已读通知仍保留在列表中。',
      confirmText: '确定',
      success: (res) => {
        if (!res.confirm) return;
        store.markMessagesRead();
        this.refreshNoticeList();
        wx.showToast({ title: '已全部已读', icon: 'success' });
      },
    });
  },

  onChatLongPress(e) {
    if (!requireLogin()) return;
    const { threadid, title } = e.currentTarget.dataset || {};
    if (!threadid) return;
    const name = title ? decodeURIComponent(String(title)) : '该会话';
    wx.showActionSheet({
      itemList: ['删除会话'],
      itemColor: '#C45C26',
      success: (res) => {
        if (res.tapIndex !== 0) return;
        wx.showModal({
          title: '删除会话',
          content: `确定删除与「${name}」的私信？聊天记录将从列表移除。`,
          confirmText: '删除',
          confirmColor: '#C45C26',
          success: async (modal) => {
            if (!modal.confirm) return;
            wx.showLoading({ title: '删除中…', mask: true });
            try {
              await removeChatThreadOnCloud(threadid);
              await this.refreshChatTab(true);
              wx.showToast({ title: '已删除', icon: 'success' });
            } catch (err) {
              wx.showToast({ title: (err && err.message) || '删除失败', icon: 'none' });
            } finally {
              wx.hideLoading();
            }
          },
        });
      },
    });
  },

  onChatTap(e) {
    if (!requireInteract()) return;
    const { peerid, threadid, peername, petname, avatar, peeropenid } = e.currentTarget.dataset;
    const q = [];
    if (threadid) q.push(`threadId=${encodeURIComponent(threadid)}`);
    if (peerid) q.push(`peerId=${encodeURIComponent(peerid)}`);
    if (peeropenid) q.push(`peerOpenid=${encodeURIComponent(peeropenid)}`);
    if (peername) q.push(`peerName=${encodeURIComponent(peername)}`);
    if (petname) q.push(`petName=${encodeURIComponent(petname)}`);
    if (avatar) q.push(`avatar=${encodeURIComponent(avatar)}`);
    wx.navigateTo({ url: `/pages/chat/chat?${q.join('&')}` });
  },

  onDiscoverTap() {
    wx.switchTab({ url: '/pages/discover/discover' });
  },

  onNoticeTap(e) {
    const { id, url } = e.currentTarget.dataset || {};
    if (id) {
      store.markNoticeReadById(id);
      this.refreshNoticeList();
    }
    if (url) wx.navigateTo({ url });
  },

  onNoticeLongPress(e) {
    const { id, title } = e.currentTarget.dataset || {};
    if (!id) return;
    const label = title ? String(title) : '该通知';
    wx.showActionSheet({
      itemList: ['删除通知'],
      itemColor: '#C45C26',
      success: (res) => {
        if (res.tapIndex !== 0) return;
        wx.showModal({
          title: '删除通知',
          content: `确定删除「${label}」？`,
          confirmText: '删除',
          confirmColor: '#C45C26',
          success: (modal) => {
            if (!modal.confirm) return;
            store.removeNoticeById(id);
            this.refreshNoticeList();
            this.refreshTabBadge();
            wx.showToast({ title: '已删除', icon: 'success' });
          },
        });
      },
    });
  },
});
