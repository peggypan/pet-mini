const store = require('../../utils/store');
const { MOCK_PET } = require('../../utils/mock');

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
        if (!res.authSetting[scope]) {
          // 首次请求，会在使用时自动弹窗
          console.log('等待首次授权');
        } else if (res.authSetting[scope] === false) {
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
    zones: [
      { id: 'cat', name: '猫咪' },
      { id: 'dog', name: '狗狗' },
      { id: 'other', name: '异宠' },
    ],
    zone: 'dog',
    content: '',
    mediaList: [],
    maxMediaCount: 9,
    emojiPack: ['😀', '🤣', '🥹', '🐶', '🐱', '❤️', '👍', '🔥', '🎉', '🤝', '😿', '😡'],
  },

  onZone(e) {
    this.setData({ zone: e.currentTarget.dataset.id });
  },

  onInput(e) {
    this.setData({ content: e.detail.value });
  },

  onPickEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji || '';
    if (!emoji) return;
    this.setData({ content: `${this.data.content || ''}${emoji}` });
  },

  onChooseImage() {
    const remain = this.data.maxMediaCount - this.data.mediaList.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 9 个媒体', icon: 'none' });
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
        count: Math.min(remain, 9),
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        camera: 'back',
        success: (res) => {
          console.log('选择图片成功:', res);
          const files = res.tempFiles || [];
          if (files.length === 0) {
            wx.showToast({ title: '未选择图片', icon: 'none' });
            return;
          }
          const append = files.map((f) => ({
            type: 'image',
            url: f.tempFilePath,
          }));
          this.setData({ mediaList: [...this.data.mediaList, ...append].slice(0, this.data.maxMediaCount) });
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
      count: Math.min(remain, 9),
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        console.log('选择图片成功(旧API):', res);
        const tempFilePaths = res.tempFilePaths || [];
        if (tempFilePaths.length === 0) {
          wx.showToast({ title: '未选择图片', icon: 'none' });
          return;
        }
        const append = tempFilePaths.map((url) => ({
          type: 'image',
          url,
        }));
        this.setData({ mediaList: [...this.data.mediaList, ...append].slice(0, this.data.maxMediaCount) });
      },
      fail: (err) => {
        console.error('选择图片失败(旧API):', err);
        wx.showToast({ title: '请检查相册和相机权限', icon: 'none' });
      },
    });
  },

  onChooseVideo() {
    const remain = this.data.maxMediaCount - this.data.mediaList.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 9 个媒体', icon: 'none' });
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
        this.doChooseVideo(remain);
      },
    });
  },

  doChooseVideo(remain) {
    const chooseMedia = () => {
      wx.chooseMedia({
        count: Math.min(remain, 3),
        mediaType: ['video'],
        sourceType: ['album', 'camera'],
        maxDuration: 60, // 限制60秒
        camera: 'back',
        success: (res) => {
          console.log('选择视频成功:', res);
          const files = res.tempFiles || [];
          if (files.length === 0) {
            wx.showToast({ title: '未选择视频', icon: 'none' });
            return;
          }
          const append = files.map((f) => ({
            type: 'video',
            url: f.tempFilePath,
            poster: f.thumbTempFilePath || '',
            size: f.size || 0,
          }));
          this.setData({ mediaList: [...this.data.mediaList, ...append].slice(0, this.data.maxMediaCount) });
        },
        fail: (err) => {
          console.error('选择视频失败:', err);
          // 用户取消选择时不显示错误
          if (err.errMsg && (err.errMsg.includes('cancel') || err.errMsg.includes('fail'))) {
            return;
          }
          // 检查是否是权限问题
          if (err.errMsg && err.errMsg.includes('permission')) {
            this.showPermissionGuide();
          } else {
            // 尝试使用旧版 API
            this.fallbackChooseVideo(remain);
          }
        },
      });
    };

    // 检查是否支持 chooseMedia
    if (wx.chooseMedia) {
      chooseMedia();
    } else {
      this.fallbackChooseVideo(remain);
    }
  },

  // 降级使用旧版视频选择 API
  fallbackChooseVideo(remain) {
    wx.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      success: (res) => {
        console.log('选择视频成功(旧API):', res);
        this.setData({
          mediaList: [...this.data.mediaList, {
            type: 'video',
            url: res.tempFilePath,
            poster: res.thumbTempFilePath || '',
            size: res.size || 0,
          }].slice(0, this.data.maxMediaCount),
        });
      },
      fail: (err) => {
        console.error('选择视频失败(旧API):', err);
        wx.showToast({ title: '请检查相册和相机权限', icon: 'none' });
      },
    });
  },

  onRemoveMedia(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    const next = this.data.mediaList.filter((_, i) => i !== index);
    this.setData({ mediaList: next });
  },

  onSubmit() {
    const { zone, content, mediaList } = this.data;
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
    store.addSocialPost({
      userName: '我',
      petName: MOCK_PET.name,
      avatar: MOCK_PET.avatar,
      zone,
      content: text,
      image: imageUrls[0] || '',
      images: imageUrls,
      mediaList,
    });

    wx.showToast({ title: '发布成功', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 700);
  },
});
