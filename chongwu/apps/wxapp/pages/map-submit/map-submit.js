const store = require('../../utils/store');
const amap = require('../../utils/amap');
const { chooseMedia } = require('../../utils/choose-media');
const { blockSubPageWithoutProfile, requirePetProfile } = require('../../utils/pet-profile-guard');

const MAX_SCENE_IMAGES = 6;

const POINT_TYPES = [
  '宠物医院',
  '宠物门店',
  '宠物友好公园',
  '宠物友好酒店',
  '宠物友好商场',
  '宠物友好餐厅',
  '宠物友好景区',
  '宠物友好露营地',
  '其他',
  '宠物不友好',
  '宠物毒点',
];

Page({
  data: {
    pointTypes: POINT_TYPES,
    name: '',
    type: '宠物友好公园',
    address: '',
    allowPet: true,
    danger: false,
    dangerDesc: '',
    latitude: 0,
    longitude: 0,
    city: '',
    submitting: false,
    showPointsReward: false,
    pointsAnimActive: false,
    pointsAwarded: 5,
    images: [],
    sceneCanAdd: true,
    sceneSummary: `0/${MAX_SCENE_IMAGES}`,
  },

  onLoad() {
    blockSubPageWithoutProfile(this);
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onTypeChange(e) {
    const type = POINT_TYPES[e.detail.value];
    const isUnfriendly = type === '宠物不友好';
    const isDanger = type === '宠物毒点';
    this.setData({
      type,
      allowPet: !(isUnfriendly || isDanger),
      danger: isDanger,
      dangerDesc: isDanger ? (this.data.dangerDesc || '请勿让宠物靠近、嗅闻') : '',
    });
  },

  onAllowChange(e) {
    this.setData({ allowPet: e.detail.value });
  },

  syncSceneUI(list) {
    const images = list || [];
    this.setData({
      images,
      sceneCanAdd: images.length < MAX_SCENE_IMAGES,
      sceneSummary: `${images.length}/${MAX_SCENE_IMAGES}`,
    });
  },

  onChooseSceneImage() {
    const left = MAX_SCENE_IMAGES - (this.data.images || []).length;
    if (left <= 0) {
      wx.showToast({ title: `最多 ${MAX_SCENE_IMAGES} 张`, icon: 'none' });
      return;
    }
    chooseMedia({
      count: left,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
    })
      .then((res) => {
        const paths = (res.tempFiles || []).map((f) => f.tempFilePath).filter(Boolean);
        if (!paths.length) return;
        this.syncSceneUI([...(this.data.images || []), ...paths]);
      })
      .catch((err) => {
        if (err && String(err.message || err).includes('cancel')) return;
      });
  },

  onRemoveSceneImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    this.syncSceneUI((this.data.images || []).filter((_, i) => i !== index));
  },

  onPreviewSceneImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    const urls = this.data.images || [];
    const current = urls[index];
    if (!current) return;
    wx.previewImage({ urls, current });
  },

  onPickLocation() {
    amap.choosePoint()
      .then((loc) => {
        this.setData({
          address: loc.address || loc.name,
          latitude: loc.latitude,
          longitude: loc.longitude,
          city: loc.city || store.getCity(),
          name: this.data.name || loc.name,
        });
      })
      .catch((err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return;
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要位置权限',
            content: '请在设置中开启位置权限以使用地图选点',
            confirmText: '去设置',
            success: (r) => { if (r.confirm) wx.openSetting(); },
          });
        }
      });
  },

  noop() {},

  playPointsReward(pts) {
    if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' });
    this.setData({
      showPointsReward: true,
      pointsAwarded: pts,
      pointsAnimActive: false,
    });
    wx.nextTick(() => {
      setTimeout(() => this.setData({ pointsAnimActive: true }), 40);
    });
    setTimeout(() => {
      this.setData({
        showPointsReward: false,
        pointsAnimActive: false,
        submitting: false,
      });
      wx.navigateBack();
    }, 1650);
  },

  onSubmit() {
    if (this.data.submitting) return;
    if (!requirePetProfile()) return;
    const {
      name, type, address, allowPet, danger, dangerDesc, latitude, longitude, city, images,
    } = this.data;
    if (!name || !address) {
      wx.showToast({ title: '请填写名称和地址', icon: 'none' });
      return;
    }
    if (!latitude || !longitude) {
      wx.showToast({ title: '请在腾讯地图上选点后再提交', icon: 'none' });
      return;
    }
    if (type === '宠物毒点' && !dangerDesc.trim()) {
      wx.showToast({ title: '请填写毒点说明', icon: 'none' });
      return;
    }
    const { row, pointsAwarded } = store.addMapPoint({
      name,
      type,
      address,
      allowPet: type === '宠物不友好' || type === '宠物毒点' ? false : allowPet,
      danger: type === '宠物毒点' || danger,
      dangerDesc: type === '宠物毒点' ? dangerDesc.trim() : '',
      city: city || store.getCity(),
      latitude,
      longitude,
      distance: latitude ? '已选位置' : '待选位置',
      images: (images || []).slice(0, MAX_SCENE_IMAGES),
    });
    if (!row) {
      wx.showToast({ title: '提交失败，请检查信息', icon: 'none' });
      return;
    }
    const pts = pointsAwarded || 5;
    this.setData({ submitting: true });
    this.playPointsReward(pts);
  },
});
