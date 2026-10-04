const { listAllEvents } = require('../../utils/catalog');
const { mapEventsForPlaza } = require('../../utils/event-plaza');
const { RISK_TIPS } = require('../../utils/mock');
const store = require('../../utils/store');
const { openEventPublishEntry } = require('../../utils/event-publish-nav');
const amap = require('../../utils/amap');
const { requireLogin } = require('../../utils/require-login');
const cloudApi = require('../../utils/cloud-api');
const { refreshEventsFeedFromCloud } = require('../../utils/event-cloud-sync');

Page({
  data: {
    city: '北京',
    events: [],
    plazaFilter: 'all',
    eventSafetyTip: RISK_TIPS.event,
    healingEventTip: RISK_TIPS.healingEvent,
  },

  applyPlazaEvents() {
    const events = mapEventsForPlaza(listAllEvents(), this.data.plazaFilter);
    this.setData({ events });
  },

  onPlazaFilter(e) {
    const plazaFilter = e.currentTarget.dataset.id;
    this.setData({ plazaFilter }, () => this.applyPlazaEvents());
  },

  async onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    if (cloudApi.cloudEnabled()) {
      await refreshEventsFeedFromCloud({ limit: 80 });
    }
    this.setData({ city: store.getCity() }, () => this.applyPlazaEvents());
  },

  onCityTap() {
    wx.navigateTo({ url: '/pages/city-picker/city-picker' });
  },

  onEventTap(e) {
    wx.navigateTo({ url: `/pages/event-detail/event-detail?id=${e.currentTarget.dataset.id}` });
  },

  onOpenPlace(e) {
    amap.openPlaceFromTap(e);
  },

  onPublishEvent() {
    openEventPublishEntry();
  },

  onMyEvents() {
    if (!requireLogin()) return;
    wx.navigateTo({ url: '/pages/my-events/my-events' });
  },
});
