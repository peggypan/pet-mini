const { MOCK_CHATS, MOCK_BUDDY, MOCK_EVENTS } = require('../../utils/mock');
const { findEvent } = require('../../utils/catalog');
const store = require('../../utils/store');
const { fetchEventFromCloud } = require('../../utils/event-cloud-sync');
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
  loadLatestChatMessagesFromCloud,
  loadOlderChatMessagesFromCloud,
  mergeChatMessages,
  CHAT_PAGE_SIZE,
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
    scrollTop: 0,
    scrollWithAnimation: false,
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
    pendingEvent: null,
    chatHasMore: false,
    chatLoadingHistory: false,
    chatListReady: false,
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
        scrollTop: this._lastScrollTop != null ? this._lastScrollTop : this.data.scrollTop,
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
      attachEventId: options.attachEventId || '',
    };
    this.applyPeerPreviewFromOptions(this.peerOptions, this.peerOptions.peerId);
    this._allowHistoryLoad = false;
    this._initThreadPromise = this.initThread(this.peerOptions);
  },

  onReady() {
    this._scrollNodePromise = null;
    if (this.data.messages && this.data.messages.length) {
      wx.nextTick(() => this.scrollToLatest(false));
    }
  },

  messagesSetPatch(messages, animated) {
    return {
      messages,
      scrollWithAnimation: animated === true,
    };
  },

  getScrollNode(retry) {
    const n = typeof retry === 'number' ? retry : 0;
    if (n === 0 && this._scrollNodePromise) return this._scrollNodePromise;
    const attempt = () => new Promise((resolve) => {
      wx.createSelectorQuery()
        .in(this)
        .select('#msg-scroll')
        .node()
        .exec((res) => {
          const node = res && res[0] && res[0].node;
          if (node || n >= 12) {
            resolve(node || null);
            return;
          }
          setTimeout(() => {
            this.getScrollNode(n + 1).then(resolve);
          }, 40);
        });
    });
    if (n === 0) {
      this._scrollNodePromise = attempt();
      return this._scrollNodePromise;
    }
    return attempt();
  },

  scrollNodeTo(top, animated) {
    const finalTop = Math.max(0, top);
    return this.getScrollNode().then((node) => {
      if (node && typeof node.scrollTo === 'function') {
        node.scrollTo({ top: finalTop, animated: animated === true });
      }
    }).catch(() => {});
  },

  applyScrollTop(top, animated) {
    const useAnim = animated === true;
    this._scrollSeq = (this._scrollSeq || 0) + 1;
    const next = Math.max(0, Number(top) || 0) + (this._scrollSeq % 3) * 0.5;
    this._lastScrollTop = next;
    this.setData({
      scrollTop: next,
      scrollWithAnimation: useAnim,
    });
    this.scrollNodeTo(next, useAnim);
  },

  measureScrollMax() {
    return new Promise((resolve) => {
      const q = wx.createSelectorQuery().in(this);
      q.select('#msg-scroll').boundingClientRect();
      q.select('#chat-scroll-inner').boundingClientRect();
      q.select('#chat-scroll-bottom').boundingClientRect();
      q.exec((res) => {
        const viewport = res && res[0];
        const inner = res && res[1];
        const bottom = res && res[2];
        if (!viewport || !viewport.height) {
          resolve(0);
          return;
        }
        let max = 0;
        if (inner && inner.height) {
          max = Math.max(max, inner.height - viewport.height + 12);
        }
        if (bottom && bottom.bottom && viewport.top != null) {
          max = Math.max(max, bottom.bottom - viewport.top - viewport.height + 12);
        }
        resolve(Math.max(0, max));
      });
    });
  },

  finishInitialScrollPin(max) {
    if (max > 30 || (this.data.messages && this.data.messages.length <= 2)) {
      this._allowHistoryLoad = true;
      this._pinScrollBottomUntil = Date.now() + 2500;
    }
  },

  patchChatData(patch, options = {}) {
    const pinBottom = !!options.pinBottom;
    const next = { ...patch };
    if (!pinBottom && next.scrollTop === undefined) {
      next.scrollTop = this.data.scrollTop;
    }
    if (pinBottom && typeof this.setMessagesAndScroll === 'function' && next.messages) {
      this.setMessagesAndScroll(next.messages, false, {
        chatHasMore: next.chatHasMore,
        chatLoadingHistory: next.chatLoadingHistory,
      });
      return;
    }
    this.setData(next, () => {
      if (pinBottom && typeof this.scrollToLatest === 'function') {
        this.scrollToLatest(false);
      }
    });
  },

  setMessagesAndScroll(messages, animated, extraPatch) {
    this.setData({
      ...this.messagesSetPatch(messages, animated),
      ...(extraPatch || {}),
    }, () => {
      wx.nextTick(() => this.scrollToLatest(animated));
    });
  },

  async onShow() {
    syncPetProfileGate(this);
    if (this._initThreadPromise) {
      await this._initThreadPromise.catch(() => {});
    }
    if (this._skipOnShowRefresh) {
      this._skipOnShowRefresh = false;
      if (this.data.threadId) startChatRealtime(this, this.data.threadId);
      wx.nextTick(() => this.scrollToLatest(false));
      return;
    }
    if (!this.data.threadId) return;
    startChatRealtime(this, this.data.threadId);
    this.refreshChatAvatars().catch(() => {});
    if (this.data.peer) this.syncPeerActions(this.data.peer).catch(() => {});
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
    }, 960);
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

  findLocalThread(customPeer, peerId) {
    const threads = store.listChatThreads();
    if (customPeer.threadId) {
      const hit = threads.find((t) => String(t.id) === String(customPeer.threadId));
      if (hit) return hit;
    }
    if (peerId) {
      const hit = threads.find((t) => String(t.peerId) === String(peerId));
      if (hit) return hit;
    }
    return null;
  },

  buildShellThread(customPeer, peerId) {
    const local = this.findLocalThread(customPeer, peerId);
    if (local && local.id) return local;
    const routeThreadId = customPeer.threadId || '';
    const effectivePeerId = peerId
      || customPeer.peerId
      || customPeer.peerOpenid
      || (routeThreadId && String(routeThreadId).replace(/^c_/, ''))
      || '';
    if (routeThreadId || effectivePeerId || customPeer.peerName || customPeer.peerOpenid) {
      return store.ensureChatThread({
        id: routeThreadId || `c_${effectivePeerId || 'peer'}`,
        peerId: effectivePeerId || routeThreadId,
        peerOpenid: customPeer.peerOpenid || '',
        peerName: customPeer.peerName || '宠友',
        petName: customPeer.petName || '宠物',
        avatar: customPeer.avatar || DEFAULT_PEER_AVATAR,
      });
    }
    return local;
  },

  applyPeerPreviewFromOptions(customPeer, peerId) {
    if (this.data.peer && this.data.threadId) return;
    const name = (customPeer && customPeer.peerName) || '宠友';
    const pet = (customPeer && customPeer.petName) || '宠物';
    const peerDisplayTitle = formatChatThreadTitle(name, pet);
    const avatar = (customPeer && customPeer.avatar) || DEFAULT_PEER_AVATAR;
    const id = peerId
      || (customPeer && customPeer.peerId)
      || (customPeer && customPeer.peerOpenid)
      || '';
    const peer = {
      id,
      peerOpenid: (customPeer && customPeer.peerOpenid) || '',
      userName: name,
      petName: pet,
      avatar,
      displayTitle: peerDisplayTitle,
    };
    const patch = { peer, peerDisplayTitle, peerAvatar: avatar };
    if (customPeer && customPeer.threadId && !this.data.threadId) {
      patch.threadId = customPeer.threadId;
    }
    this.setData(patch);
    if (peerDisplayTitle) {
      wx.setNavigationBarTitle({ title: peerDisplayTitle });
    }
  },

  applyThreadShell(thread, customPeer) {
    if (!thread || !thread.id) return null;
    const peerDisplayTitle = formatChatThreadTitle(thread.peerName, thread.petName);
    this._threadMeta = {
      peerOpenid: thread.peerOpenid || (customPeer && customPeer.peerOpenid) || '',
    };
    const avatar = (customPeer && customPeer.avatar) || thread.avatar || DEFAULT_PEER_AVATAR;
    const peer = {
      id: thread.peerId,
      peerOpenid: this._threadMeta.peerOpenid,
      userName: thread.peerName || '宠友',
      petName: thread.petName || '宠物',
      avatar,
      displayTitle: peerDisplayTitle,
    };
    this.setData({
      threadId: thread.id,
      peer,
      peerDisplayTitle,
      peerAvatar: avatar,
      messages: [],
      chatHasMore: true,
    });
    wx.setNavigationBarTitle({ title: peerDisplayTitle || '私信' });
    return peer;
  },

  async resolveThreadRecord(customPeer, peerId) {
    let thread = this.findLocalThread(customPeer, peerId);
    if (thread && thread.id) return thread;
    if (cloudApi.cloudEnabled() && (peerId || customPeer.peerOpenid || customPeer.peerName)) {
      const ensured = await this.ensureThreadFromRoutePeer(customPeer, peerId);
      if (ensured && ensured.id) return ensured;
    }
    if (cloudApi.cloudEnabled()) {
      try {
        await refreshChatThreadsFromCloud();
      } catch (e) {
        /* keep cache */
      }
      thread = this.findLocalThread(customPeer, peerId);
      if (thread && thread.id) return thread;
    }
    if (peerId) {
      const friend = MOCK_BUDDY.find((f) => String(f.id) === String(peerId));
      if (friend) {
        return ensureChatThreadOnCloud({
          id: `c_${peerId}`,
          peerId: friend.id,
          peerOpenid: friend.openid || '',
          peerName: friend.userName,
          petName: friend.petName,
          avatar: friend.avatar,
        });
      }
      if (customPeer.peerName || customPeer.peerOpenid || peerId) {
        const peerOpenid = customPeer.peerOpenid
          || (String(peerId).startsWith('oid:') ? String(peerId).slice(4) : '')
          || (String(peerId).length > 24 ? String(peerId) : '');
        return ensureChatThreadOnCloud({
          id: `c_${peerOpenid || peerId}`,
          peerId: peerOpenid || peerId,
          peerOpenid,
          peerName: customPeer.peerName || '宠友',
          petName: customPeer.petName || '宠物',
          avatar: customPeer.avatar || DEFAULT_PEER_AVATAR,
        });
      }
    }
    if (customPeer.threadId) {
      return {
        id: customPeer.threadId,
        peerId: peerId || customPeer.peerId || customPeer.threadId,
        peerName: customPeer.peerName || '宠友',
        petName: customPeer.petName || '宠物',
        avatar: customPeer.avatar || DEFAULT_PEER_AVATAR,
        peerOpenid: customPeer.peerOpenid || '',
      };
    }
    if (!cloudApi.cloudEnabled()) {
      const threads = store.listChatThreads();
      return threads[0] || MOCK_CHATS[0];
    }
    return null;
  },

  async ensureThreadFromRoutePeer(customPeer, peerId) {
    const friend = peerId ? MOCK_BUDDY.find((f) => String(f.id) === String(peerId)) : null;
    if (friend) {
      return ensureChatThreadOnCloud({
        id: `c_${peerId}`,
        peerId: friend.id,
        peerOpenid: friend.openid || '',
        peerName: friend.userName,
        petName: friend.petName,
        avatar: friend.avatar,
      });
    }
    const peerOpenid = customPeer.peerOpenid
      || (peerId && String(peerId).startsWith('oid:') ? String(peerId).slice(4) : '')
      || (peerId && String(peerId).length > 24 ? String(peerId) : '');
    const effectivePeerId = peerOpenid || peerId || customPeer.threadId;
    if (!effectivePeerId && !customPeer.peerName) return null;
    return ensureChatThreadOnCloud({
      id: customPeer.threadId || `c_${effectivePeerId}`,
      peerId: effectivePeerId,
      peerOpenid,
      peerName: customPeer.peerName || '宠友',
      petName: customPeer.petName || '宠物',
      avatar: customPeer.avatar || DEFAULT_PEER_AVATAR,
    });
  },

  measureChatScroll() {
    return new Promise((resolve) => {
      const q = wx.createSelectorQuery().in(this);
      q.select('#msg-scroll').scrollOffset();
      q.select('#chat-scroll-inner').boundingClientRect();
      q.exec((res) => {
        resolve({
          scrollTop: (res && res[0] && res[0].scrollTop) || 0,
          innerHeight: (res && res[1] && res[1].height) || 0,
        });
      });
    });
  },

  pinToBottomThenShow(retryLeft) {
    const left = typeof retryLeft === 'number' ? retryLeft : 12;
    this.measureScrollMax().then((max) => {
      this.applyScrollTop(max, false);
      if (left <= 0) this.finishInitialScrollPin(max);
    });
    if (left <= 0) return;
    setTimeout(() => this.pinToBottomThenShow(left - 1), left > 6 ? 50 : 120);
  },

  async loadInitialChatPage(threadId) {
    const page = await loadLatestChatMessagesFromCloud(threadId, CHAT_PAGE_SIZE);
    let messages = this.decorateChatUiMessages(page.list || []);
    messages = await this.maybeApplyEntryShareComment(messages);
    messages = this.decorateChatUiMessages(messages);
    this._chatInitialLoaded = true;
    console.warn('[chat] initial render', messages.length, 'hasMore', !!page.hasMore);
    this._allowHistoryLoad = false;
    this.setData({
      messages,
      chatHasMore: !!page.hasMore,
      chatLoadingHistory: false,
      scrollTop: 0,
      scrollWithAnimation: false,
    }, () => {
      wx.nextTick(() => {
        this.pinToBottomThenShow();
      });
    });
    this.syncLimitState(messages);
    return messages;
  },

  onTapLoadOlderHistory() {
    if (this._allowHistoryLoad) this.loadOlderChatHistory();
  },

  onChatScroll(e) {
    if (!this._allowHistoryLoad || !this.data.chatHasMore || this.data.chatLoadingHistory) return;
    const top = (e && e.detail && e.detail.scrollTop) || 0;
    if (top > 90) return;
    this.tryLoadOlderHistory();
  },

  async onChatScrollToUpper() {
    this.tryLoadOlderHistory();
  },

  tryLoadOlderHistory() {
    if (!this._allowHistoryLoad || !this.data.chatHasMore || this.data.chatLoadingHistory) return;
    if (this._loadOlderLock) return;
    this._loadOlderLock = true;
    this.loadOlderChatHistory().finally(() => {
      setTimeout(() => {
        this._loadOlderLock = false;
      }, 800);
    });
  },

  async loadOlderChatHistory() {
    const { threadId, messages, chatHasMore, chatLoadingHistory } = this.data;
    if (!threadId || !chatHasMore || chatLoadingHistory) return;
    const oldest = messages[0];
    if (!oldest || !oldest.createdAt) return;
    const metricsBefore = await this.measureChatScroll();
    this.setData({ chatLoadingHistory: true });
    try {
      const page = await loadOlderChatMessagesFromCloud(
        threadId,
        oldest.createdAt,
        CHAT_PAGE_SIZE,
      );
      const older = page.list || [];
      console.warn('[chat] loadOlder', older.length, 'hasMore', !!page.hasMore);
      if (!older.length) {
        this.setData({
          chatHasMore: !!page.hasMore,
          chatLoadingHistory: false,
        });
        return;
      }
      const merged = mergeChatMessages(older, messages);
      const targetTop = metricsBefore.scrollTop;
      const innerBefore = metricsBefore.innerHeight;
      this.setData({
        messages: this.decorateChatUiMessages(merged),
        chatHasMore: !!page.hasMore,
        chatLoadingHistory: false,
        scrollWithAnimation: false,
        scrollTop: this._lastScrollTop != null ? this._lastScrollTop : this.data.scrollTop,
      }, () => {
        const fixScroll = () => {
          this.measureChatScroll().then((metricsAfter) => {
            const delta = metricsAfter.innerHeight - innerBefore;
            this.applyScrollTop(targetTop + delta, false);
          });
        };
        wx.nextTick(() => {
          wx.nextTick(fixScroll);
          setTimeout(fixScroll, 120);
          setTimeout(fixScroll, 320);
        });
      });
      this.syncLimitState(merged);
    } catch (e) {
      this.setData({ chatLoadingHistory: false });
    }
  },

  async hydrateThread(thread, customPeer) {
    markChatThreadReadOnCloud(thread.id).catch(() => {});
    const peerRaw = await lookupPeerAvatarRaw(thread.peerId, [
      customPeer.avatar,
      thread.avatar,
    ]);
    const [myAvatar, peerAvatar] = await Promise.all([
      resolveMyAvatarUrl(),
      resolvePeerAvatarUrl(peerRaw),
    ]);
    const peerDisplayTitle = formatChatThreadTitle(thread.peerName, thread.petName);
    const peer = {
      id: thread.peerId,
      peerOpenid: thread.peerOpenid || customPeer.peerOpenid || '',
      userName: thread.peerName,
      petName: thread.petName,
      avatar: peerAvatar,
      displayTitle: peerDisplayTitle,
    };
    this._threadMeta = { peerOpenid: peer.peerOpenid };
    this.setData({
      threadId: thread.id,
      peer,
      peerDisplayTitle,
      myAvatar,
      peerAvatar,
    });
    await this.loadInitialChatPage(thread.id);
    startChatRealtime(this, thread.id);
    this.syncPeerActions(peer).catch(() => {});
    this.setupAttachEvent(
      customPeer.attachEventId || (this.entryOptions && this.entryOptions.attachEventId),
    ).catch(() => {});
  },

  async initThread(options) {
    const peerId = typeof options === 'object' ? options.peerId : options;
    const customPeer = typeof options === 'object' ? options : {};
    const attachEventId = customPeer.attachEventId
      || (this.entryOptions && this.entryOptions.attachEventId);
    const shell = this.buildShellThread(customPeer, peerId);
    if (shell && shell.id) {
      this.applyThreadShell(shell, customPeer);
      this.applyPendingEventFromCache(attachEventId);
    }
    const thread = await this.resolveThreadRecord(customPeer, peerId);
    if (!thread || !thread.id) {
      if (!this.data.threadId) {
        wx.showToast({ title: '无法打开会话，请从消息列表进入', icon: 'none' });
      }
      return;
    }
    if (!this.data.threadId) {
      this.applyThreadShell(thread, customPeer);
    }
    await this.hydrateThread(thread, customPeer);
    this._skipOnShowRefresh = true;
  },

  applyPendingEventFromCache(eventId) {
    const id = eventId ? String(eventId) : '';
    if (!id) return;
    const event = findEvent(id);
    if (!event) return;
    const cover = event.cover
      || (event.images && event.images[0])
      || (event.mediaList && event.mediaList[0] && event.mediaList[0].url)
      || '';
    this.setData({
      pendingEvent: {
        id: event.id,
        title: event.title || '同城活动',
        cover,
        time: event.time || '',
        place: event.place || event.placeAddress || '',
      },
    });
  },

  async setupAttachEvent(eventId) {
    const id = eventId ? String(eventId) : '';
    if (!id) return;
    this.applyPendingEventFromCache(id);
    if (cloudApi.cloudEnabled()) {
      try {
        await fetchEventFromCloud(id);
      } catch (e) {
        /* keep cache */
      }
    }
    this.applyPendingEventFromCache(id);
  },

  onPreviewAttachEvent() {
    const ev = this.data.pendingEvent;
    if (!ev || !ev.id) return;
    wx.navigateTo({ url: `/pages/event-detail/event-detail?id=${ev.id}` });
  },

  onDismissAttachEvent() {
    this.setData({ pendingEvent: null });
  },

  async onSendAttachEvent() {
    const ev = this.data.pendingEvent;
    if (!ev || !ev.id) return;
    if (!this.guardOutgoing('event')) return;
    const row = await this.sendMessage({
      from: 'me',
      type: 'event',
      eventId: ev.id,
      eventTitle: ev.title,
      content: ev.title,
    });
    if (row) {
      this.setData({ pendingEvent: null });
      wx.showToast({ title: '活动已发送', icon: 'success' });
    }
  },

  onOpenEventMessage(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/event-detail/event-detail?id=${id}` });
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
    this.setMessagesAndScroll(next, false);
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
          this.setData({
            messages: this.decorateChatUiMessages(messages),
            scrollTop: this._lastScrollTop != null ? this._lastScrollTop : this.data.scrollTop,
          });
        })
        .catch(() => {});
    }
    return row;
  },

  scrollToLatest(animated) {
    const useAnim = animated === true;
    const pin = () => {
      this.measureScrollMax().then((max) => {
        this.applyScrollTop(max, useAnim);
      });
    };
    pin();
    clearTimeout(this._scrollLatestTimer);
    clearTimeout(this._scrollLatestTimer2);
    clearTimeout(this._scrollLatestTimer3);
    clearTimeout(this._scrollLatestTimer4);
    clearTimeout(this._scrollLatestTimer5);
    clearTimeout(this._scrollLatestTimer6);
    this._scrollLatestTimer = setTimeout(pin, 50);
    this._scrollLatestTimer2 = setTimeout(pin, 150);
    this._scrollLatestTimer3 = setTimeout(pin, 350);
    this._scrollLatestTimer4 = setTimeout(pin, 700);
    this._scrollLatestTimer5 = setTimeout(pin, 1200);
    this._scrollLatestTimer6 = setTimeout(pin, 2000);
  },

  onChatImageLayout() {
    if (Date.now() < (this._pinScrollBottomUntil || 0)) {
      this.scrollToLatest(false);
    }
  },

  appendMessage(row) {
    const nextRow = row && row.type === 'voice'
      ? { ...row, playUrl: row.playUrl || row.url }
      : row;
    const messages = this.decorateChatUiMessages([...this.data.messages, nextRow]);
    this.setMessagesAndScroll(messages, true);
    this.syncLimitState(messages);
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
    this._chatInitialLoaded = false;
    this._allowHistoryLoad = false;
    this._scrollNodePromise = null;
    clearTimeout(this._scrollLatestTimer);
    clearTimeout(this._scrollLatestTimer2);
    clearTimeout(this._scrollLatestTimer3);
    clearTimeout(this._scrollLatestTimer4);
    clearTimeout(this._scrollLatestTimer5);
    clearTimeout(this._scrollLatestTimer6);
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
