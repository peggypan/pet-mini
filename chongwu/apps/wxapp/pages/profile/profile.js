const app = getApp();
const api = require('../../utils/request');

Page({
  data: {
    userInfo: null,
    isLogin: false,
    stats: {
      serviceOrders: 0,
      idleOrders: 0,
      pets: 0,
      favorites: 0,
    },
  },

  onLoad() {
    this.checkLogin();
  },

  onShow() {
    this.checkLogin();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },

  async checkLogin() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.setData({ isLogin: true });
      this.loadUserProfile();
    } else {
      this.setData({ isLogin: false, userInfo: null });
    }
  },

  async loadUserProfile() {
    try {
      const res = await api.get('/users/profile');
      this.setData({ userInfo: res.data });
      this.loadStats();
    } catch (e) {
      console.error(e);
    }
  },

  async loadStats() {
    try {
      const [serviceRes, idleRes] = await Promise.all([
        api.get('/services/orders/my'),
        api.get('/idle/orders/my'),
      ]);

      this.setData({
        stats: {
          serviceOrders: serviceRes.data?.length || 0,
          idleOrders: (idleRes.data?.buyOrders?.length || 0) + (idleRes.data?.sellOrders?.length || 0),
          pets: this.data.userInfo?.pets?.length || 0,
          favorites: 0,
        },
      });
    } catch (e) {
      console.error(e);
    }
  },

  onFavoriteTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  onCouponTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  onHelpTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  onAboutTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  async onLogin() {
    try {
      await app.login();
      this.setData({ isLogin: true });
      this.loadUserProfile();
    } catch (e) {
      wx.showToast({ title: '登录失败', icon: 'none' });
    }
  },

  onOrdersTap() {
    wx.navigateTo({ url: '/pages/orders/orders' });
  },

  onHealthTap() {
    wx.switchTab({ url: '/pages/health/health' });
  },

  onAddressTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  onSettingsTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          app.globalData.token = null;
          this.setData({ isLogin: false, userInfo: null });
        }
      },
    });
  },
});
