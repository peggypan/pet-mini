const { searchAll } = require('../../utils/global-search');
const amap = require('../../utils/amap');
const store = require('../../utils/store');
const cloudApi = require('../../utils/cloud-api');
const { refreshMerchantsFromCloud } = require('../../utils/merchant-cloud-sync');
const featurePages = require('../../config/feature-pages');

function buildTabDef() {
  const tabs = [
    { id: 'all', name: '全部' },
    { id: 'buddy', name: '搭子' },
    { id: 'event', name: '活动' },
    { id: 'point', name: '点位' },
  ];
  if (featurePages.merchantSearch) {
    tabs.push({ id: 'merchant', name: '商家' });
  }
  return tabs;
}

const TAB_DEF = buildTabDef();

Page({
  data: {
    keyword: '',
    focusInput: true,
    activeTab: 'all',
    tabs: TAB_DEF.map((t) => ({ ...t, count: '' })),
    results: { buddies: [], events: [], points: [], merchants: [] },
    hasAnyResult: false,
    hotWords: ['遛狗', '朝阳公园', '猫咖', '洗护', '露营', '友好餐厅'],
    merchantSearch: featurePages.merchantSearch,
  },

  onLoad(options) {
    const keyword = decodeURIComponent(options.keyword || '');
    if (keyword) {
      this.setData({ keyword, focusInput: false });
      this.runSearch(keyword);
    }
    if (featurePages.merchantSearch && cloudApi.cloudEnabled()) {
      refreshMerchantsFromCloud({ city: store.getCity(), limit: 80 }).catch(() => {});
    }
  },

  onInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });
    this.runSearch(keyword);
  },

  onSearch(e) {
    const keyword = (e.detail.value || this.data.keyword || '').trim();
    this.setData({ keyword });
    this.runSearch(keyword);
  },

  onClear() {
    this.setData({ keyword: '', activeTab: 'all', hasAnyResult: false, focusInput: true });
    this.runSearch('');
  },

  onHotWord(e) {
    const keyword = e.currentTarget.dataset.word;
    this.setData({ keyword, focusInput: false });
    this.runSearch(keyword);
  },

  onTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.id });
  },

  runSearch(keyword) {
    const results = searchAll(keyword.trim());
    if (!featurePages.merchantSearch) {
      results.merchants = [];
    }
    const hasAnyResult = !!(
      results.buddies.length
      || results.events.length
      || results.points.length
      || results.merchants.length
    );
    const tabs = TAB_DEF.map((t) => {
      if (t.id === 'all') return { ...t, count: hasAnyResult ? '' : '' };
      const map = {
        buddy: results.buddies.length,
        event: results.events.length,
        point: results.points.length,
        merchant: results.merchants.length,
      };
      const n = map[t.id] || 0;
      return { ...t, count: n ? n : '' };
    });
    this.setData({ results, hasAnyResult, tabs, activeTab: this.data.activeTab || 'all' });
  },

  onOpenPlace(e) {
    amap.openPlaceFromTap(e);
  },

  onResultTap(e) {
    const { type, id } = e.currentTarget.dataset;
    if (type === 'buddy') {
      wx.navigateTo({ url: `/pages/buddy-detail/buddy-detail?id=${id}` });
      return;
    }
    if (type === 'event') {
      wx.navigateTo({ url: `/pages/event-detail/event-detail?id=${id}` });
      return;
    }
    if (type === 'point') {
      wx.setStorageSync('local_tab', 'map');
      wx.navigateTo({ url: '/pages/friendly-map/friendly-map' });
      return;
    }
    if (type === 'merchant') {
      wx.showToast({ title: '商家功能即将上线', icon: 'none' });
    }
  },
});
