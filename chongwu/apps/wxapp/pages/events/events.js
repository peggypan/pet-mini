const { MOCK_EVENTS } = require('../../utils/mock');
const store = require('../../utils/store');
const { openEventPublishEntry } = require('../../utils/event-publish-nav');

Page({
  data: {
    city: '北京',
    events: MOCK_EVENTS,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.setData({ city: store.getCity() });
  },

  onCityTap() {
    wx.navigateTo({ url: '/pages/city-picker/city-picker' });
  },

  onEventTap(e) {
    wx.navigateTo({ url: `/pages/event-detail/event-detail?id=${e.currentTarget.dataset.id}` });
  },

  onPublishEvent() {
    openEventPublishEntry();
  },

  onMyEvents() {
    wx.navigateTo({ url: '/pages/my-events/my-events' });
  },
});
