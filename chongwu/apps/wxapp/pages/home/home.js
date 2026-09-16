const { MOCK_HOME, MOCK_BUDDY, MOCK_SOCIAL, MOCK_EVENTS, RISK_TIPS } = require('../../utils/mock');
const { buildEventHomeCards } = require('../../utils/event-home-card');
const { listAllBuddies } = require('../../utils/catalog');
const store = require('../../utils/store');
const { buildFeaturedCommunities } = require('../../utils/circle-community');
const { autoLocateCity } = require('../../utils/city-location');

Page({
  data: {
    city: '北京',
    cityAuto: false,
    showCityPicker: false,
    banners: MOCK_HOME.banners,
    tiles: MOCK_HOME.featureTiles,
    buddies: [],
    events: buildEventHomeCards(MOCK_EVENTS.slice(0, 3)),
    featuredCommunities: [],
    riskTip: RISK_TIPS.meet,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    const loc = store.getCityLocation();
    this.setData({
      city: loc.city || '北京',
      cityAuto: !!loc.auto,
      buddies: listAllBuddies().slice(0, 3),
      featuredCommunities: buildFeaturedCommunities((id) => store.getCircleLastMessage(id)).slice(0, 2),
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
    const id = e.currentTarget.dataset.id;
    const item = this.data.tiles[id];
    if (!item) return;
    if (item.id === 'map') wx.setStorageSync('local_tab', 'map');
    wx.navigateTo({ url: item.path });
  },

  onBuddyTap(e) {
    wx.navigateTo({ url: `/pages/buddy-detail/buddy-detail?id=${e.currentTarget.dataset.id}` });
  },

  onEventTap(e) {
    wx.navigateTo({ url: `/pages/event-detail/event-detail?id=${e.currentTarget.dataset.id}` });
  },

  onEnterCommunity(e) {
    wx.navigateTo({ url: `/pages/circle-community/circle-community?id=${e.currentTarget.dataset.id}` });
  },

  onMoreBuddy() {
    wx.navigateTo({ url: '/pages/buddy/buddy' });
  },

  onMoreSocial() {
    wx.setStorageSync('social_tab', 'featured');
    wx.switchTab({ url: '/pages/social/social' });
  },
});
