const { autoLocateCity } = require('./utils/city-location');
const store = require('./utils/store');

App({
  globalData: {
    apiBaseUrl: 'http://localhost:3000/api/v1',
    token: null,
    userInfo: null,
    resolvePrivacyAuthorization: null,
  },

  /** 隐私弹窗点「同意」后调用（配合 open-type="agreePrivacyAuthorization"） */
  agreePrivacyAuthorization() {
    const resolve = this.globalData.resolvePrivacyAuthorization;
    if (typeof resolve === 'function') {
      resolve({ event: 'agree', buttonId: 'agree-privacy-btn' });
      this.globalData.resolvePrivacyAuthorization = null;
    }
  },

  onLaunch() {
    if (wx.onNeedPrivacyAuthorization) {
      wx.onNeedPrivacyAuthorization((resolve) => {
        this.globalData.resolvePrivacyAuthorization = resolve;
      });
    }
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (token) {
      this.globalData.token = token;
    }
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
    this.tryAutoLocateCity();
  },

  tryAutoLocateCity() {
    const loc = store.getCityLocation();
    if (loc.updatedAt) return;
    autoLocateCity({ silent: true, force: false }).catch(() => {});
  },

  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            wx.request({
              url: `${this.globalData.apiBaseUrl}/auth/wx-login`,
              method: 'POST',
              data: { code: res.code },
              success: (r) => {
                if (r.data && r.data.token) {
                  this.globalData.token = r.data.token;
                  this.globalData.userInfo = r.data.user;
                  wx.setStorageSync('token', r.data.token);
                  wx.setStorageSync('userInfo', r.data.user);
                  resolve(r.data);
                } else {
                  reject(new Error('登录失败'));
                }
              },
              fail: reject,
            });
          } else {
            reject(new Error('获取微信code失败'));
          }
        },
        fail: reject,
      });
    });
  },

  /** 手机号授权登录（button open-type=getPhoneNumber） */
  loginByPhone(phoneDetail = {}) {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (loginRes) => {
          if (!loginRes.code) {
            reject(new Error('获取微信登录凭证失败'));
            return;
          }

          const payload = {
            code: loginRes.code,
            phoneCode: phoneDetail.code || '',
            encryptedData: phoneDetail.encryptedData || '',
            iv: phoneDetail.iv || '',
          };

          wx.request({
            url: `${this.globalData.apiBaseUrl}/auth/wx-phone-login`,
            method: 'POST',
            data: payload,
            success: (r) => {
              if (r.statusCode === 200 && r.data && r.data.token) {
                this.globalData.token = r.data.token;
                this.globalData.userInfo = r.data.user;
                wx.setStorageSync('token', r.data.token);
                wx.setStorageSync('userInfo', r.data.user);
                resolve(r.data);
                return;
              }
              // 后端未就绪时走本地手机号授权登录
              resolve(this._localPhoneLogin(phoneDetail));
            },
            fail: () => {
              resolve(this._localPhoneLogin(phoneDetail));
            },
          });
        },
        fail: reject,
      });
    });
  },

  _localPhoneLogin(phoneDetail = {}) {
    const phone = phoneDetail.purePhoneNumber || phoneDetail.phoneNumber || '';
    const masked = phone
      ? `${phone.slice(0, 3)}****${phone.slice(-4)}`
      : '已授权手机号';
    const user = {
      id: `local_${Date.now()}`,
      nickname: '宠友',
      phone: phone || masked,
      phoneMasked: masked,
      avatarUrl: '',
      loginType: 'phone',
    };
    const token = `local_phone_${Date.now()}`;
    this.globalData.token = token;
    this.globalData.userInfo = user;
    wx.setStorageSync('token', token);
    wx.setStorageSync('userInfo', user);
    return { token, user };
  },

  logout() {
    this.globalData.token = null;
    this.globalData.userInfo = null;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
  },
});
