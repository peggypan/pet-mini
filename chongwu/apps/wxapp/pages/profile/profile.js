const app = getApp();
const api = require('../../utils/request');
const { getDefaultPet } = require('../../utils/catalog');
const store = require('../../utils/store');

Page({
  data: {
    statusBarHeight: 20,
    userInfo: null,
    isLogin: false,
    pet: {},
    unreadCount: 0,
    stats: {
      posts: 0,
      events: 0,
      friends: 0,
    },
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
    this.checkLogin();
  },

  onShow() {
    this.checkLogin();
    this.loadStats();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },

  async checkLogin() {
    const token = wx.getStorageSync('token');
    const cachedUser = wx.getStorageSync('userInfo');
    if (token) {
      this.setData({ isLogin: true, userInfo: cachedUser || null });
      if (String(token).startsWith('local_')) {
        this.applyLocalPet();
        return;
      }
      this.loadUserProfile();
    } else {
      this.setData({ isLogin: false, userInfo: null });
      this.applyLocalPet();
    }
  },

  applyLocalPet() {
    this.setData({ pet: getDefaultPet() });
    this.loadStats();
  },

  loadStats() {
    const posts = store.listSocialPosts().length;
    const events = store.listEventSignups().length;
    const friends = store.listFollows().length;
    this.setData({
      unreadCount: store.countUnreadMessages(),
      stats: { posts, events, friends },
    });
  },

  async loadUserProfile() {
    try {
      const res = await api.get('/users/profile');
      this.setData({ userInfo: res.data });
    } catch (e) {
      // local
    }
    this.applyLocalPet();
  },

  onEditPet() {
    const pets = store.listPets();
    const url = pets[0]
      ? `/pages/pet-form/pet-form?petId=${pets[0].id}`
      : '/pages/pet-form/pet-form';
    wx.navigateTo({ url });
  },

  onMyPosts() {
    wx.switchTab({ url: '/pages/social/social' });
    wx.showToast({ title: '已在广场展示你的动态', icon: 'none' });
  },

  onMyEvents() {
    const events = store.listEventSignups();
    if (!events.length) {
      wx.switchTab({ url: '/pages/discover/discover' });
      return;
    }
    wx.showModal({
      title: '我的约局',
      content: events.map((e) => `· ${e.title}`).join('\n'),
      showCancel: false,
    });
  },

  onMyFriends() {
    wx.switchTab({ url: '/pages/discover/discover' });
  },

  onMessagesTap() {
    wx.switchTab({ url: '/pages/messages/messages' });
  },

  async onGetPhoneNumber(e) {
    const detail = e.detail || {};
    const ok =
      detail.errMsg === 'getPhoneNumber:ok' ||
      (!!detail.code || !!detail.encryptedData);
    if (!ok) {
      wx.showToast({ title: '需要授权手机号才能登录', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '登录中', mask: true });
    try {
      const res = await app.loginByPhone(detail);
      this.setData({ isLogin: true, userInfo: res.user || null });
      this.applyLocalPet();
      wx.showToast({ title: '登录成功', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onAgreePrivacyAuthorization() {},

  onHelpTap() {
    wx.showModal({
      title: '使用指南',
      content: '1. 完善宠物档案\n2. 在广场发动态\n3. 发现页找同城宠友\n4. 报名约局或私信聊天',
      showCancel: false,
    });
  },

  onAboutTap() {
    wx.showModal({
      title: '关于宠头头',
      content: '专注宠物交友 · 让毛孩子帮你认识新朋友',
      showCancel: false,
    });
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (!res.confirm) return;
        if (typeof app.logout === 'function') app.logout();
        this.setData({ isLogin: false, userInfo: null });
        this.applyLocalPet();
      },
    });
  },
});
