const { BUDDY_TYPES } = require('../../utils/mock');
const { getDefaultPet } = require('../../utils/catalog');
const store = require('../../utils/store');
const { pickMixedMedia, MEDIA_LIMIT_HINT, mediaSlots } = require('../../utils/media-upload');
const amap = require('../../utils/amap');

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
    expectPlaceAddress: '',
    location: null,
    desc: '',
    openSignup: true,
    mediaList: [],
    mediaLimitHint: MEDIA_LIMIT_HINT,
    mediaCanAdd: true,
    mediaSummary: '0/6 图 · 0/3 视频',
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

  // 期望地点：点击直接跳转系统地图选点
  onChoosePlace() {
    amap.choosePoint()
      .then((loc) => {
        this.setData({
          expectPlace: loc.name || loc.address || '已选地点',
          expectPlaceAddress: loc.address || '',
          location: {
            name: loc.name,
            address: loc.address,
            latitude: loc.latitude,
            longitude: loc.longitude,
          },
        });
      })
      .catch((err) => {
        const msg = (err && err.errMsg) || '';
        if (msg.includes('cancel')) return;
        if (msg.includes('auth deny') || msg.includes('authorize')) {
          wx.showModal({
            title: '需要位置权限',
            content: '地图选点需要授权位置信息，请在设置中开启',
            confirmText: '去设置',
            success: (r) => { if (r.confirm) wx.openSetting(); },
          });
          return;
        }
        wx.showToast({ title: '选点失败，请重试', icon: 'none' });
      });
  },

  onTypeChange(e) {
    this.setData({ buddyType: this.data.buddyTypes[e.detail.value] });
  },

  onSwitch(e) {
    this.setData({ openSignup: e.detail.value });
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
      wx.previewMedia({
        sources: [{ url: item.url, type: 'video', poster: item.poster }],
      });
      return;
    }
    const images = this.data.mediaList.filter((m) => m.type === 'image').map((m) => m.url);
    wx.previewImage({ urls: images, current: item.url });
  },

  onSubmit() {
    const { buddyType, expectTime, expectPlace, expectPlaceAddress, location, desc, zone, openSignup, mediaList } = this.data;
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
      expectPlaceAddress,
      location,
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
