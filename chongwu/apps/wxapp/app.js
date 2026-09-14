const { autoLocateCity } = require('./utils/city-location');
const store = require('./utils/store');

App({
  globalData: {
    apiBaseUrl: 'http://localhost:3000/api/v1',
    token: null,
    userInfo: null,
    resolvePrivacyAuthorization: null,
    privacyAccepted: false,
  },

  /** 隐私同意（须与触发授权的 button id 一致） */
  handlePrivacyAgree(buttonId = 'agree-privacy-btn') {
    const sysResolve = this.globalData.resolvePrivacyAuthorization;
    if (typeof sysResolve === 'function') {
      sysResolve({ event: 'agree', buttonId });
      this.globalData.resolvePrivacyAuthorization = null;
    }
    this.globalData.privacyAccepted = true;
  },

  agreePrivacyAuthorization() {
    this.handlePrivacyAgree();
  },

  onLaunch() {
    // 不在此注册 wx.onNeedPrivacyAuthorization：只存 resolve 不弹窗会卡住 getPhoneNumber，无法出现微信手机号授权窗
    if (wx.getPrivacySetting) {
      wx.getPrivacySetting({
        success: (res) => {
          this.globalData.privacyAccepted = !res.needAuthorization;
        },
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

  /** 微信 code 登录（演示，不依赖手机号能力） */
  loginByWechat() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (!res.code) {
            reject(new Error('获取微信登录凭证失败'));
            return;
          }
          resolve(this._localWechatLogin(res.code));
        },
        fail: () => reject(new Error('微信登录失败')),
      });
    });
  },

  _localWechatLogin(wxCode) {
    const suffix = String(wxCode || '').slice(-6) || `${Date.now()}`.slice(-6);
    const user = {
      id: `wx_${suffix}`,
      nickname: '宠友',
      phone: '',
      phoneMasked: '微信用户',
      avatarUrl: '',
      loginType: 'wechat',
    };
    const token = `local_wx_${Date.now()}`;
    this.globalData.token = token;
    this.globalData.userInfo = user;
    wx.setStorageSync('token', token);
    wx.setStorageSync('userInfo', user);
    return { token, user };
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

          let settled = false;
          const finishLocal = () => {
            if (settled) return;
            settled = true;
            resolve(this._localPhoneLogin(phoneDetail));
          };

          wx.request({
            url: `${this.globalData.apiBaseUrl}/auth/wx-phone-login`,
            method: 'POST',
            data: payload,
            timeout: 4000,
            success: (r) => {
              if (r.statusCode === 200 && r.data && r.data.token) {
                settled = true;
                this.globalData.token = r.data.token;
                this.globalData.userInfo = r.data.user;
                wx.setStorageSync('token', r.data.token);
                wx.setStorageSync('userInfo', r.data.user);
                resolve(r.data);
                return;
              }
              finishLocal();
            },
            fail: finishLocal,
          });
          setTimeout(finishLocal, 4500);
        },
        fail: reject,
      });
    });
  },

  _localPhoneLogin(phoneDetail = {}) {
    const phone = phoneDetail.purePhoneNumber || phoneDetail.phoneNumber || '';
    const hasPhoneCode = !!phoneDetail.code;
    const masked = phone
      ? `${phone.slice(0, 3)}****${phone.slice(-4)}`
      : (hasPhoneCode ? '手机号已授权' : '已授权手机号');
    const suffix = (phone && phone.slice(-4)) || String(phoneDetail.code || '').slice(-4) || '0000';
    const user = {
      id: `local_${suffix}_${Date.now()}`,
      nickname: phone ? `宠友${suffix}` : '宠友',
      phone: phone || masked,
      phoneMasked: masked,
      avatarUrl: '',
      loginType: hasPhoneCode ? 'phone_code' : 'phone',
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
