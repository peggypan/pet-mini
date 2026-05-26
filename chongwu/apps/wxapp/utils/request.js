const app = getApp();

const request = (options) => {
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      url: `${app.globalData.apiBaseUrl}${options.url}`,
      header: {
        'Content-Type': 'application/json',
        'Authorization': app.globalData.token ? `Bearer ${app.globalData.token}` : '',
        ...options.header,
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          app.globalData.token = null;
          wx.showToast({ title: '请重新登录', icon: 'none' });
          reject(res);
        } else {
          wx.showToast({ title: res.data?.message || '请求失败', icon: 'none' });
          reject(res);
        }
      },
      fail: reject,
    });
  });
};

module.exports = {
  get: (url, data) => request({ url, method: 'GET', data }),
  post: (url, data) => request({ url, method: 'POST', data }),
  put: (url, data) => request({ url, method: 'PUT', data }),
  del: (url) => request({ url, method: 'DELETE' }),
};
