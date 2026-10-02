const store = require('../../utils/store');
const { pickMixedMedia, MEDIA_LIMIT_HINT, mediaSlots } = require('../../utils/media-upload');
const { getDefaultPet } = require('../../utils/catalog');
const { EMOJI_TABS, getEmojiList } = require('../../utils/pet-emoji');
const { HOT_TOPICS } = require('../../utils/circle-community');
const { POST_ZONES } = require('../../utils/community-zones');
const { blockSubPageWithoutProfile, syncPetProfileGate, requirePetProfile } = require('../../utils/pet-profile-guard');
const { parseContentParts } = require('../../utils/social-content-parts');
const cloudApi = require('../../utils/cloud-api');
const { saveSocialToCloud } = require('../../utils/social-cloud-sync');
const sensitiveWords = require('../../utils/sensitive-words');

Page({
  data: {
    zones: POST_ZONES,
    zone: 'dog',
    content: '',
    contentParts: [],
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
    petProfileBlocked: false,
  },

  onShow() {
    syncPetProfileGate(this);
  },

  onLoad(options) {
    blockSubPageWithoutProfile(this);
    const patch = {};
    if (options.topic) {
      patch.selectedTopic = decodeURIComponent(options.topic);
    }
    if (options.zone && POST_ZONES.some((z) => z.id === options.zone)) {
      patch.zone = options.zone;
    }
    if (Object.keys(patch).length) this.setData(patch);
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

  syncContentParts(content) {
    this.setData({
      content,
      contentParts: parseContentParts(content),
    });
  },

  onInput(e) {
    this.syncContentParts(e.detail.value);
  },

  onEmojiTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ emojiTab: tab, emojiList: getEmojiList(tab) });
  },

  onPickEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji || '';
    if (!emoji) return;
    this.syncContentParts(`${this.data.content || ''}${emoji}`);
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

  async onSubmit() {
    if (!requirePetProfile()) return;
    const { zone, content, mediaList, selectedTopic } = this.data;
    const text = (content || '').trim();
    if (!text && !mediaList.length) {
      wx.showToast({ title: '请填写内容或上传媒体', icon: 'none' });
      return;
    }
    if (sensitiveWords.textBlocked(text)) {
      wx.showToast({ title: '内容含违规词，请修改', icon: 'none' });
      return;
    }

    const imageUrls = mediaList.filter((m) => m.type === 'image').map((m) => m.url);
    const pet = getDefaultPet();
    const payload = {
      userName: '我',
      petName: pet.name,
      avatar: pet.avatar,
      zone,
      topic: selectedTopic,
      content: text,
      image: imageUrls[0] || '',
      images: imageUrls,
      mediaList,
    };

    try {
      if (cloudApi.cloudEnabled()) {
        await saveSocialToCloud(payload);
      } else {
        store.addSocialPost(payload);
      }
      wx.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 700);
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '发布失败', icon: 'none' });
    }
  },
});
