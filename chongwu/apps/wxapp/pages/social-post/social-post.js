const store = require('../../utils/store');
const { chooseMedia } = require('../../utils/choose-media');
const { getDefaultPet } = require('../../utils/catalog');
const { EMOJI_TABS, getEmojiList } = require('../../utils/pet-emoji');
const { HOT_TOPICS } = require('../../utils/circle-community');

Page({
  data: {
    zones: [
      { id: 'cat', name: '猫咪' },
      { id: 'dog', name: '狗狗' },
      { id: 'other', name: '异宠' },
    ],
    zone: 'dog',
    content: '',
    mediaList: [],
    maxMediaCount: 9,
    emojiTabs: EMOJI_TABS,
    emojiTab: 'cat',
    emojiList: getEmojiList('cat'),
    showEmoji: true,
    hotTopics: HOT_TOPICS,
    selectedTopic: '',
  },

  onLoad(options) {
    if (options.topic) {
      const topic = decodeURIComponent(options.topic);
      this.setData({ selectedTopic: topic });
    }
  },

  onPickTopic(e) {
    const topic = e.currentTarget.dataset.topic || '';
    this.setData({ selectedTopic: topic });
  },

  onClearTopic() {
    this.setData({ selectedTopic: '' });
  },

  onZone(e) {
    this.setData({ zone: e.currentTarget.dataset.id });
  },

  onInput(e) {
    this.setData({ content: e.detail.value });
  },

  onEmojiTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ emojiTab: tab, emojiList: getEmojiList(tab) });
  },

  onPickEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji || '';
    if (!emoji) return;
    this.setData({ content: `${this.data.content || ''}${emoji}` });
  },

  onChooseImage() {
    const remain = this.data.maxMediaCount - this.data.mediaList.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 9 个媒体', icon: 'none' });
      return;
    }
    chooseMedia({
      count: Math.min(remain, 9),
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const append = (res.tempFiles || []).map((f) => ({
          type: 'image',
          url: f.tempFilePath,
        }));
        if (!append.length) return;
        this.setData({
          mediaList: [...this.data.mediaList, ...append].slice(0, this.data.maxMediaCount),
        });
      },
    });
  },

  onChooseVideo() {
    const remain = this.data.maxMediaCount - this.data.mediaList.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 9 个媒体', icon: 'none' });
      return;
    }
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
        this.setData({
          mediaList: [...this.data.mediaList, {
            type: 'video',
            url: file.tempFilePath,
            poster: file.thumbTempFilePath || '',
          }].slice(0, this.data.maxMediaCount),
        });
      },
    });
  },

  onRemoveMedia(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    this.setData({ mediaList: this.data.mediaList.filter((_, i) => i !== index) });
  },

  onPreviewMedia(e) {
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.mediaList[index];
    if (!item) return;
    if (item.type === 'video') {
      wx.previewMedia({ sources: [{ url: item.url, type: 'video', poster: item.poster }] });
      return;
    }
    const images = this.data.mediaList.filter((m) => m.type === 'image').map((m) => m.url);
    wx.previewImage({ urls: images, current: item.url });
  },

  onSubmit() {
    const { zone, content, mediaList, selectedTopic } = this.data;
    const text = (content || '').trim();
    if (!text && !mediaList.length) {
      wx.showToast({ title: '请填写内容或上传媒体', icon: 'none' });
      return;
    }
    const banned = /活体|出售猫|出售狗|卖猫|卖狗|开药|诊疗/;
    if (banned.test(text)) {
      wx.showToast({ title: '内容含违规词，请修改', icon: 'none' });
      return;
    }

    const imageUrls = mediaList.filter((m) => m.type === 'image').map((m) => m.url);
    const pet = getDefaultPet();
    store.addSocialPost({
      userName: '我',
      petName: pet.name,
      avatar: pet.avatar,
      zone,
      topic: selectedTopic,
      content: text,
      image: imageUrls[0] || '',
      images: imageUrls,
      mediaList,
    });

    wx.showToast({ title: '发布成功', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 700);
  },
});
