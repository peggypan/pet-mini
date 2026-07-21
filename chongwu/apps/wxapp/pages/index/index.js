const app = getApp();
const api = require('../../utils/request');

Page({
  data: {
    banners: [],
    categories: [
      { id: 1, name: '上门洗护', icon: '🛁' },
      { id: 2, name: '上门喂宠', icon: '🍼' },
      { id: 3, name: '寄养', icon: '🏠' },
      { id: 4, name: '遛狗', icon: '🦮' },
      { id: 5, name: '宠物医院', icon: '🏥' },
      { id: 6, name: '健康档案', icon: '📋' },
    ],
    services: [],
    idleItems: [],
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const [servicesRes, idleRes] = await Promise.all([
        api.get('/services', { page: 1, pageSize: 6 }),
        api.get('/idle', { page: 1, pageSize: 6 }),
      ]);
      
      this.setData({
        services: servicesRes.data?.list || [],
        idleItems: idleRes.data?.list || [],
      });
    } catch (e) {
      console.error('加载数据失败', e);
    }
  },

  onCategoryTap(e) {
    const { id, name } = e.currentTarget.dataset;
    if (id === 6) {
      wx.switchTab({ url: '/pages/health/health' });
    } else {
      wx.navigateTo({ url: `/pages/service/service?categoryId=${id}` });
    }
  },

  onServiceTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${id}` });
  },

  onIdleTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/idle-detail/idle-detail?id=${id}` });
  },

  onMoreServices() {
    wx.switchTab({ url: '/pages/service/service' });
  },

  onMoreIdle() {
    wx.switchTab({ url: '/pages/idle/idle' });
  },
});
