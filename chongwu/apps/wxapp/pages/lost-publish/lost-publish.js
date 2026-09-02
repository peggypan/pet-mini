const store = require('../../utils/store');
const { MOCK_PET } = require('../../utils/mock');

const PLACEHOLDERS = {
  lost: '描述走失时间、地点、体貌特征、是否戴项圈等…',
  found: '描述捡到时间、地点、宠物特征、当前安置情况等…',
};

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
    postType: 'lost',
    zones: [
      { id: 'cat', name: '猫咪' },
      { id: 'dog', name: '狗狗' },
      { id: 'other', name: '异宠' },
    ],
    zone: 'dog',
    location: '',
    phone: '',
    content: '',
    images: [],
    placeholder: PLACEHOLDERS.lost,
  },

  onType(e) {
    const postType = e.currentTarget.dataset.type;
    this.setData({
      postType,
      placeholder: PLACEHOLDERS[postType],
    });
  },

  onZone(e) {
    this.setData({ zone: e.currentTarget.dataset.id });
  },

  onField(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  onChooseImage() {
    const remain = 3 - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传3张图片', icon: 'none' });
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
          const paths = (res.tempFiles || []).map((f) => f.tempFilePath);
          if (paths.length === 0) {
            wx.showToast({ title: '未选择图片', icon: 'none' });
            return;
          }
          this.setData({ images: [...this.data.images, ...paths] });
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
    const images = this.data.images.slice();
    images.splice(index, 1);
    this.setData({ images });
  },

  onSubmit() {
    const { postType, zone, location, phone, content, images } = this.data;
    const text = (content || '').trim();
    if (!text) {
      wx.showToast({ title: '请填写详细描述', icon: 'none' });
      return;
    }
    if (phone && !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }

    const banned = /活体|出售猫|出售狗|卖猫|卖狗|买卖|配种|繁殖/;
    if (banned.test(text) || banned.test(location || '')) {
      wx.showToast({ title: '禁止借寻宠/招领进行活体交易', icon: 'none' });
      return;
    }

    const tag = postType === 'lost' ? '寻宠' : '招领';
    const parts = [
      `【${tag}互助】`,
      text,
      location ? `地点：${location}` : '',
      phone ? `联系：${phone}` : '',
    ].filter(Boolean);

    store.addSocialPost({
      userName: '我',
      petName: MOCK_PET.name,
      avatar: MOCK_PET.avatar,
      zone,
      content: parts.join('\n'),
      image: images[0] || '',
      images,
      lostType: postType,
      essence: false,
    });

    store.pushMessage(
      `${tag}信息已发布`,
      '已同步到交友广场，同城宠友可以看到',
      'social'
    );

    wx.showToast({ title: '发布成功', icon: 'success' });
    setTimeout(() => {
      wx.navigateBack({
        fail: () => wx.switchTab({ url: '/pages/index/index' }),
      });
    }, 700);
  },
});
