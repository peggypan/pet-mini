const amap = require('./amap');
const { openEventPublishEntry } = require('./event-publish-nav');

function chooseLocationPoint() {
  return amap.choosePoint().catch((err) => {
    if (err.errMsg && err.errMsg.includes('cancel')) return Promise.reject(err);
    if (err.errMsg && err.errMsg.includes('auth deny')) {
      wx.showModal({
        title: '需要位置权限',
        content: '发送位置需要授权，请在设置中开启',
        confirmText: '去设置',
        success: (r) => { if (r.confirm) wx.openSetting(); },
      });
    }
    return Promise.reject(err);
  });
}

function pickAaAmount() {
  return new Promise((resolve, reject) => {
    wx.showActionSheet({
      itemList: ['AA ¥30（2人）', 'AA ¥60（3人）', 'AA ¥100（4人）'],
      success: (res) => {
        const presets = [
          { total: 30, people: 2 },
          { total: 60, people: 3 },
          { total: 100, people: 4 },
        ];
        const p = presets[res.tapIndex];
        if (!p) {
          reject(new Error('cancel'));
          return;
        }
        resolve({
          aaAmount: p.total,
          aaPeople: p.people,
          aaPer: Math.ceil((p.total / p.people) * 100) / 100,
        });
      },
      fail: reject,
    });
  });
}

function openActivityShare(onPickEvent) {
  if (typeof onPickEvent === 'function') {
    onPickEvent();
    return;
  }
  openEventPublishEntry();
}

function locationSnippet(loc) {
  const name = loc.name || loc.address || '位置';
  return name;
}

module.exports = {
  chooseLocationPoint,
  pickAaAmount,
  openActivityShare,
  locationSnippet,
};
