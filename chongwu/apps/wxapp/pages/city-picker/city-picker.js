const store = require('../../utils/store');
const { HOT_CITIES, PROVINCE_CITIES, searchCities } = require('../../utils/china-cities');
const { autoLocateCity, pickCity } = require('../../utils/city-location');

Page({
  data: {
    keyword: '',
    hotCities: HOT_CITIES,
    provinceGroups: PROVINCE_CITIES,
    searchResults: [],
    isSearching: false,
    locating: false,
    currentCity: '',
  },

  onLoad() {
    this.setData({ currentCity: store.getCity() });
  },

  onSearchInput(e) {
    const keyword = e.detail.value || '';
    const isSearching = !!keyword.trim();
    this.setData({
      keyword,
      isSearching,
      searchResults: isSearching ? searchCities(keyword) : [],
    });
  },

  onClearSearch() {
    this.setData({ keyword: '', isSearching: false, searchResults: [] });
  },

  onAutoLocate() {
    if (this.data.locating) return;
    this.setData({ locating: true });
    autoLocateCity({ silent: false, force: true })
      .then((loc) => {
        this.finishPick(loc.city);
      })
      .catch(() => {
        wx.showToast({ title: '识别失败，请手动选择', icon: 'none' });
      })
      .finally(() => {
        this.setData({ locating: false });
      });
  },

  onPickCity(e) {
    const city = e.currentTarget.dataset.city;
    if (!city) return;
    pickCity(city);
    this.finishPick(city);
  },

  finishPick(city) {
    wx.showToast({ title: `已切换至${city}`, icon: 'success' });
    setTimeout(() => {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.switchTab({ url: '/pages/home/home' });
      }
    }, 500);
  },
});
