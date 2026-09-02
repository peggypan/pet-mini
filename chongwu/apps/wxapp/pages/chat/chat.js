const { MOCK_CHATS, MOCK_NEARBY } = require('../../utils/mock');
const store = require('../../utils/store');

Page({
  data: {
    threadId: '',
    peer: null,
    messages: [],
    inputText: '',
  },

  onLoad(options) {
    const peerId = options.peerId || '';
    this.initThread(peerId);
  },

  initThread(peerId) {
    const threads = store.listChatThreads();
    let thread = threads.find((t) => String(t.peerId) === String(peerId));
    if (!thread && peerId) {
      const friend = MOCK_NEARBY.find((f) => String(f.id) === String(peerId));
      if (friend) {
        thread = {
          id: `c_${peerId}`,
          peerId: friend.id,
          peerName: friend.userName,
          petName: friend.petName,
          avatar: friend.avatar,
          lastMessage: '',
          lastTime: '',
          unread: 0,
        };
      }
    }
    if (!thread) {
      thread = threads[0] || MOCK_CHATS[0];
    }
    const peer = {
      id: thread.peerId,
      userName: thread.peerName,
      petName: thread.petName,
      avatar: thread.avatar,
    };
    store.markThreadRead(thread.id);
    this.setData({
      threadId: thread.id,
      peer,
      messages: store.getChatMessages(thread.id),
    });
    wx.setNavigationBarTitle({ title: `${peer.userName} · ${peer.petName}` });
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  onSend() {
    const text = (this.data.inputText || '').trim();
    if (!text) return;
    const row = store.addChatMessage(this.data.threadId, { from: 'me', content: text });
    this.setData({
      inputText: '',
      messages: [...this.data.messages, row],
    });
    setTimeout(() => {
      const reply = store.addChatMessage(this.data.threadId, {
        from: 'peer',
        content: '收到啦～我们也可以约个时间让毛孩子见见面 🐾',
      });
      this.setData({ messages: [...this.data.messages, reply] });
    }, 900);
  },
});
