const { findEvent } = require('../../utils/catalog');
const { generateEventPosters } = require('../../utils/event-poster');

Page({
  data: {
    event: null,
    posters: [],
    current: 0,
    generating: true,
    error: '',
  },

  onLoad(options) {
    const event = findEvent(options.id);
    if (!event) {
      wx.showToast({ title: '活动不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    this.setData({ event });
    wx.setNavigationBarTitle({ title: '活动分享海报' });
  },

  onReady() {
    this.buildPosters();
  },

  async buildPosters() {
    const { event } = this.data;
    if (!event) return;
    this.setData({ generating: true, error: '' });
    try {
      const posters = await generateEventPosters(this, event);
      this.setData({ posters, generating: false });
    } catch (err) {
      this.setData({
        generating: false,
        error: '海报生成失败，请重试',
      });
      wx.showToast({ title: '海报生成失败', icon: 'none' });
    }
  },

  onSwiperChange(e) {
    this.setData({ current: e.detail.current });
  },

  onRetry() {
    this.buildPosters();
  },

  onPreview() {
    const { posters, current } = this.data;
    const item = posters[current];
    if (!item) return;
    wx.previewImage({
      urls: posters.map((p) => p.url),
      current: item.url,
    });
  },

  onSave() {
    const { posters, current } = this.data;
    const item = posters[current];
    if (!item) return;
    wx.showLoading({ title: '保存中...' });
    wx.saveImageToPhotosAlbum({
      filePath: item.url,
      success: () => {
        wx.hideLoading();
        wx.showToast({ title: '已保存到相册', icon: 'success' });
      },
      fail: (err) => {
        wx.hideLoading();
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许保存到相册，以便保存分享海报',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) wx.openSetting();
            },
          });
          return;
        }
        wx.showToast({ title: '保存失败', icon: 'none' });
      },
    });
  },

  onShareAppMessage() {
    const { event, posters, current } = this.data;
    return {
      title: event ? `邀请你参加：${event.title}` : '宠头头活动邀请',
      path: event ? `/pages/event-detail/event-detail?id=${event.id}` : '/pages/home/home',
      imageUrl: posters[current]?.url || '',
    };
  },
});
