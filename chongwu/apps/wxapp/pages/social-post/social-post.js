const store = require('../../utils/store');
const { pickMixedMedia, MEDIA_LIMIT_HINT, mediaSlots } = require('../../utils/media-upload');
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
    mediaLimitHint: MEDIA_LIMIT_HINT,
    mediaCanAdd: true,
    mediaSummary: '0/6 图 · 0/3 视频',
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

  syncMediaUI(list) {
    const slots = mediaSlots(list);
    this.setData({
      mediaList: list,
      mediaCanAdd: slots.canAddAny,
      mediaSummary: slots.summary,
    });
  },

  onChooseMedia() {
    pickMixedMedia(this.data.mediaList)
      .then((list) => this.syncMediaUI(list))
      .catch(() => {});
  },

  onRemoveMedia(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    this.syncMediaUI(this.data.mediaList.filter((_, i) => i !== index));
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
