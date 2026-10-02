const { MOCK_HOME, RISK_TIPS } = require('../../utils/mock');
const { buildEventHomeCards } = require('../../utils/event-home-card');
const { buildBuddyPlazaCard } = require('../../utils/buddy-plaza-card');
const { appendFeedItems, resetFeed } = require('../../utils/buddy-plaza-feed');
const { listAllBuddies, listAllEvents } = require('../../utils/catalog');
const EVENT_INITIAL = 5;
const EVENT_STEP = 5;
const store = require('../../utils/store');
const { autoLocateCity } = require('../../utils/city-location');
const { requirePetProfile } = require('../../utils/pet-profile-guard');
Page({
  data: {
    city: '北京',
    cityAuto: false,
    showCityPicker: false,
    banners: MOCK_HOME.banners,
    tiles: MOCK_HOME.featureTiles,
    buddyPlaza: [],
    buddyHasMore: false,
    events: [],
    eventHasMore: false,
    riskTip: RISK_TIPS.meet,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    const loc = store.getCityLocation();
    this._allEventCards = buildEventHomeCards(listAllEvents());
    this._buddySource = listAllBuddies().filter((b) => b.zone !== 'match');
    const buddyFeed = resetFeed(this._buddySource, buildBuddyPlazaCard);
    this.setData({
      city: loc.city || '北京',
      cityAuto: !!loc.auto,
      buddyPlaza: buddyFeed.list,
      buddyHasMore: buddyFeed.hasMore,
    });
    this.applyEventSlice(EVENT_INITIAL);
  },

  onLoadMoreBuddy() {
    if (!this.data.buddyHasMore) return;
    const next = appendFeedItems(this._buddySource, this.data.buddyPlaza, buildBuddyPlazaCard);
    this.setData({
      buddyPlaza: next.list,
      buddyHasMore: next.hasMore,
    });
  },

  applyEventSlice(count) {
    const all = this._allEventCards || buildEventHomeCards(listAllEvents());
    this._allEventCards = all;
    const shown = Math.min(count, all.length);
    this.setData({
      events: all.slice(0, shown),
      eventHasMore: all.length > shown,
    });
    this._eventShown = shown;
  },

  onReachBottom() {
    if (this.data.buddyHasMore) {
      this.onLoadMoreBuddy();
      return;
    }
    if (!this.data.eventHasMore) return;
    const next = (this._eventShown || EVENT_INITIAL) + EVENT_STEP;
    this.applyEventSlice(next);
  },

  onLoadMoreEvents() {
    if (!this.data.eventHasMore) return;
    const next = (this._eventShown || EVENT_INITIAL) + EVENT_STEP;
    this.applyEventSlice(next);
  },

  onMoreEvents() {
    if (!requirePetProfile()) return;
    wx.setStorageSync('local_tab', 'event');
    wx.navigateTo({ url: '/pages/local/local' });
  },

  onBannerTap(e) {
    const id = e.currentTarget.dataset.id;
    const banner = (this.data.banners || []).find((b) => b.id === id);
    const url = banner && banner.url;
    if (!url) {
      wx.showToast({ title: '暂无详情页', icon: 'none' });
      return;
    }
    if (
      banner.type === 'mapPointsCampaign'
      || url.includes('map-submit')
      || url.includes('friendly-map')
    ) {
      if (!requirePetProfile()) return;
    }
    if (url.includes('local/local')) {
      wx.setStorageSync('local_tab', 'map');
    }
    wx.navigateTo({
      url,
      fail: () => wx.showToast({ title: '打开失败', icon: 'none' }),
    });
  },

  onSearch() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  onCityTap() {
    wx.navigateTo({ url: '/pages/city-picker/city-picker' });
  },

  onQuickLocate() {
    autoLocateCity({ silent: false, force: true })
      .then((loc) => {
        this.setData({ city: loc.city, cityAuto: true });
      })
      .catch(() => {});
  },

  onFeatureTap(e) {
    if (!requirePetProfile()) return;
    const id = e.currentTarget.dataset.id;
    const item = this.data.tiles[id];
    if (!item) return;
    if (item.id === 'map') wx.setStorageSync('local_tab', 'map');
    wx.navigateTo({ url: item.path });
  },

  onEventTap(e) {
    if (!requirePetProfile()) return;
    wx.navigateTo({ url: `/pages/event-detail/event-detail?id=${e.currentTarget.dataset.id}` });
  },

  onBuddyTap(e) {
    if (!requirePetProfile()) return;
    wx.navigateTo({ url: `/pages/buddy-detail/buddy-detail?id=${e.currentTarget.dataset.id}` });
  },

  onPreviewCover(e) {
    const { id } = e.currentTarget.dataset;
    const item = (this.data.buddyPlaza || []).find((b) => String(b.id) === String(id));
    if (!item) return;
    if (item.coverIsVideo) {
      if (!item.coverVideoUrl || item.coverVideoUrl === item.coverPoster) {
        wx.showToast({ title: '演示视频暂不可播放', icon: 'none' });
        return;
      }
      wx.previewMedia({
        sources: [{ url: item.coverVideoUrl, type: 'video', poster: item.coverPoster || item.cover || '' }],
      });
      return;
    }
    if (item.cover) {
      wx.previewImage({ urls: [item.cover], current: item.cover });
    }
  },

  onMoreBuddy() {
    if (!requirePetProfile()) return;
    wx.navigateTo({ url: '/pages/buddy/buddy' });
  },

});
