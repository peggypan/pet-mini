const { MOCK_EVENTS } = require('../../utils/mock');
const { listAllMapPoints } = require('../../utils/catalog');
const store = require('../../utils/store');
const { openEventPublishEntry } = require('../../utils/event-publish-nav');
const amap = require('../../utils/amap');
const {
  filterPointsByPetSentiment,
  getPetFabLabel,
  PET_FAB_ITEMS,
} = require('../../utils/map-pet-filter');
const { collectPetServicePOIs, mergeMapPoints } = require('../../utils/map-pet-poi-collector');

Page({
  data: {
    tab: 'event',
    tabs: [
      { id: 'event', name: '活动' },
      { id: 'map', name: '友好地图' },
    ],
    events: MOCK_EVENTS,
    mapPoints: [],
    petFilter: '',
    petFilterLabel: '',
    fabOpen: false,
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
    return tab === 'map' ? 'map' : 'event';
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
    });
    this.loadMapPreview(city);
  },

  async loadMapPreview(city) {
    const raw = listAllMapPoints();
    let points = await amap.enrichPointsWithCoords(raw, city);
    const loc = store.getCityLocation();
    const latitude = loc.lat || this.data.mapLatitude;
    const longitude = loc.lng || this.data.mapLongitude;
    const collected = await collectPetServicePOIs({ city, latitude, longitude });
    points = mergeMapPoints(points, collected);
    this._allMapPoints = points;
    this.applyMapPointFilter(this.data.petFilter, points, loc);
  },

  applyMapPointFilter(petFilter, allPoints, loc) {
    const all = allPoints || this._allMapPoints || [];
    const filtered = filterPointsByPetSentiment(all, petFilter);
    const location = loc || store.getCityLocation();
    const item = PET_FAB_ITEMS.find((i) => i.id === petFilter);
    this.setData({
      mapPoints: filtered,
      mapMarkers: amap.buildMapMarkers(filtered.slice(0, 8)),
      mapLatitude: location.lat || 39.9042,
      mapLongitude: location.lng || 116.4074,
      petFilter: petFilter || '',
      petFilterLabel: item ? item.name : getPetFabLabel(petFilter),
    });
  },

  onFabToggle() {
    this.setData({ fabOpen: !this.data.fabOpen });
  },

  onPetFabChange(e) {
    const petFilter = e.detail.value || '';
    this.setData({ fabOpen: false });
    this.applyMapPointFilter(petFilter);
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
});
