const { searchAll } = require('../../utils/global-search');

const TAB_DEF = [
  { id: 'all', name: '全部' },
  { id: 'buddy', name: '搭子' },
  { id: 'event', name: '活动' },
  { id: 'point', name: '点位' },
  { id: 'merchant', name: '商家' },
];

Page({
  data: {
    keyword: '',
    focusInput: true,
    activeTab: 'all',
    tabs: TAB_DEF.map((t) => ({ ...t, count: '' })),
    results: { buddies: [], events: [], points: [], merchants: [] },
    hasAnyResult: false,
    hotWords: ['遛狗', '朝阳公园', '猫咖', '洗护', '露营', '友好餐厅'],
  },

  onLoad(options) {
    const keyword = decodeURIComponent(options.keyword || '');
    if (keyword) {
      this.setData({ keyword, focusInput: false });
      this.runSearch(keyword);
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
      wx.navigateTo({ url: `/pages/merchant-detail/merchant-detail?id=${id}` });
    }
  },
});
