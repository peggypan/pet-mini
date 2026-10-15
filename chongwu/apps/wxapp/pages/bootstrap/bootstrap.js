const { tryLaunchWithSplash } = require('../../utils/splash-ad-launch');
const {
  PRIVACY_GATE,
  isPrivacyAcceptedLocally,
  markPrivacyAccepted,
  clearPrivacyAccepted,
} = require('../../utils/privacy');

Page({
  onLoad() {
    this.routeByPrivacy();
  },

  routeByPrivacy() {
    if (!wx.getPrivacySetting) {
      markPrivacyAccepted();
      this.enterApp();
      return;
    }

    if (isPrivacyAcceptedLocally()) {
      this.enterApp();
      this.verifyPrivacyInBackground();
      return;
    }

    wx.getPrivacySetting({
      success: (res) => {
        if (!res.needAuthorization) {
          markPrivacyAccepted();
          this.enterApp();
          return;
        }
        clearPrivacyAccepted();
        wx.redirectTo({ url: PRIVACY_GATE });
      },
      fail: () => {
        wx.redirectTo({ url: PRIVACY_GATE });
      },
    });
  },

  verifyPrivacyInBackground() {
    wx.getPrivacySetting({
      success: (res) => {
        if (res.needAuthorization) {
          clearPrivacyAccepted();
          wx.reLaunch({ url: PRIVACY_GATE });
        }
      },
    });
  },

  enterApp() {
    const app = getApp();
    if (app) {
      app.globalData.privacyAccepted = true;
      if (typeof app.tryAutoLocateCity === 'function') {
        app.tryAutoLocateCity();
      }
    }
    tryLaunchWithSplash();
  },
});
