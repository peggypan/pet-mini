const store = require('../../utils/store');
const cloudApi = require('../../utils/cloud-api');
const {
  refreshChatThreadsFromCloud,
  CHAT_THREAD_POLL_MS,
} = require('../../utils/chat-cloud-sync');
const { buildNotices, countUnreadNotices } = require('../../utils/notice-feed');
const { syncPetProfileGate, requireInteract } = require('../../utils/pet-profile-guard');
const { decorateChatThreadsForList } = require('../../utils/chat-thread-display');

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

  applyChatTabFromCache(silent) {
    const patch = {
      chats: decorateChatThreadsForList(store.listChatThreads()),
      chatUnread: store.countUnreadChats(),
    };
    if (!silent) {
      patch.notices = buildNotices();
      patch.noticeUnread = countUnreadNotices();
    }
    this.setData(patch, () => {
      if (this.data.tab === 'notice' && !silent) this.consumeNoticeUnread();
      else this.refreshTabBadge();
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
    if (tab === 'notice') this.consumeNoticeUnread();
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
    const url = e.currentTarget.dataset.url;
    if (url) wx.navigateTo({ url });
  },
});
