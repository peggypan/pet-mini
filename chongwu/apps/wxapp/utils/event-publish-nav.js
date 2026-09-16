function openEventPublishEntry() {
  wx.showActionSheet({
    itemList: ['个人发布活动', '商家发布活动'],
    success: (res) => {
      const role = res.tapIndex === 1 ? 'merchant' : 'personal';
      wx.navigateTo({ url: `/pages/event-publish/event-publish?role=${role}` });
    },
  });
}

module.exports = { openEventPublishEntry };
