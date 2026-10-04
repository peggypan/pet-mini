const { MOCK_CHATS, MOCK_BUDDY, MOCK_EVENTS } = require('../../utils/mock');
const store = require('../../utils/store');
const { openEventPublishEntry } = require('../../utils/event-publish-nav');
const amap = require('../../utils/amap');
const { chooseMedia } = require('../../utils/choose-media');
const { evaluateChatSendLimit, canSendOutgoing } = require('../../utils/chat-send-limit');
const {
  syncPetProfileGate,
  requireInteract,
  blockSubPageWithoutLogin,
  blockSubPageWithoutProfile,
} = require('../../utils/pet-profile-guard');
const {
  followResultToast,
  toFollowFriend,
  peerFollowIdCandidates,
  isFollowedAny,
  isFollowedByPeerAny,
  resolveChatPeerFollowKey,
} = require('../../utils/pet-follow');
const { fetchFollowRelation, toggleFollowOnCloud } = require('../../utils/follow-cloud-sync');
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
  resolveMyAvatarUrl,
  lookupPeerAvatarRaw,
  DEFAULT_PEER_AVATAR,
} = require('../../utils/chat-cloud-sync');
const { resolveVoicePlayUrl } = require('../../utils/chat-voice');
const { isCloudFileId, needsCloudUpload, resolveCloudFileUrl } = require('../../utils/cloud-media');
const { decorateChatMessages } = require('../../utils/chat-time');
const { formatChatThreadTitle } = require('../../utils/chat-thread-display');

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
    mutualFollow: false,
    peerFollowsMe: false,
    peerLiked: false,
    centerHeartAnim: false,
    myAvatar: '/assets/mock/real_avatar.jpg',
    peerAvatar: DEFAULT_PEER_AVATAR,
    peerDisplayTitle: '',
  },

  decorateChatUiMessages(list) {
    return decorateChatMessages(list, {
      myAvatar: this.data.myAvatar,
      peerAvatar: this.data.peerAvatar,
    });
  },

  async refreshChatAvatars() {
    const threadId = this.data.threadId;
    const peer = this.data.peer;
    const thread = threadId
      ? store.listChatThreads().find((t) => String(t.id) === String(threadId))
      : null;
    const peerRaw = await lookupPeerAvatarRaw(
      peer && peer.id,
      [
        (thread && thread.avatar) || '',
        (peer && peer.avatar) || '',
        (this.peerOptions && this.peerOptions.avatar) || '',
      ],
    );
    const [myAvatar, peerAvatar] = await Promise.all([
      resolveMyAvatarUrl(),
      resolvePeerAvatarUrl(peerRaw),
    ]);
    const patch = { myAvatar, peerAvatar };
    if (peer) patch.peer = { ...peer, avatar: peerAvatar };
    this.setData(patch);
    if (threadId && this.data.messages.length) {
      this.setData({
        messages: this.decorateChatUiMessages(this.data.messages),
      });
    }
  },

  onLoad(options) {
    if (!blockSubPageWithoutLogin(this)) return;
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
    this._initThreadPromise = this.initThread(this.peerOptions);
  },

  async onShow() {
    syncPetProfileGate(this);
    if (this._initThreadPromise) {
      await this._initThreadPromise.catch(() => {});
    }
    await this.refreshChatAvatars().catch(() => {});
    if (this.data.peer) await this.syncPeerActions(this.data.peer);
    if (this.data.threadId) {
      let messages = store.getChatMessages(this.data.threadId);
      if (cloudApi.cloudEnabled()) {
        try {
          messages = await loadChatMessagesFromCloud(this.data.threadId);
        } catch (e) {
          // keep cache
        }
      }
      messages = this.decorateChatUiMessages(messages);
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

  syncLocalFollowEntry(followKey, peer, following) {
    if (!followKey || !peer) return;
    const row = {
      id: followKey,
      userName: peer.userName,
      petName: peer.petName,
      avatar: peer.avatar,
    };
    const has = store.isFollowed(followKey);
    if (following && !has) store.toggleFollow(row);
    else if (!following && has) store.toggleFollow(row);
  },

  async syncPeerActions(peer) {
    if (!peer || !peer.id) return;
    const threadMeta = this._threadMeta || {};
    const targetOpenid = peer.peerOpenid || threadMeta.peerOpenid || '';
    const candidates = peerFollowIdCandidates(peer, threadMeta);
    let followed = isFollowedAny(candidates);
    let peerFollowsMe = isFollowedByPeerAny(candidates);
    let mutualFollow = followed && peerFollowsMe;

    if (targetOpenid && cloudApi.cloudEnabled()) {
      const rel = await fetchFollowRelation(targetOpenid);
      if (rel) {
        followed = !!rel.following;
        peerFollowsMe = !!rel.follower;
        mutualFollow = !!rel.mutual;
        const followKey = `oid:${targetOpenid}`;
        this.syncLocalFollowEntry(followKey, peer, followed);
      }
    }

    this.setData({
      followed,
      mutualFollow,
      peerFollowsMe,
      peerLiked: store.isHeartLiked(peer.id, 'chat'),
    });
    this.syncLimitState(this.data.messages);
  },

  async onToggleFollow() {
    if (!requireInteract()) return;
    const peer = this.data.peer;
    if (!peer || !peer.id) return;
    const threadMeta = this._threadMeta || {};
    const targetOpenid = peer.peerOpenid || threadMeta.peerOpenid || '';

    if (targetOpenid && cloudApi.cloudEnabled()) {
      try {
        const rel = await toggleFollowOnCloud(targetOpenid, {
          userName: peer.userName,
          petName: peer.petName,
          avatar: peer.avatar,
        });
        if (rel) {
          const followKey = `oid:${targetOpenid}`;
          this.syncLocalFollowEntry(followKey, peer, rel.following);
          this.setData({
            followed: !!rel.following,
            peerFollowsMe: !!rel.follower,
            mutualFollow: !!rel.mutual,
          });
          this.syncLimitState(this.data.messages);
          wx.showToast({ title: followResultToast(rel.following), icon: 'none' });
          return;
        }
      } catch (e) {
        console.warn('[chat] cloud follow', e);
      }
    }

    const friend = toFollowFriend({
      ...peer,
      openid: targetOpenid,
      peerOpenid: targetOpenid,
    }) || {
      id: resolveChatPeerFollowKey(peer, threadMeta) || peer.id,
      userName: peer.userName,
      petName: peer.petName,
      avatar: peer.avatar,
    };
    const result = store.toggleFollow(friend);
    const candidates = peerFollowIdCandidates(peer, threadMeta);
    const mutualFollow = result.followed && isFollowedByPeerAny(candidates);
    this.setData({
      followed: result.followed,
      mutualFollow,
      peerFollowsMe: isFollowedByPeerAny(candidates),
    });
    this.syncLimitState(this.data.messages);
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
      peerFollowsMe: !!this.data.peerFollowsMe,
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
      } else if (customPeer.peerName || customPeer.peerOpenid || peerId) {
        const peerOpenid = customPeer.peerOpenid
          || (String(peerId).startsWith('oid:') ? String(peerId).slice(4) : '')
          || (String(peerId).length > 24 ? String(peerId) : '');
        thread = await ensureChatThreadOnCloud({
          id: `c_${peerOpenid || peerId}`,
          peerId: peerOpenid || peerId,
          peerOpenid,
          peerName: customPeer.peerName || '宠友',
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
    if (!thread) {
      wx.showToast({ title: '无法打开会话，请从消息列表进入', icon: 'none' });
      return;
    }
    if (!thread.id) {
      wx.showToast({ title: '会话未创建成功，请重试', icon: 'none' });
      return;
    }
    const peerRaw = await lookupPeerAvatarRaw(thread.peerId, [
      customPeer.avatar,
      thread.avatar,
    ]);
    const [myAvatar, peerAvatar] = await Promise.all([
      resolveMyAvatarUrl(),
      resolvePeerAvatarUrl(peerRaw),
    ]);
    const peerDisplayTitle = formatChatThreadTitle(thread.peerName, thread.petName);
    this._threadMeta = {
      peerOpenid: thread.peerOpenid || customPeer.peerOpenid || '',
    };
    const peer = {
      id: thread.peerId,
      peerOpenid: this._threadMeta.peerOpenid,
      userName: thread.peerName,
      petName: thread.petName,
      avatar: peerAvatar,
      displayTitle: peerDisplayTitle,
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
    await this.syncPeerActions(peer);
    this.setData({
      threadId: thread.id,
      peer,
      peerDisplayTitle,
      myAvatar,
      peerAvatar,
    });
    messages = this.decorateChatUiMessages(messages);
    this.setData({ messages });
    wx.setNavigationBarTitle({ title: '私信' });
    messages = await this.maybeApplyEntryShareComment(messages);
    messages = this.decorateChatUiMessages(messages);
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
    const next = this.decorateChatUiMessages([...messages, row]);
    this.setData({ messages: next });
    return next;
  },

  async sendMessage(message) {
    if (!this.data.threadId) {
      if (this._initThreadPromise) await this._initThreadPromise.catch(() => {});
    }
    if (!this.data.threadId) {
      wx.showToast({ title: '会话未就绪，请返回消息列表重进', icon: 'none' });
      return null;
    }
    const localPath = message && message.url && needsCloudUpload(message.url) ? message.url : '';
    const row = await sendChatMessageOnCloud(this.data.threadId, message);
    if (!row) return null;
    if (row.type === 'voice' && localPath) {
      row.playUrl = localPath;
    } else if (row.type === 'voice' && row.url) {
      row.playUrl = row.url;
    }
    if (localPath && (row.type === 'image' || row.type === 'video') && isCloudFileId(row.url)) {
      row.url = localPath;
      if (row.poster && isCloudFileId(row.poster) && message.poster) {
        row.poster = message.poster;
      }
    }
    this.appendMessage(row);
    const fileId = row.fileId || (isCloudFileId(row.url) ? row.url : '');
    if (fileId && (row.type === 'image' || row.type === 'video' || row.type === 'voice')) {
      resolveCloudFileUrl(fileId)
        .then((url) => {
          if (!url || isCloudFileId(url)) return;
          const messages = this.data.messages.map((m) => {
            if (String(m.id) !== String(row.id)) return m;
            const patch = { ...m, url, fileId: fileId || m.fileId };
            if (m.type === 'voice') patch.playUrl = url;
            return patch;
          });
          this.setData({ messages: this.decorateChatUiMessages(messages) });
        })
        .catch(() => {});
    }
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
    const messages = this.decorateChatUiMessages([...this.data.messages, nextRow]);
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
    if (!requireInteract()) return;
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
    if (!requireInteract()) return;
    if (!this.guardOutgoing('voice')) return;
    const { filePath, duration } = e.detail;
    if (!filePath) {
      wx.showToast({ title: '录音失败，请重试', icon: 'none' });
      return;
    }
    await this.sendMessage(
      {
        from: 'me',
        type: 'voice',
        url: filePath,
        audioFormat: 'mp3',
        duration: Math.max(1, Number(duration) || 1),
        content: `[语音 ${Math.max(1, Number(duration) || 1)}"]`,
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
    const idx = Number(index);
    const row = Number.isFinite(idx) ? this.data.messages[idx] : null;
    const fileId = (row && row.fileId) || '';
    let playSrc = (row && row.playUrl) || url || (row && row.url) || fileId || '';
    if (!playSrc) {
      wx.showToast({ title: '语音地址无效', icon: 'none' });
      return;
    }
    try {
      const resolveSrc = isCloudFileId(playSrc)
        ? playSrc
        : (/^https?:\/\//.test(playSrc) ? playSrc : (fileId || playSrc));
      playSrc = await resolveVoicePlayUrl(resolveSrc);
      if (Number.isFinite(idx) && playSrc && row && playSrc !== row.playUrl) {
        this.setData({ [`messages[${idx}].playUrl`]: playSrc });
      }
    } catch (err) {
      wx.showToast({ title: '语音加载失败', icon: 'none' });
      return;
    }
    if (!playSrc) {
      wx.showToast({ title: '语音加载失败', icon: 'none' });
      return;
    }
    const audio = this.getVoiceAudio();
    if (this.data.playingId === id) {
      audio.stop();
      this.setData({ playingId: '' });
      return;
    }
    audio.stop();
    this.setData({ playingId: id });
    await new Promise((resolve, reject) => {
      const onReady = () => {
        audio.offCanplay(onReady);
        audio.offError(onFail);
        resolve();
      };
      const onFail = (err) => {
        audio.offCanplay(onReady);
        audio.offError(onFail);
        reject(err);
      };
      audio.onCanplay(onReady);
      audio.onError(onFail);
      audio.src = playSrc;
    });
    audio.play();
  },

  getVoiceAudio() {
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
    return this.innerAudio;
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

  async onChatImageError(e) {
    const { index, fileId } = e.currentTarget.dataset;
    const idx = Number(index);
    const item = Number.isFinite(idx) ? this.data.messages[idx] : null;
    const fid = fileId
      || (item && item.fileId)
      || (item && isCloudFileId(item.url) ? item.url : '');
    if (!fid || !isCloudFileId(fid)) return;
    try {
      const url = await resolveCloudFileUrl(fid);
      if (url && !isCloudFileId(url) && Number.isFinite(idx)) {
        this.setData({ [`messages[${idx}].url`]: url });
      }
    } catch (err) {
      // ignore
    }
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    const images = this.data.messages
      .filter((m) => m.type === 'image' && m.url && !isCloudFileId(m.url))
      .map((m) => m.url);
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
