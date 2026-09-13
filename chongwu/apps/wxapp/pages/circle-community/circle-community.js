const store = require('../../utils/store');
const { getDefaultPet } = require('../../utils/catalog');
const { findCircle, HOT_TOPICS } = require('../../utils/circle-community');
const { openEventPublishEntry } = require('../../utils/event-publish-nav');
const { chooseMedia } = require('../../utils/choose-media');

Page({
  data: {
    circleId: '',
    circle: null,
    messages: [],
    hotTopics: HOT_TOPICS,
    selectedTopic: '',
    inputText: '',
    pendingImages: [],
    panelTools: false,
    panelEmoji: false,
    showTopicPicker: false,
    scrollInto: '',
    shareMsg: null,
  },

  onLoad(options) {
    const circleId = options.id || 'c1';
    this.setData({ circleId });
    this.loadCircle(circleId);
  },

  onShow() {
    if (this.data.circleId) this.loadMessages(this.data.circleId);
  },

  loadCircle(circleId) {
    const circle = findCircle(circleId);
    if (!circle) {
      wx.showToast({ title: '社区不存在', icon: 'none' });
      return;
    }
    wx.setNavigationBarTitle({ title: `${circle.name}` });
    this.setData({ circle });
    this.loadMessages(circleId);
  },

  loadMessages(circleId) {
    const messages = store.listCircleMessages(circleId);
    this.setData({ messages });
    if (messages.length) {
      this.setData({ scrollInto: `msg-${messages.length - 1}` });
    }
  },

  onPickTopic(e) {
    const topic = e.currentTarget.dataset.topic || '';
    this.setData({ selectedTopic: topic, showTopicPicker: false });
  },

  onClearTopic() {
    this.setData({ selectedTopic: '' });
  },

  onToggleTopicPicker() {
    this.setData({ showTopicPicker: !this.data.showTopicPicker });
  },

  onComposerInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  onPanelChange(e) {
    const { showTools, showEmoji } = e.detail;
    this.setData({ panelTools: showTools, panelEmoji: showEmoji, showTopicPicker: false });
  },

  onComposerTool(e) {
    const { action } = e.detail;
    if (action === 'photo') {
      this.pickImages(['album']);
      return;
    }
    if (action === 'camera') {
      this.pickImages(['camera']);
      return;
    }
    if (action === 'video') {
      this.pickVideo();
      return;
    }
    if (action === 'activity') {
      openEventPublishEntry();
    }
  },

  pickImages(sourceType) {
    const remain = 3 - this.data.pendingImages.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多 3 张图片', icon: 'none' });
      return;
    }
    chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType,
      success: (res) => {
        const paths = (res.tempFiles || []).map((f) => f.tempFilePath);
        this.setData({ pendingImages: [...this.data.pendingImages, ...paths].slice(0, 3) });
      },
    });
  },

  pickVideo() {
    chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (!file) return;
        wx.showToast({ title: '视频请通过发动态分享', icon: 'none' });
      },
    });
  },

  onComposerVoice(e) {
    const { duration } = e.detail;
    this.setData({ inputText: `${this.data.inputText || ''}[语音 ${duration}"]` });
  },

  onRemovePending(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ pendingImages: this.data.pendingImages.filter((_, i) => i !== index) });
  },

  onPreviewMsgImage(e) {
    const msgIndex = Number(e.currentTarget.dataset.msgIndex);
    const url = e.currentTarget.dataset.url;
    const msg = this.data.messages[msgIndex];
    const urls = (msg?.mediaList || []).filter((m) => m.type === 'image').map((m) => m.url);
    wx.previewImage({ urls: urls.length ? urls : [url], current: url });
  },

  onComposerSend(e) {
    const text = (e.detail.value || this.data.inputText || '').trim();
    const { pendingImages, selectedTopic, circleId } = this.data;
    if (!text && !pendingImages.length) {
      wx.showToast({ title: '请输入内容或添加图片', icon: 'none' });
      return;
    }
    const pet = getDefaultPet();
    const mediaList = pendingImages.map((url) => ({ type: 'image', url }));
    store.addCircleMessage(circleId, {
      userName: '我',
      petName: pet.name,
      avatar: pet.avatarUrl || pet.avatar,
      topic: selectedTopic,
      content: text,
      mediaList,
    });
    this.setData({
      inputText: '',
      pendingImages: [],
      showTopicPicker: false,
    });
    this.loadMessages(circleId);
    wx.showToast({ title: '已发送', icon: 'success' });
  },

  onPrivateChat(e) {
    const { peerId, userName, petName, avatar } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/chat/chat?peerId=${peerId || 'community'}&peerName=${encodeURIComponent(userName || '宠友')}&petName=${encodeURIComponent(petName || '')}&avatar=${encodeURIComponent(avatar || '')}`,
    });
  },

  onShareMsg(e) {
    const index = Number(e.currentTarget.dataset.index);
    const msg = this.data.messages[index];
    if (msg) this.setData({ shareMsg: msg });
  },

  onShareAppMessage() {
    const { shareMsg, circle, circleId } = this.data;
    if (shareMsg) {
      const topic = shareMsg.topic ? `${shareMsg.topic} ` : '';
      return {
        title: `${topic}${shareMsg.userName}：${(shareMsg.content || '').slice(0, 28)}`,
        path: `/pages/circle-community/circle-community?id=${circleId}`,
      };
    }
    return {
      title: `${circle?.name || '宠友'}社区 · 一起来聊天`,
      path: `/pages/circle-community/circle-community?id=${circleId}`,
    };
  },
});
