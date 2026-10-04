const { listAllEvents } = require('../../utils/catalog');
const { mapEventsForPlaza } = require('../../utils/event-plaza');
const { RISK_TIPS } = require('../../utils/mock');
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
const { syncPetProfileGate, requireInteract } = require('../../utils/pet-profile-guard');
const { requireLogin } = require('../../utils/require-login');
const cloudApi = require('../../utils/cloud-api');
const { refreshEventsFeedFromCloud } = require('../../utils/event-cloud-sync');
const { refreshMapPointsFromCloud } = require('../../utils/map-point-cloud-sync');

Page({
  data: {
    tab: 'event',
    tabs: [
      { id: 'event', name: '活动' },
      { id: 'map', name: '友好地图' },
    ],
    events: [],
    plazaFilter: 'all',
    healingEventTip: RISK_TIPS.healingEvent,
    mapPoints: [],
    petFilter: '',
    petFilterLabel: '',
    fabOpen: false,
    city: '北京',
    mapLatitude: 39.9042,
    mapLongitude: 116.4074,
    mapMarkers: [],
    amapReady: false,
    petProfileBlocked: false,
  },

  onLoad(options) {
    if (options.tab) this.setData({ tab: this.normalizeTab(options.tab) });
  },

  normalizeTab(tab) {
    return tab === 'map' ? 'map' : 'event';
  },

  onShow() {
    syncPetProfileGate(this);
    const pendingTab = wx.getStorageSync('local_tab');
    if (pendingTab) {
      wx.removeStorageSync('local_tab');
      this.setData({ tab: this.normalizeTab(pendingTab) });
    }
    const city = store.getCity();
    this.setData({ city, amapReady: amap.isAmapConfigured() }, () => {
      this.applyPlazaEvents();
    });
    this.loadMapPreview(city).catch(() => {});
    if (cloudApi.cloudEnabled()) {
      this.refreshLocalInBackground(city);
    }
  },

  refreshLocalInBackground(city) {
    if (this._localRefreshPromise) return this._localRefreshPromise;
    this._localRefreshPromise = (async () => {
      try {
        await Promise.all([
          refreshEventsFeedFromCloud({ limit: 80 }),
          refreshMapPointsFromCloud({ limit: 120, city }),
        ]);
        this.applyPlazaEvents();
        await this.loadMapPreview(city);
      } catch (e) {
        // keep cache
      } finally {
        this._localRefreshPromise = null;
      }
    })();
    return this._localRefreshPromise;
  },

  applyPlazaEvents() {
    const events = mapEventsForPlaza(listAllEvents(), this.data.plazaFilter);
    this.setData({ events });
  },

  onPlazaFilter(e) {
    const plazaFilter = e.currentTarget.dataset.id;
    this.setData({ plazaFilter }, () => this.applyPlazaEvents());
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

  onMapSubmit() {
    if (!requireInteract()) return;
    wx.navigateTo({ url: '/pages/map-submit/map-submit' });
  },

  onOpenFullMap() {
    wx.navigateTo({ url: '/pages/friendly-map/friendly-map' });
  },

  onNavMap(e) {
    const id = e.currentTarget.dataset.id;
    const point = this.data.mapPoints.find((p) => String(p.id) === String(id));
    if (!point) return;
    amap.openPlace(point);
  },
});
