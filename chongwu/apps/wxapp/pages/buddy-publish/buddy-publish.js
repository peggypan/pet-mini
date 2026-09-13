const { BUDDY_TYPES } = require('../../utils/mock');
const { getDefaultPet } = require('../../utils/catalog');
const store = require('../../utils/store');
const { chooseMedia } = require('../../utils/choose-media');

Page({
  data: {
    zone: 'normal',
    buddyTypes: BUDDY_TYPES.filter((t) => t !== '宠物相亲&借配'),
    buddyType: '遛狗搭子',
    expectDate: '',
    expectDateLabel: '',
    expectTimeValue: '',
    expectTime: '',
    minDate: '',
    expectPlace: '',
    desc: '',
    openSignup: true,
    mediaList: [],
    maxMediaCount: 9,
  },

  onLoad(options) {
    const zone = options.zone || 'normal';
    const buddyTypes = zone === 'match' ? ['宠物相亲&借配'] : BUDDY_TYPES.filter((t) => t !== '宠物相亲&借配');
    const now = new Date();
    const minDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.setData({ zone, buddyTypes, buddyType: buddyTypes[0], minDate });
  },

  formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    return `${Number(parts[1])}月${Number(parts[2])}日`;
  },

  syncExpectTime() {
    const { expectDate, expectTimeValue } = this.data;
    const expectDateLabel = this.formatDateLabel(expectDate);
    let expectTime = '';
    if (expectDate && expectTimeValue) {
      expectTime = `${expectDateLabel} ${expectTimeValue}`;
    } else if (expectDate) {
      expectTime = expectDateLabel;
    } else if (expectTimeValue) {
      expectTime = expectTimeValue;
    }
    this.setData({ expectDateLabel, expectTime });
  },

  onExpectDateChange(e) {
    this.setData({ expectDate: e.detail.value }, () => this.syncExpectTime());
  },

  onExpectTimeChange(e) {
    this.setData({ expectTimeValue: e.detail.value }, () => this.syncExpectTime());
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onTypeChange(e) {
    this.setData({ buddyType: this.data.buddyTypes[e.detail.value] });
  },

  onSwitch(e) {
    this.setData({ openSignup: e.detail.value });
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
            duration: file.duration || 0,
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
      wx.previewMedia({
        sources: [{ url: item.url, type: 'video', poster: item.poster }],
      });
      return;
    }
    const images = this.data.mediaList.filter((m) => m.type === 'image').map((m) => m.url);
    wx.previewImage({ urls: images, current: item.url });
  },

  onSubmit() {
    const { buddyType, expectTime, expectPlace, desc, zone, openSignup, mediaList } = this.data;
    const text = (desc || '').trim();
    if (!text && !mediaList.length) {
      wx.showToast({ title: '请填写描述或上传媒体', icon: 'none' });
      return;
    }
    const pet = getDefaultPet();
    const firstImage = mediaList.find((m) => m.type === 'image');
    const firstVideo = mediaList.find((m) => m.type === 'video');
    store.addBuddyPost({
      userName: '我',
      avatar: pet.avatar,
      petName: pet.name,
      breed: pet.breed,
      age: pet.age,
      personality: pet.personality,
      verified: !!pet.verified,
      buddyType,
      expectTime: expectTime || '可协商',
      expectPlace: expectPlace || '同城',
      desc: text,
      distance: '0km',
      tags: pet.socialTags || [],
      zone,
      openSignup,
      mediaList,
      images: mediaList.filter((m) => m.type === 'image').map((m) => m.url),
      cover: firstImage?.url || firstVideo?.poster || '',
    });
    wx.showToast({ title: '发布成功', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 700);
  },
});
