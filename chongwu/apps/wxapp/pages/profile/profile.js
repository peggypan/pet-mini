const app = getApp();
const { getDefaultPet } = require('../../utils/catalog');
const store = require('../../utils/store');
const { explainGetPhoneNumberFail } = require('../../utils/phone-login-errors');

Page({
  data: {
    isLogin: false,
    userInfo: null,
    pet: {},
    unreadCount: 0,
    stats: { buddies: 0, posts: 0, events: 0, orders: 0 },
    city: '北京',
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
    const token = wx.getStorageSync('token');
    this.setData({
      isLogin: !!token,
      userInfo: wx.getStorageSync('userInfo'),
      pet: getDefaultPet(),
      unreadCount: store.countUnreadMessages(),
      stats: {
        buddies: store.listFollows().length,
        posts: store.listSocialPosts().length + store.listBuddyPosts().length,
        events: store.listEventSignups().length,
        orders: store.listServiceBooks().length,
      },
      city: store.getCity(),
    });
  },

  onCityTap() {
    wx.navigateTo({ url: '/pages/city-picker/city-picker' });
  },

  onAgreePrivacyForPhone() {
    getApp().handlePrivacyAgree('login-phone-btn');
  },

  onGetPhoneNumber(e) {
    const detail = e.detail || {};
    const errMsg = detail.errMsg || '';
    if (errMsg.includes('deny') || errMsg.includes('cancel')) {
      wx.showToast({ title: '已取消手机号授权', icon: 'none' });
      return;
    }
    const ok = errMsg === 'getPhoneNumber:ok' || !!detail.code || !!detail.encryptedData;
    if (!ok) {
      const explained = explainGetPhoneNumberFail(detail);
      if (!explained) return;
      wx.showModal({
        title: explained.title,
        content: explained.content,
        confirmText: explained.suggestWxLogin ? '微信快捷登录' : '知道了',
        cancelText: explained.suggestWxLogin ? '知道了' : undefined,
        showCancel: !!explained.suggestWxLogin,
        success: (res) => {
          if (explained.suggestWxLogin && res.confirm) this.onWxLogin();
        },
      });
      return;
    }
    wx.showLoading({ title: '登录中', mask: true });
    app.loginByPhone(detail).then(() => {
      this.onShow();
      wx.showToast({ title: '登录成功', icon: 'success' });
    }).catch((err) => {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    }).finally(() => wx.hideLoading());
  },

  onWxLogin() {
    wx.showLoading({ title: '登录中', mask: true });
    app.loginByWechat()
      .then(() => {
        this.onShow();
        wx.showToast({ title: '登录成功', icon: 'success' });
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '登录失败', icon: 'none' });
      })
      .finally(() => wx.hideLoading());
  },

  onMessages() { wx.switchTab({ url: '/pages/messages/messages' }); },
  onPetCert() { wx.navigateTo({ url: '/pages/pet-cert/pet-cert' }); },
  onEditPet() { wx.navigateTo({ url: '/pages/pet-form/pet-form' }); },
  onMyBuddy() { wx.navigateTo({ url: '/pages/buddy/buddy' }); },
  onMyPosts() { wx.switchTab({ url: '/pages/social/social' }); },
  onMyEvents() { wx.navigateTo({ url: '/pages/my-events/my-events' }); },
  onMyHelp() { wx.navigateTo({ url: '/pages/pet-rescue/pet-rescue' }); },
  onOrders() {
    const orders = store.listServiceBooks();
    wx.showModal({
      title: '服务预约订单',
      content: orders.length ? orders.map((o) => `· ${o.merchantName}`).join('\n') : '暂无订单',
      showCancel: false,
    });
  },
  onAbout() {
    wx.showModal({ title: '关于宠头头', content: '以宠物为媒介的同城社交与生活平台', showCancel: false });
  },
  onLogout() {
    wx.showModal({
      title: '退出登录',
      success: (res) => {
        if (res.confirm) {
          app.logout();
          this.onShow();
        }
      },
    });
  },
});
