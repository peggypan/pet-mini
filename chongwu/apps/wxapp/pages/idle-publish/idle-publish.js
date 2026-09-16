const api = require('../../utils/request');
const store = require('../../utils/store');
const { pickMixedMedia, MAX_IMAGES } = require('../../utils/media-upload');

const CONDITION_MAP = ['全新', '九成新', '轻微使用', '明显使用'];
const ICON_POOL = ['👕', '☕', '📦', '🦴', '🎾', '🧴', '🏠', '💊'];

Page({
  onLoad() {
    // 检查相册和相机权限
    this.checkPermissions();
  },

  // 检查权限
  checkPermissions() {
    const scope = 'scope.writePhotosAlbum';
    wx.getSetting({
      success: (res) => {
        if (res.authSetting[scope] === false) {
          // 已拒绝授权，引导用户去设置
          this.showPermissionGuide();
        }
      },
    });
  },

  // 显示权限引导
  showPermissionGuide() {
    wx.showModal({
      title: '需要相册权限',
      content: '上传图片需要访问您的相册，请在设置中开启权限',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting({
            success: (res) => {
              if (res.authSetting['scope.writePhotosAlbum']) {
                wx.showToast({ title: '授权成功', icon: 'success' });
              }
            },
          });
        }
      },
    });
  },

  data: {
    categories: [
      { id: 1, name: '宠物粮' },
      { id: 2, name: '笼子/窝垫' },
      { id: 3, name: '玩具' },
      { id: 4, name: '洗护用品' },
      { id: 5, name: '服饰配饰' },
      { id: 6, name: '保健护理' },
      { id: 7, name: '其他用品' },
    ],
    categoryId: null,
    selectedCategoryIndex: -1,
    title: '',
    description: '',
    images: [],
    price: '',
    originalPrice: '',
    conditionLevel: 2,
    usageDesc: '',
    tradeType: 1,
    location: '',
    district: '',
    agreeRule: false,
    submitting: false,
    maxImages: MAX_IMAGES,
  },

  onCategoryChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      categoryId: this.data.categories[index].id,
      selectedCategoryIndex: index,
    });
  },

  onConditionChange(e) {
    this.setData({ conditionLevel: Number(e.currentTarget.dataset.value) });
  },

  onTradeTypeChange(e) {
    this.setData({ tradeType: Number(e.currentTarget.dataset.value) });
  },

  onToggleRule() {
    this.setData({ agreeRule: !this.data.agreeRule });
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  imagesAsMediaList() {
    return (this.data.images || []).map((url) => ({ type: 'image', url }));
  },

  onChooseMedia() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.writePhotosAlbum'] === false) {
          this.showPermissionGuide();
          return;
        }
        pickMixedMedia(this.imagesAsMediaList(), { mediaType: ['image'], count: MAX_IMAGES })
          .then((list) => {
            this.setData({
              images: list.filter((m) => m.type === 'image').map((m) => m.url),
            });
          })
          .catch((err) => {
            const msg = (err && err.message) || '';
            if (msg.includes('permission')) this.showPermissionGuide();
          });
      },
    });
  },

  onRemoveImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images });
  },

  async onSubmit() {
    const {
      categoryId, title, description, images, price, originalPrice,
      conditionLevel, usageDesc, tradeType, location, district, agreeRule, submitting,
    } = this.data;

    if (submitting) return;
    if (!agreeRule) {
      wx.showToast({ title: '请先勾选发布规范', icon: 'none' });
      return;
    }
    if (!categoryId || !title || !description || price === '') {
      wx.showToast({ title: '请填写必填项', icon: 'none' });
      return;
    }

    const banned = /活体|幼崽|出售猫|出售狗|卖猫|卖狗|繁殖|公猫配种|种公/;
    if (banned.test(title) || banned.test(description)) {
      wx.showToast({ title: '禁止发布活体交易相关内容', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    const payload = {
      categoryId,
      title,
      description,
      images,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      conditionLevel,
      usageDesc,
      tradeType,
      location,
      district,
    };

    try {
      await api.post('/idle', payload);
    } catch (e) {
      // local
    }

    store.addIdleItem({
      ...payload,
      conditionText: CONDITION_MAP[conditionLevel - 1] || '九成新',
      displayIcon: ICON_POOL[categoryId % ICON_POOL.length],
      seller: { nickname: '我' },
    });

    wx.showToast({ title: '发布成功', icon: 'success' });
    setTimeout(() => {
      wx.switchTab({ url: '/pages/idle/idle' });
    }, 800);
  },
});
