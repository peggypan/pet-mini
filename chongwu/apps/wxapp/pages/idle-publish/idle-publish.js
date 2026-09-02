const api = require('../../utils/request');
const store = require('../../utils/store');

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

  onChooseImage() {
    const remain = 9 - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传9张图片', icon: 'none' });
      return;
    }

    // 先检查权限状态
    wx.getSetting({
      success: (res) => {
        const scope = 'scope.writePhotosAlbum';
        if (res.authSetting[scope] === false) {
          // 已拒绝授权，引导去设置
          this.showPermissionGuide();
          return;
        }
        // 未授权或已授权，直接调用选择
        this.doChooseImage(remain);
      },
    });
  },

  doChooseImage(remain) {
    const chooseMedia = () => {
      wx.chooseMedia({
        count: remain,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        camera: 'back',
        sizeType: ['compressed'],
        success: (res) => {
          console.log('选择图片成功:', res);
          const newImages = res.tempFiles.map((file) => file.tempFilePath);
          if (newImages.length === 0) {
            wx.showToast({ title: '未选择图片', icon: 'none' });
            return;
          }
          this.setData({ images: [...this.data.images, ...newImages] });
        },
        fail: (err) => {
          console.error('选择图片失败:', err);
          // 用户取消选择时不显示错误
          if (err.errMsg && (err.errMsg.includes('cancel') || err.errMsg.includes('fail'))) {
            return;
          }
          // 检查是否是权限问题
          if (err.errMsg && err.errMsg.includes('permission')) {
            this.showPermissionGuide();
          } else {
            // 尝试使用旧版 API
            this.fallbackChooseImage(remain);
          }
        },
      });
    };

    // 检查是否支持 chooseMedia
    if (wx.chooseMedia) {
      chooseMedia();
    } else {
      this.fallbackChooseImage(remain);
    }
  },

  // 降级使用旧版 API
  fallbackChooseImage(remain) {
    wx.chooseImage({
      count: remain,
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        console.log('选择图片成功(旧API):', res);
        const tempFilePaths = res.tempFilePaths || [];
        if (tempFilePaths.length === 0) {
          wx.showToast({ title: '未选择图片', icon: 'none' });
          return;
        }
        this.setData({ images: [...this.data.images, ...tempFilePaths] });
      },
      fail: (err) => {
        console.error('选择图片失败(旧API):', err);
        wx.showToast({ title: '请检查相册和相机权限', icon: 'none' });
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
