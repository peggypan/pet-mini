const store = require('../../utils/store');
const { saveMapPointToCloud } = require('../../utils/map-point-cloud-sync');
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

  async onSubmit() {
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
    const payload = {
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
    };
    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中', mask: true });
    try {
      const { row, pointsAwarded, pending } = await saveMapPointToCloud(payload);
      if (!row) {
        wx.showToast({ title: '提交失败，请检查信息', icon: 'none' });
        this.setData({ submitting: false });
        return;
      }
      if (pending) {
        wx.hideLoading();
        wx.showModal({
          title: '已提交审核',
          content: `审核通过后将展示在友好地图，并发放 ${store.MAP_MARK_POINTS_REWARD || 5} 积分`,
          showCancel: false,
          success: () => wx.navigateBack(),
        });
        return;
      }
      wx.hideLoading();
      const pts = pointsAwarded || store.MAP_MARK_POINTS_REWARD || 5;
      this.playPointsReward(pts);
    } catch (e) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({ title: e.message || '提交失败', icon: 'none' });
    }
  },
});
