const { MOCK_CHATS, MOCK_BUDDY, MOCK_EVENTS } = require('../../utils/mock');
const store = require('../../utils/store');
const { openEventPublishEntry } = require('../../utils/event-publish-nav');
const amap = require('../../utils/amap');
const { chooseMedia } = require('../../utils/choose-media');

Page({
  data: {
    threadId: '',
    peer: null,
    messages: [],
    inputText: '',
    panelTools: false,
    panelEmoji: false,
    scrollInto: '',
  },

  onLoad(options) {
    this.peerOptions = {
      peerId: options.peerId || '',
      peerName: options.peerName ? decodeURIComponent(options.peerName) : '',
      petName: options.petName ? decodeURIComponent(options.petName) : '',
      avatar: options.avatar ? decodeURIComponent(options.avatar) : '',
    };
    this.initThread(this.peerOptions);
  },

  onShow() {
    if (this.data.threadId) {
      this.setData({ messages: store.getChatMessages(this.data.threadId) });
      this.scrollBottom();
    }
  },

  initThread(options) {
    const peerId = typeof options === 'object' ? options.peerId : options;
    const customPeer = typeof options === 'object' ? options : {};
    const threads = store.listChatThreads();
    let thread = threads.find((t) => String(t.peerId) === String(peerId));
    if (!thread && peerId) {
      const friend = MOCK_BUDDY.find((f) => String(f.id) === String(peerId));
      if (friend) {
        thread = store.ensureChatThread({
          id: `c_${peerId}`,
          peerId: friend.id,
          peerName: friend.userName,
          petName: friend.petName,
          avatar: friend.avatar,
        });
      } else if (customPeer.peerName) {
        thread = store.ensureChatThread({
          id: `c_${peerId}`,
          peerId,
          peerName: customPeer.peerName,
          petName: customPeer.petName || '宠物',
          avatar: customPeer.avatar || '/assets/mock/real_avatar.jpg',
        });
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
    const messages = store.getChatMessages(thread.id);
    this.setData({ threadId: thread.id, peer, messages });
    wx.setNavigationBarTitle({ title: `${peer.userName} · ${peer.petName}` });
    this.scrollBottom(messages.length);
  },

  scrollBottom(index) {
    const idx = index !== undefined ? index : this.data.messages.length - 1;
    if (idx < 0) return;
    this.setData({ scrollInto: `msg-${idx}` });
  },

  appendMessage(row, autoReply) {
    const messages = [...this.data.messages, row];
    this.setData({ messages });
    this.scrollBottom(messages.length - 1);
    if (autoReply) {
      setTimeout(() => this.mockPeerReply(row), 900);
    }
  },

  mockPeerReply(sent) {
    let reply;
    if (sent.type === 'voice') {
      reply = { from: 'peer', type: 'text', content: '收到语音啦～' };
    } else if (sent.type === 'image') {
      reply = { from: 'peer', type: 'text', content: '好可爱的照片！🐾' };
    } else if (sent.type === 'video') {
      reply = { from: 'peer', type: 'text', content: '收到视频啦～' };
    } else if (sent.type === 'event') {
      reply = { from: 'peer', type: 'text', content: '这个活动看起来不错！' };
    } else if (sent.type === 'location') {
      reply = { from: 'peer', type: 'text', content: '收到位置，我们可以这里碰面！' };
    } else if (sent.type === 'call') {
      reply = { from: 'peer', type: 'text', content: '刚才通话很开心，下次再聊～' };
    } else {
      reply = { from: 'peer', type: 'text', content: '收到啦～我们也可以约个时间让毛孩子见见面 🐾' };
    }
    const row = store.addChatMessage(this.data.threadId, reply);
    const messages = [...this.data.messages, row];
    this.setData({ messages });
    this.scrollBottom(messages.length - 1);
  },

  onComposerInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  onPanelChange(e) {
    const { showTools, showEmoji } = e.detail;
    this.setData({ panelTools: showTools, panelEmoji: showEmoji });
  },

  onComposerSend(e) {
    const text = (e.detail.value || '').trim();
    if (!text) return;
    const row = store.addChatMessage(this.data.threadId, { from: 'me', type: 'text', content: text });
    this.setData({ inputText: '' });
    this.appendMessage(row, true);
  },

  onComposerVoice(e) {
    const { filePath, duration } = e.detail;
    const row = store.addChatMessage(this.data.threadId, {
      from: 'me',
      type: 'voice',
      url: filePath,
      duration,
      content: `[语音 ${duration}"]`,
    });
    this.appendMessage(row, true);
  },

  onComposerTool(e) {
    const { action } = e.detail;
    if (action === 'photo') {
      this.pickImage(['album']);
      return;
    }
    if (action === 'camera') {
      this.pickImage(['camera']);
      return;
    }
    if (action === 'video') {
      this.onChooseVideo();
      return;
    }
    if (action === 'activity') {
      this.onShareActivity();
    }
  },

  pickImage(sourceType) {
    chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType,
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (!file) return;
        const row = store.addChatMessage(this.data.threadId, {
          from: 'me',
          type: 'image',
          url: file.tempFilePath,
          content: '[图片]',
        });
        this.appendMessage(row, true);
      },
    });
  },

  onShareActivity() {
    const event = MOCK_EVENTS[0];
    if (!event) {
      openEventPublishEntry();
      return;
    }
    wx.showActionSheet({
      itemList: ['发送近期活动', '发起新活动'],
      success: (res) => {
        if (res.tapIndex === 1) {
          openEventPublishEntry();
          return;
        }
        const row = store.addChatMessage(this.data.threadId, {
          from: 'me',
          type: 'event',
          eventId: event.id,
          eventTitle: event.title,
          content: event.title,
        });
        this.appendMessage(row, true);
      },
    });
  },

  onPlayVoice(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    if (!this.innerAudio) {
      this.innerAudio = wx.createInnerAudioContext();
    }
    this.innerAudio.stop();
    this.innerAudio.src = url;
    this.innerAudio.play();
  },

  onChooseVideo() {
    chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (!file) return;
        if (file.size > 50 * 1024 * 1024) {
          wx.showToast({ title: '视频请小于 50MB', icon: 'none' });
          return;
        }
        const row = store.addChatMessage(this.data.threadId, {
          from: 'me',
          type: 'video',
          url: file.tempFilePath,
          poster: file.thumbTempFilePath || '',
          content: '[视频]',
        });
        this.appendMessage(row, true);
      },
    });
  },

  onChooseLocation() {
    amap.choosePoint()
      .then((loc) => {
        const row = store.addChatMessage(this.data.threadId, {
          from: 'me',
          type: 'location',
          content: loc.name || loc.address,
          location: {
            name: loc.name,
            address: loc.address,
            latitude: loc.latitude,
            longitude: loc.longitude,
          },
        });
        this.appendMessage(row, true);
      })
      .catch((err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return;
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要位置权限',
            content: '发送位置需要授权，请在设置中开启',
            confirmText: '去设置',
            success: (r) => { if (r.confirm) wx.openSetting(); },
          });
        }
      });
  },

  onVideoCall() {
    const { peer, threadId } = this.data;
    if (!peer) return;
    wx.showModal({
      title: '发起视频通话',
      content: `向 ${peer.userName} 发起视频通话？`,
      confirmText: '呼叫',
      success: (res) => {
        if (!res.confirm) return;
        wx.navigateTo({
          url: `/pages/chat-call/chat-call?threadId=${threadId}&peerId=${peer.id}&peerName=${encodeURIComponent(peer.userName)}&petName=${encodeURIComponent(peer.petName)}&avatar=${encodeURIComponent(peer.avatar)}`,
        });
      },
    });
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    const images = this.data.messages.filter((m) => m.type === 'image').map((m) => m.url);
    wx.previewImage({ urls: images.length ? images : [url], current: url });
  },

  onPreviewVideo(e) {
    const url = e.currentTarget.dataset.url;
    const poster = e.currentTarget.dataset.poster;
    wx.previewMedia({ sources: [{ url, type: 'video', poster }] });
  },

  onOpenLocation(e) {
    const { lat, lng, name, address } = e.currentTarget.dataset;
    amap.openNavigation({
      lat: Number(lat),
      lng: Number(lng),
      name: name || '位置',
      address: address || '',
    });
  },
});
