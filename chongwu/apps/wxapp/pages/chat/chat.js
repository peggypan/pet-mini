const { MOCK_CHATS, MOCK_BUDDY, MOCK_EVENTS } = require('../../utils/mock');
const store = require('../../utils/store');
const { openEventPublishEntry } = require('../../utils/event-publish-nav');
const amap = require('../../utils/amap');
const { chooseMedia } = require('../../utils/choose-media');
const { evaluateChatSendLimit, canSendOutgoing } = require('../../utils/chat-send-limit');
const { syncPetProfileGate, requirePetProfile, blockSubPageWithoutProfile } = require('../../utils/pet-profile-guard');
const { followResultToast } = require('../../utils/pet-follow');
const cloudApi = require('../../utils/cloud-api');
const {
  ensureChatThreadOnCloud,
  loadChatMessagesFromCloud,
  markChatThreadReadOnCloud,
  sendChatMessageOnCloud,
} = require('../../utils/chat-cloud-sync');

Page({
  data: {
    threadId: '',
    peer: null,
    messages: [],
    inputText: '',
    panelTools: false,
    panelEmoji: false,
    scrollInto: '',
    playingId: '',
    showChatLimitTip: false,
    chatLimitTip: '',
    composerDisabled: false,
    composerPlaceholder: '说点什么…',
    petProfileBlocked: false,
    followed: false,
    peerLiked: false,
    centerHeartAnim: false,
  },

  onLoad(options) {
    blockSubPageWithoutProfile(this);
    this.entryOptions = options || {};
    this.peerOptions = {
      peerId: options.peerId || '',
      peerName: options.peerName ? decodeURIComponent(options.peerName) : '',
      petName: options.petName ? decodeURIComponent(options.petName) : '',
      avatar: options.avatar ? decodeURIComponent(options.avatar) : '',
    };
    this.initThread(this.peerOptions);
  },

  async onShow() {
    syncPetProfileGate(this);
    if (this.data.peer) this.syncPeerActions(this.data.peer);
    if (this.data.threadId) {
      let messages = store.getChatMessages(this.data.threadId);
      if (cloudApi.cloudEnabled()) {
        try {
          messages = await loadChatMessagesFromCloud(this.data.threadId);
        } catch (e) {
          // keep cache
        }
      }
      this.setData({ messages });
      this.syncLimitState(messages);
      this.scrollBottom();
    }
  },

  syncPeerActions(peer) {
    if (!peer || !peer.id) return;
    this.setData({
      followed: store.isFollowed(peer.id),
      peerLiked: store.isHeartLiked(peer.id, 'chat'),
    });
  },

  onToggleFollow() {
    const peer = this.data.peer;
    if (!peer || !peer.id) return;
    const result = store.toggleFollow({
      id: peer.id,
      userName: peer.userName,
      petName: peer.petName,
      avatar: peer.avatar,
    });
    this.setData({ followed: result.followed });
    wx.showToast({ title: followResultToast(result.followed), icon: 'none' });
  },

  onTogglePeerLike() {
    const peer = this.data.peer;
    if (!peer || !peer.id) return;
    const next = !this.data.peerLiked;
    store.setHeartLike({
      id: peer.id,
      source: 'chat',
      userName: peer.userName,
      petName: peer.petName,
      avatar: peer.avatar,
    }, next);
    if (next) {
      if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
      this.playCenterHeartAnim();
      this.setData({ peerLiked: true });
      return;
    }
    this.setData({ peerLiked: false, centerHeartAnim: false });
  },

  playCenterHeartAnim() {
    this.setData({ centerHeartAnim: true });
    if (this._likeAnimTimer) clearTimeout(this._likeAnimTimer);
    this._likeAnimTimer = setTimeout(() => {
      this.setData({ centerHeartAnim: false });
    }, 920);
  },

  getLimitState(messages) {
    const peerId = this.data.peer && this.data.peer.id;
    return evaluateChatSendLimit({
      peerId,
      messages: messages || this.data.messages,
      peerFollowsMe: peerId ? store.isFollowedByPeer(peerId) : false,
    });
  },

  syncLimitState(messages) {
    const limit = this.getLimitState(messages);
    this._limitState = limit;
    this.setData({
      showChatLimitTip: limit.showTip,
      chatLimitTip: limit.tipText,
      composerDisabled: limit.composerDisabled,
      composerPlaceholder: limit.composerDisabled ? '等待对方关注或回复后可继续发送' : '说点什么…',
    });
    return limit;
  },

  guardOutgoing(messageType) {
    const limit = this.getLimitState(this.data.messages);
    const check = canSendOutgoing(limit, messageType);
    if (check.ok) return true;
    wx.showToast({ title: check.reason || limit.tipText, icon: 'none', duration: 2800 });
    return false;
  },

  async initThread(options) {
    const peerId = typeof options === 'object' ? options.peerId : options;
    const customPeer = typeof options === 'object' ? options : {};
    const threads = store.listChatThreads();
    let thread = threads.find((t) => String(t.peerId) === String(peerId));
    if (!thread && peerId) {
      const friend = MOCK_BUDDY.find((f) => String(f.id) === String(peerId));
      if (friend) {
        thread = await ensureChatThreadOnCloud({
          id: `c_${peerId}`,
          peerId: friend.id,
          peerName: friend.userName,
          petName: friend.petName,
          avatar: friend.avatar,
        });
      } else if (customPeer.peerName) {
        thread = await ensureChatThreadOnCloud({
          id: `c_${peerId}`,
          peerId,
          peerName: customPeer.peerName,
          petName: customPeer.petName || '宠物',
          avatar: customPeer.avatar || '/assets/mock/real_avatar.jpg',
        });
      }
    }
    if (!thread && !cloudApi.cloudEnabled()) {
      thread = threads[0] || MOCK_CHATS[0];
    }
    if (!thread) return;
    const peer = {
      id: thread.peerId,
      userName: thread.peerName,
      petName: thread.petName,
      avatar: thread.avatar,
    };
    await markChatThreadReadOnCloud(thread.id);
    let messages = store.getChatMessages(thread.id);
    if (cloudApi.cloudEnabled()) {
      try {
        messages = await loadChatMessagesFromCloud(thread.id);
      } catch (e) {
        // keep cache
      }
    }
    this.syncPeerActions(peer);
    this.setData({ threadId: thread.id, peer, messages });
    wx.setNavigationBarTitle({ title: `${peer.userName} · ${peer.petName}` });
    messages = await this.maybeApplyEntryShareComment(messages);
    this.syncLimitState(messages);
    this.scrollBottom(messages.length);
  },

  async maybeApplyEntryShareComment(messages) {
    const o = this.entryOptions || {};
    if (o.shareComment !== '1' || !this.data.threadId) return messages;
    if (messages.some((m) => m.from === 'me' && m.type === 'shareComment')) {
      return messages;
    }
    const title = o.shareTitle ? decodeURIComponent(o.shareTitle) : '分享';
    const text = o.shareText ? decodeURIComponent(o.shareText) : '';
    const row = await sendChatMessageOnCloud(this.data.threadId, {
      from: 'me',
      type: 'shareComment',
      content: text,
      shareTitle: title,
      shareRef: o.shareRef || '',
    });
    if (!row) return messages;
    const next = [...messages, row];
    this.setData({ messages: next });
    return next;
  },

  async sendMessage(message, autoReply) {
    const row = await sendChatMessageOnCloud(this.data.threadId, message);
    if (!row) return null;
    this.appendMessage(row, autoReply);
    return row;
  },

  scrollBottom(index) {
    const idx = index !== undefined ? index : this.data.messages.length - 1;
    if (idx < 0) return;
    this.setData({ scrollInto: `msg-${idx}` });
  },

  appendMessage(row, autoReply) {
    const messages = [...this.data.messages, row];
    this.setData({ messages });
    const limit = this.syncLimitState(messages);
    this.scrollBottom(messages.length - 1);
    if (!autoReply) return;
    const shouldReply = limit.unlocked || limit.extraSentCount >= 1;
    if (shouldReply) {
      setTimeout(() => this.mockPeerReply(row), 900);
    }
  },

  async mockPeerReply(sent) {
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
    const row = await sendChatMessageOnCloud(this.data.threadId, reply);
    if (!row) return;
    const messages = [...this.data.messages, row];
    this.setData({ messages });
    this.syncLimitState(messages);
    this.scrollBottom(messages.length - 1);
  },

  onComposerInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  onComposerBlocked() {
    this.guardOutgoing('text');
  },

  onPanelChange(e) {
    const { showTools, showEmoji } = e.detail;
    this.setData({ panelTools: showTools, panelEmoji: showEmoji });
  },

  async onComposerSend(e) {
    if (!requirePetProfile()) return;
    if (this.data.composerDisabled) {
      this.guardOutgoing('text');
      return;
    }
    const text = (e.detail.value || '').trim();
    if (!text) return;
    if (!this.guardOutgoing('text')) return;
    this.setData({ inputText: '' });
    await this.sendMessage({ from: 'me', type: 'text', content: text }, true);
  },

  async onComposerVoice(e) {
    if (!this.guardOutgoing('voice')) return;
    const { filePath, duration } = e.detail;
    await this.sendMessage(
      {
        from: 'me',
        type: 'voice',
        url: filePath,
        duration,
        content: `[语音 ${duration}"]`,
      },
      true,
    );
  },

  onComposerTool(e) {
    if (this.data.composerDisabled) {
      this.guardOutgoing('text');
      return;
    }
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
      return;
    }
    if (action === 'location') {
      this.onChooseLocation();
      return;
    }
    if (action === 'aa' || action === 'redpack') {
      this.onAaCollect();
      return;
    }
    if (action === 'gift' || action === 'transfer' || action === 'favorite') {
      wx.showToast({ title: '功能即将上线', icon: 'none' });
    }
  },

  onAaCollect() {
    if (!this.guardOutgoing('aa')) return;
    const { pickAaAmount } = require('../../utils/chat-tool-actions');
    pickAaAmount()
      .then(({ aaAmount, aaPeople, aaPer }) => {
        this.sendMessage(
          {
            from: 'me',
            type: 'aa',
            content: String(aaAmount),
            aaAmount,
            aaPeople,
            aaPer,
          },
          true,
        );
      })
      .catch(() => {});
  },

  pickImage(sourceType) {
    if (!this.guardOutgoing('image')) return;
    chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType,
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (!file) return;
        this.sendMessage(
          {
            from: 'me',
            type: 'image',
            url: file.tempFilePath,
            content: '[图片]',
          },
          true,
        );
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
        if (!this.guardOutgoing('event')) return;
        this.sendMessage(
          {
            from: 'me',
            type: 'event',
            eventId: event.id,
            eventTitle: event.title,
            content: event.title,
          },
          true,
        );
      },
    });
  },

  onPlayVoice(e) {
    const { url, id } = e.currentTarget.dataset;
    if (!url) return;
    if (!this.innerAudio) {
      this.innerAudio = wx.createInnerAudioContext();
      this.innerAudio.onEnded(() => this.setData({ playingId: '' }));
      this.innerAudio.onError(() => this.setData({ playingId: '' }));
      this.innerAudio.onStop(() => this.setData({ playingId: '' }));
    }
    if (this.data.playingId === id) {
      this.innerAudio.stop();
      this.setData({ playingId: '' });
      return;
    }
    this.innerAudio.stop();
    this.innerAudio.src = url;
    this.setData({ playingId: id });
    this.innerAudio.play();
  },

  onVoiceLongPress(e) {
    const { index, url } = e.currentTarget.dataset;
    const item = this.data.messages[index];
    if (!item || item.type !== 'voice') return;
    wx.showActionSheet({
      itemList: [item.voiceText ? '重新转文字' : '转文字'],
      success: (res) => {
        if (res.tapIndex !== 0) return;
        wx.showLoading({ title: '转写中…' });
        // 演示环境无语音识别服务，先占位；接入 ASR 后替换为真实转写结果
        setTimeout(() => {
          wx.hideLoading();
          this.setData({
            [`messages[${index}].voiceText`]: '（语音转文字）明天下午带毛孩子去公园碰面吧～',
          });
        }, 600);
      },
    });
  },

  onHide() {
    if (this.innerAudio) {
      this.innerAudio.stop();
      this.setData({ playingId: '' });
    }
  },

  onUnload() {
    if (this.innerAudio) {
      this.innerAudio.destroy();
      this.innerAudio = null;
    }
  },

  onChooseVideo() {
    if (!this.guardOutgoing('video')) return;
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
        this.sendMessage(
          {
            from: 'me',
            type: 'video',
            url: file.tempFilePath,
            poster: file.thumbTempFilePath || '',
            content: '[视频]',
          },
          true,
        );
      },
    });
  },

  onChooseLocation() {
    if (!this.guardOutgoing('location')) return;
    amap.choosePoint()
      .then((loc) => {
        this.sendMessage(
          {
            from: 'me',
            type: 'location',
            content: loc.name || loc.address,
            location: {
              name: loc.name,
              address: loc.address,
              latitude: loc.latitude,
              longitude: loc.longitude,
            },
          },
          true,
        );
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
    amap.openPlaceFromTap(e);
  },
});
