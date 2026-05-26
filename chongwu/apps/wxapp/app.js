App({
  globalData: {
    apiBaseUrl: 'http://localhost:3000/api/v1',
    token: null,
    userInfo: null,
  },

  onLaunch() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
    }
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
});
