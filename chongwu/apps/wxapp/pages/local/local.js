const { MOCK_EVENTS, MOCK_MERCHANTS, RISK_TIPS } = require('../../utils/mock');
const { listAllMapPoints } = require('../../utils/catalog');
const store = require('../../utils/store');
const { openEventPublishEntry } = require('../../utils/event-publish-nav');
const { buildHelpPosts } = require('../../utils/local-help-list');
const amap = require('../../utils/amap');

Page({
  data: {
    tab: 'event',
    tabs: [
      { id: 'event', name: '活动' },
      { id: 'map', name: '友好地图' },
      { id: 'service', name: '本地服务' },
    ],
    events: MOCK_EVENTS,
    mapPoints: [],
    helpPosts: [],
    helpTip: RISK_TIPS.help,
    merchants: MOCK_MERCHANTS,
    mapFilter: 'all',
    city: '北京',
    mapLatitude: 39.9042,
    mapLongitude: 116.4074,
    mapMarkers: [],
    amapReady: false,
  },

  onLoad(options) {
    if (options.tab) this.setData({ tab: this.normalizeTab(options.tab) });
  },

  normalizeTab(tab) {
    if (tab === 'merchant' || tab === 'help') return 'service';
    return tab;
  },

  onShow() {
    const pendingTab = wx.getStorageSync('local_tab');
    if (pendingTab) {
      wx.removeStorageSync('local_tab');
      this.setData({ tab: this.normalizeTab(pendingTab) });
    }
    const city = store.getCity();
    this.setData({
      city,
      amapReady: amap.isAmapConfigured(),
      helpPosts: buildHelpPosts(),
    });
    this.loadMapPreview(city);
  },

  async loadMapPreview(city) {
    const raw = listAllMapPoints();
    const points = await amap.enrichPointsWithCoords(raw, city);
    const loc = store.getCityLocation();
    this.setData({
      mapPoints: points,
      mapMarkers: amap.buildMapMarkers(points.slice(0, 8)),
      mapLatitude: loc.lat || 39.9042,
      mapLongitude: loc.lng || 116.4074,
    });
  },

  onCityTap() {
    wx.navigateTo({ url: '/pages/city-picker/city-picker' });
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.id });
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

  onMapSubmit() {
    wx.navigateTo({ url: '/pages/map-submit/map-submit' });
  },

  onOpenFullMap() {
    wx.navigateTo({ url: '/pages/friendly-map/friendly-map' });
  },

  onNavMap(e) {
    const id = e.currentTarget.dataset.id;
    const point = this.data.mapPoints.find((p) => String(p.id) === String(id));
    if (!point) return;
    if (point.latitude && point.longitude) {
      amap.openNavigation({
        lat: point.latitude,
        lng: point.longitude,
        name: point.name,
        address: point.address,
      });
      return;
    }
    wx.showToast({ title: '该点位暂无坐标', icon: 'none' });
  },

  onPublishHelp() {
    wx.showModal({
      title: '风险提示',
      content: this.data.helpTip,
      confirmText: '继续发布',
      success: (res) => {
        if (res.confirm) wx.navigateTo({ url: '/pages/help-publish/help-publish' });
      },
    });
  },

  onHelpPostTap(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.helpPosts.find((x) => x.id === id);
    if (!item) return;
    const lines = [item.desc || item.preview, item.contact ? '联系：' + item.contact : ''].filter(Boolean);
    wx.showModal({
      title: item.title,
      content: lines.join('\n\n'),
      showCancel: false,
    });
  },

  onMerchantTap(e) {
    wx.navigateTo({ url: `/pages/merchant-detail/merchant-detail?id=${e.currentTarget.dataset.id}` });
  },
});
