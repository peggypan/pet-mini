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
  refreshChatThreadsFromCloud,
  loadChatMessagesFromCloud,
  markChatThreadReadOnCloud,
  sendChatMessageOnCloud,
  startChatRealtime,
  stopChatRealtime,
  resolvePeerAvatarUrl,
  DEFAULT_PEER_AVATAR,
} = require('../../utils/chat-cloud-sync');
const { resolveCloudFileUrl } = require('../../utils/cloud-media');
const { decorateChatMessages } = require('../../utils/chat-time');
const { getDefaultPet } = require('../../utils/catalog');

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
    myAvatar: '/assets/mock/real_avatar.jpg',
    peerAvatar: DEFAULT_PEER_AVATAR,
  },

  onLoad(options) {
    blockSubPageWithoutProfile(this);
    this.entryOptions = options || {};
    this.peerOptions = {
      threadId: options.threadId || '',
      peerId: options.peerId || '',
      peerName: options.peerName ? decodeURIComponent(options.peerName) : '',
      petName: options.petName ? decodeURIComponent(options.petName) : '',
      avatar: options.avatar ? decodeURIComponent(options.avatar) : '',
      peerOpenid: options.peerOpenid ? decodeURIComponent(options.peerOpenid) : '',
    };
    this.initThread(this.peerOptions);
  },

  resolveMyAvatar() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const pet = getDefaultPet();
    return (
      userInfo.avatarUrl
      || pet.avatarUrl
      || pet.avatar
      || '/assets/mock/real_avatar.jpg'
    );
  },

  async onShow() {
    syncPetProfileGate(this);
    this.setData({ myAvatar: this.resolveMyAvatar() });
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
      messages = decorateChatMessages(messages);
      this.setData({ messages });
      this.syncLimitState(messages);
      this.scrollBottom();
      startChatRealtime(this, this.data.threadId);
    }
  },

  onHide() {
    stopChatRealtime(this);
    if (this.innerAudio) {
      this.innerAudio.stop();
      this.setData({ playingId: '' });
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
    if (cloudApi.cloudEnabled()) {
      try {
        await refreshChatThreadsFromCloud();
      } catch (e) {
        // keep cache
      }
    }
    let threads = store.listChatThreads();
    let thread = null;
    if (customPeer.threadId) {
      thread = threads.find((t) => String(t.id) === String(customPeer.threadId));
    }
    if (!thread && peerId) {
      thread = threads.find((t) => String(t.peerId) === String(peerId));
    }
    if (!thread && peerId) {
      const friend = MOCK_BUDDY.find((f) => String(f.id) === String(peerId));
      if (friend) {
        thread = await ensureChatThreadOnCloud({
          id: `c_${peerId}`,
          peerId: friend.id,
          peerOpenid: friend.openid || '',
          peerName: friend.userName,
          petName: friend.petName,
          avatar: friend.avatar,
        });
      } else if (customPeer.peerName) {
        thread = await ensureChatThreadOnCloud({
          id: `c_${peerId}`,
          peerId,
          peerOpenid: customPeer.peerOpenid || '',
          peerName: customPeer.peerName,
          petName: customPeer.petName || '宠物',
          avatar: customPeer.avatar || '/assets/mock/real_avatar.jpg',
        });
      }
    }
    if (!thread && customPeer.threadId) {
      thread = {
        id: customPeer.threadId,
        peerId: peerId || customPeer.peerId || customPeer.threadId,
        peerName: customPeer.peerName || '宠友',
        petName: customPeer.petName || '宠物',
        avatar: customPeer.avatar || '/assets/mock/real_avatar.jpg',
      };
    }
    if (!thread && !cloudApi.cloudEnabled()) {
      thread = threads[0] || MOCK_CHATS[0];
    }
    if (!thread) return;
    const peerAvatar = await resolvePeerAvatarUrl(thread.avatar);
    const peer = {
      id: thread.peerId,
      userName: thread.peerName,
      petName: thread.petName,
      avatar: peerAvatar,
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
    messages = decorateChatMessages(messages);
    this.setData({
      threadId: thread.id,
      peer,
      messages,
      myAvatar: this.resolveMyAvatar(),
      peerAvatar,
    });
    wx.setNavigationBarTitle({ title: `${peer.userName} · ${peer.petName}` });
    messages = await this.maybeApplyEntryShareComment(messages);
    messages = decorateChatMessages(messages);
    this.setData({ messages });
    this.syncLimitState(messages);
    this.scrollBottom(messages.length);
    startChatRealtime(this, thread.id);
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

  async sendMessage(message) {
    const row = await sendChatMessageOnCloud(this.data.threadId, message);
    if (!row) return null;
    this.appendMessage(row);
    return row;
  },

  scrollBottom(index) {
    const idx = index !== undefined ? index : this.data.messages.length - 1;
    if (idx < 0) return;
    this.setData({ scrollInto: `msg-${idx}` });
  },

  appendMessage(row) {
    const nextRow = row && row.type === 'voice'
      ? { ...row, playUrl: row.playUrl || row.url }
      : row;
    const messages = decorateChatMessages([...this.data.messages, nextRow]);
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
    await this.sendMessage({ from: 'me', type: 'text', content: text });
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
        );
      },
    });
  },

  async onPlayVoice(e) {
    const { url, id, index } = e.currentTarget.dataset;
    let playSrc = url || '';
    const idx = Number(index);
    const row = Number.isFinite(idx) ? this.data.messages[idx] : null;
    if (row && row.playUrl) playSrc = row.playUrl;
    if (!playSrc) return;
    if (playSrc.startsWith('cloud://')) {
      try {
        playSrc = await resolveCloudFileUrl(playSrc);
      } catch (err) {
        wx.showToast({ title: '语音加载失败', icon: 'none' });
        return;
      }
    }
    if (!this.innerAudio) {
      this.innerAudio = wx.createInnerAudioContext();
      this.innerAudio.obeyMuteSwitch = false;
      this.innerAudio.onEnded(() => this.setData({ playingId: '' }));
      this.innerAudio.onError(() => {
        this.setData({ playingId: '' });
        wx.showToast({ title: '无法播放语音', icon: 'none' });
      });
      this.innerAudio.onStop(() => this.setData({ playingId: '' }));
    }
    if (this.data.playingId === id) {
      this.innerAudio.stop();
      this.setData({ playingId: '' });
      return;
    }
    this.innerAudio.stop();
    this.innerAudio.src = playSrc;
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

  onUnload() {
    stopChatRealtime(this);
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
