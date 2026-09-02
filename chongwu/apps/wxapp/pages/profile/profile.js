const app = getApp();
const api = require('../../utils/request');
const { MOCK_PET } = require('../../utils/mock');
const store = require('../../utils/store');

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
    unreadCount: 0,
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
    this.loadLocalStats();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },

  async checkLogin() {
    const token = wx.getStorageSync('token');
    const cachedUser = wx.getStorageSync('userInfo');
    if (token) {
      this.setData({
        isLogin: true,
        userInfo: cachedUser || this.data.userInfo,
      });
      // 本地 token 无法打真实 profile，只刷新本地宠物
      if (String(token).startsWith('local_')) {
        this.applyLocalPet();
        this.loadLocalStats();
        return;
      }
      this.loadUserProfile();
    } else {
      this.setData({ isLogin: false, userInfo: null });
      this.applyLocalPet();
    }
  },

  applyLocalPet() {
    const localPets = store.listPets();
    if (localPets[0]) {
      this.setData({
        pet: {
          ...MOCK_PET,
          name: localPets[0].name || MOCK_PET.name,
          age: localPets[0].birthday || MOCK_PET.age,
          weight: localPets[0].weight ? `${localPets[0].weight} kg` : MOCK_PET.weight,
          avatar: localPets[0].avatarUrl || MOCK_PET.avatar,
        },
      });
    } else {
      this.setData({ pet: { ...MOCK_PET } });
    }
  },

  loadLocalStats() {
    const serviceOrders = store.listServiceOrders().length;
    const idleOrders = store.listIdleBuyOrders().length + store.listIdleSellOrders().length;
    const pets = store.listPets().length || (this.data.userInfo?.pets?.length || 0);
    const unreadCount = store.countUnreadMessages();
    this.setData({
      unreadCount,
      stats: {
        serviceOrders,
        idleOrders,
        pets,
        favorites: 0,
      },
    });
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
      this.loadLocalStats();
    } catch (e) {
      this.applyLocalPet();
      this.loadLocalStats();
    }
  },

  onNotifyTap() {
    wx.navigateTo({ url: '/pages/messages/messages' });
  },

  onFavoriteTap() {
    wx.showToast({ title: '收藏夹后续开放', icon: 'none' });
  },

  onFamilyTap() {
    wx.navigateTo({ url: '/pages/health/health' });
  },

  onDarkModeTap() {
    wx.showToast({ title: '深色模式开发中', icon: 'none' });
  },

  onHelpTap() {
    wx.showModal({
      title: '帮助',
      content: 'MVP 路径：首页→服务预约 / 闲置买卖 / 健康本 / 商城下单，订单与消息在「我的」查看。',
      showCancel: false,
    });
  },

  onAboutTap() {
    wx.showModal({
      title: '关于宠头头',
      content: '用心守护每一个毛孩子 · MVP 演示版',
      showCancel: false,
    });
  },

  async onGetPhoneNumber(e) {
    const detail = e.detail || {};
    // 只有微信底部授权弹窗点「允许」后，才会带上 code / encryptedData
    const ok =
      detail.errMsg === 'getPhoneNumber:ok' ||
      (!!detail.code || !!detail.encryptedData);

    if (!ok) {
      const msg =
        detail.errno === 104 || (detail.errMsg || '').indexOf('privacy') > -1
          ? '请先同意隐私协议后再授权手机号'
          : '请在微信弹窗中允许手机号授权';
      wx.showToast({ title: msg, icon: 'none' });
      return;
    }

    wx.showLoading({ title: '登录中', mask: true });
    try {
      const res = await app.loginByPhone(detail);
      this.setData({ isLogin: true, userInfo: res.user || null });
      if (res.token && String(res.token).startsWith('local_')) {
        this.applyLocalPet();
      } else {
        this.loadUserProfile();
      }
      this.loadLocalStats();
      wx.showToast({ title: '登录成功', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onAgreePrivacyAuthorization() {
    // 用户已同意隐私协议，可继续走 getPhoneNumber 回调
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
          if (typeof app.logout === 'function') {
            app.logout();
          } else {
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
            app.globalData.token = null;
            app.globalData.userInfo = null;
          }
          this.setData({ isLogin: false, userInfo: null });
          this.applyLocalPet();
          this.loadLocalStats();
        }
      },
    });
  },
});
