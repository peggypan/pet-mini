const store = require('./store');

function openEventPublishEntry() {
  wx.showActionSheet({
    itemList: ['个人发布活动', '商家发布活动'],
    success: (res) => {
      const role = res.tapIndex === 1 ? 'merchant' : 'personal';
      const qualify = store.getEventPublishQualify(role);
      const url = qualify.canPublish
        ? `/pages/event-publish/event-publish?role=${role}`
        : `/pages/event-qualify/event-qualify?role=${role}`;
      wx.navigateTo({ url });
    },
  });
}

module.exports = { openEventPublishEntry };
