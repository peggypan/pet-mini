const app = getApp();
const api = require('../../utils/request');
const { MOCK_PET } = require('../../utils/mock');

/** 生成简易二维码点阵样式数据 */
function buildQrCells() {
  return [
    1, 1, 1, 0, 1, 1,
    1, 0, 1, 1, 0, 1,
    1, 1, 1, 0, 1, 0,
    0, 1, 0, 1, 1, 1,
    1, 0, 1, 0, 1, 0,
    1, 1, 0, 1, 0, 1,
  ];
}

Page({
  data: {
    statusBarHeight: 20,
    userInfo: null,
    isLogin: false,
    qrCells: buildQrCells(),
    pet: { ...MOCK_PET },
    stats: {
      serviceOrders: 0,
      idleOrders: 0,
      pets: 0,
      favorites: 0,
    },
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
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
      // 未登录也展示 Mock 宠物档案，方便预览还原
      this.setData({ isLogin: false, userInfo: null, pet: { ...MOCK_PET } });
    }
  },

  async loadUserProfile() {
    try {
      const res = await api.get('/users/profile');
      const userInfo = res.data;
      const firstPet = userInfo?.pets?.[0];
      const pet = firstPet
        ? {
            ...MOCK_PET,
            name: firstPet.name || MOCK_PET.name,
            age: firstPet.age ? `${firstPet.age}岁` : MOCK_PET.age,
            days: firstPet.accompanyDays || firstPet.days || MOCK_PET.days,
            weight: firstPet.weight ? `${firstPet.weight} kg` : MOCK_PET.weight,
            avatar: firstPet.avatarUrl || firstPet.avatar || MOCK_PET.avatar,
            cover: firstPet.coverUrl || firstPet.avatarUrl || firstPet.avatar || MOCK_PET.cover,
          }
        : { ...MOCK_PET };

      this.setData({ userInfo, pet });
      this.loadStats();
    } catch (e) {
      console.error(e);
      this.setData({ pet: { ...MOCK_PET } });
    }
  },

  async loadStats() {
    try {
      const [serviceRes, idleRes] = await Promise.all([
        api.get('/services/orders/my'),
        api.get('/idle/orders/my'),
      ]);

      const serviceOrders = serviceRes.data?.length || 0;
      const idleOrders =
        (idleRes.data?.buyOrders?.length || 0) + (idleRes.data?.sellOrders?.length || 0);

      this.setData({
        stats: {
          serviceOrders,
          idleOrders,
          pets: this.data.userInfo?.pets?.length || 0,
          favorites: 0,
        },
      });
    } catch (e) {
      console.error(e);
    }
  },

  onNotifyTap() {
    wx.showToast({ title: '暂无新消息', icon: 'none' });
  },

  onFavoriteTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  onFamilyTap() {
    wx.navigateTo({ url: '/pages/health/health' });
  },

  onDarkModeTap() {
    wx.showToast({ title: '深色模式开发中', icon: 'none' });
  },

  onHelpTap() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  onAboutTap() {
    wx.showModal({
      title: '关于宠享家',
      content: '用心守护每一个毛孩子',
      showCancel: false,
    });
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
    wx.navigateTo({ url: '/pages/health/health' });
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          app.globalData.token = null;
          this.setData({ isLogin: false, userInfo: null, pet: { ...MOCK_PET } });
        }
      },
    });
  },
});
