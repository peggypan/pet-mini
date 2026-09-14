const HOME = '/pages/home/home';

Page({
  data: {
    contractName: '',
  },

  onLoad() {
    this.checkAndEnter();
  },

  checkAndEnter() {
    if (!wx.getPrivacySetting) {
      wx.reLaunch({ url: HOME });
      return;
    }
    wx.getPrivacySetting({
      success: (res) => {
        if (!res.needAuthorization) {
          wx.reLaunch({ url: HOME });
          return;
        }
        this.setData({ contractName: res.privacyContractName || '' });
      },
      fail: () => {
        this.setData({ contractName: '' });
      },
    });
  },

  onOpenContract() {
    if (wx.openPrivacyContract) {
      wx.openPrivacyContract({ fail: () => {} });
    }
  },

  onAgree() {
    const app = getApp();
    if (app && app.handlePrivacyAgree) {
      app.handlePrivacyAgree('agree-privacy-btn');
    }
    app.globalData.privacyAccepted = true;
    wx.reLaunch({ url: HOME });
  },

  onDisagree() {
    wx.showModal({
      title: '无法继续使用',
      content: '未同意隐私保护指引，将无法使用宠头头小程序。',
      confirmText: '退出',
      cancelText: '再看看',
      success: (res) => {
        if (res.confirm && wx.exitMiniProgram) {
          wx.exitMiniProgram();
        }
      },
    });
  },
});
