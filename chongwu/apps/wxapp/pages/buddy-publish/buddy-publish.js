const { buddyTypesForZone } = require('../../utils/mock');
const { getDefaultPet } = require('../../utils/catalog');
const { speciesLabel } = require('../../utils/pet-species');
const store = require('../../utils/store');
const cloudApi = require('../../utils/cloud-api');
const { saveBuddyToCloud } = require('../../utils/buddy-cloud-sync');
const { pickMixedMedia, MEDIA_LIMIT_HINT, mediaSlots } = require('../../utils/media-upload');
const amap = require('../../utils/amap');
const {
  blockSubPageWithoutLogin,
  blockSubPageWithoutProfile,
  syncPetProfileGate,
  requireInteract,
} = require('../../utils/pet-profile-guard');
const { loadBuddyDetail } = require('../../utils/buddy-cloud-sync');
const {
  parseExpectTimeToForm,
  isExpectTimeInFuture,
  isVagueExpectTime,
} = require('../../utils/buddy-expect-expiry');

Page({
  data: {
    zone: 'normal',
    buddyTypes: buddyTypesForZone('normal'),
    buddyType: '遛狗搭子',
    expectDate: '',
    expectDateLabel: '',
    expectTimeValue: '',
    expectTime: '',
    minDate: '',
    expectPlace: '',
    expectPlaceAddress: '',
    location: null,
    title: '',
    desc: '',
    openSignup: true,
    mediaList: [],
    mediaLimitHint: MEDIA_LIMIT_HINT,
    mediaCanAdd: true,
    mediaSummary: '0/6 图 · 0/3 视频',
    petProfileBlocked: false,
    petHealingEnabled: false,
    editId: '',
    renewMode: false,
  },

  onLoad(options) {
    if (!blockSubPageWithoutLogin(this)) return;
    blockSubPageWithoutProfile(this);
    const zone = options.zone || 'normal';
    const renew = options.renew === '1' && options.id;
    const buddyTypes = buddyTypesForZone(zone);
    const pet = getDefaultPet();
    let buddyType = buddyTypes[0];
    let petHealingEnabled = !!pet.healingPet;
    if (zone === 'healing' && pet.healingPet && pet.healingBuddyType) {
      buddyType = pet.healingBuddyType;
    }
    const now = new Date();
    const minDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.setData({
      zone,
      buddyTypes,
      buddyType,
      petHealingEnabled,
      desc: zone === 'healing' && pet.healingIntro ? pet.healingIntro : this.data.desc,
      minDate,
    });
    if (renew) {
      wx.setNavigationBarTitle({ title: '更新期望时间地点' });
      this.loadRenewForm(options.id, zone);
    }
  },

  async loadRenewForm(id, zone) {
    wx.showLoading({ title: '加载中', mask: true });
    let raw = null;
    try {
      raw = await loadBuddyDetail(id);
    } finally {
      wx.hideLoading();
    }
    if (!raw || !store.isMyUserContent(raw)) {
      wx.showToast({ title: '无法编辑该搭子', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 700);
      return;
    }
    const timeForm = parseExpectTimeToForm(raw.expectTime);
    this.setData({
      editId: raw.id,
      renewMode: true,
      zone: raw.zone || zone,
      buddyTypes: buddyTypesForZone(raw.zone || zone),
      buddyType: raw.buddyType || this.data.buddyType,
      title: raw.title || '',
      desc: raw.desc || '',
      expectPlace: raw.expectPlace || '',
      expectPlaceAddress: raw.expectPlaceAddress || '',
      location: raw.location || null,
      openSignup: raw.openSignup !== false,
      mediaList: raw.mediaList || [],
      ...timeForm,
    }, () => {
      this.syncExpectTime();
      this.syncMediaUI(this.data.mediaList);
    });
  },

  onShow() {
    syncPetProfileGate(this);
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

  async onSubmit() {
    if (!requireInteract()) return;
    const {
      title, buddyType, expectTime, expectPlace, expectPlaceAddress, location,
      desc, zone, openSignup, mediaList,
    } = this.data;
    const headline = (title || '').trim();
    const text = (desc || '').trim();
    if (!headline) {
      wx.showToast({ title: '请填写标题', icon: 'none' });
      return;
    }
    if (!text && !mediaList.length) {
      wx.showToast({ title: '请填写描述或上传媒体', icon: 'none' });
      return;
    }
    const { editId, renewMode, expectDate, expectTimeValue } = this.data;
    if (renewMode) {
      if (!expectDate || !expectTimeValue) {
        wx.showToast({ title: '请选择未来的日期与时间', icon: 'none' });
        return;
      }
      const expectTimeCheck = this.data.expectTime;
      if (isVagueExpectTime(expectTimeCheck) || !isExpectTimeInFuture(expectTimeCheck)) {
        wx.showToast({ title: '期望时间须晚于当前时间', icon: 'none' });
        return;
      }
      if (!(expectPlace || '').trim() || expectPlace === '同城') {
        wx.showToast({ title: '请重新选择期望地点', icon: 'none' });
        return;
      }
    }
    const pet = getDefaultPet();
    const firstImage = mediaList.find((m) => m.type === 'image');
    const firstVideo = mediaList.find((m) => m.type === 'video');
    const nick = (store.getUserProfile().nickname || '').trim();
    const payload = {
      userName: nick || '宠友',
      avatar: pet.avatarUrl || pet.avatar,
      petName: pet.name,
      petSpecies: speciesLabel(pet.species) || '',
      breed: (pet.breedName || pet.breed || '').trim(),
      age: pet.age,
      personality: pet.personality,
      verified: !!pet.verified,
      buddyType,
      expectTime: expectTime || '可协商',
      expectPlace: expectPlace || '同城',
      expectPlaceAddress,
      location,
      title: headline,
      desc: text,
      tags: pet.socialTags || [],
      zone,
      openSignup,
      mediaList,
      images: mediaList.filter((m) => m.type === 'image').map((m) => m.url),
      cover: firstImage?.url || firstVideo?.poster || '',
      city: store.getCity(),
    };

    try {
      if (cloudApi.cloudEnabled()) {
        await saveBuddyToCloud(payload, editId || undefined);
      } else if (editId) {
        store.upsertBuddyPostFromCloud({ ...payload, id: editId, isMine: true });
      } else {
        store.addBuddyPost(payload);
      }
      wx.showToast({
        title: editId ? '已更新并重新上线' : '发布成功',
        icon: 'success',
      });
      setTimeout(() => wx.navigateBack(), 700);
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '发布失败', icon: 'none' });
    }
  },
});
