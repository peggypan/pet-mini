const api = require('../../utils/request');
const { MOCK_IDLE_ITEMS, MOCK_HELP_CARDS } = require('../../utils/mock');
const store = require('../../utils/store');
const { enrichIdle } = require('../../utils/catalog');

const CONDITION_MAP = ['全新', '九成新', '轻微使用', '明显使用'];
const ICON_POOL = ['👕', '☕', '📦', '🦴', '🎾', '🧴', '🏠', '💊'];

Page({
  data: {
    modes: [
      { id: 'gift', name: '免费赠送' },
      { id: 'swap', name: '交换' },
      { id: 'sell', name: '出售' },
    ],
    currentMode: 'gift',
    currentCategory: null,
    items: [],
    isMock: true,
    page: 1,
    pageSize: 20,
    loading: false,
    hasMore: true,
    helpCards: MOCK_HELP_CARDS.slice(),
  },

  onLoad() {
    this.loadItems(true);
  },

  onShow() {
    this.loadItems(true);
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  onPullDownRefresh() {
    this.loadItems(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  buildMockList() {
    const local = store.listLocalIdleItems().map((x) => enrichIdle(x));
    const mockItems = MOCK_IDLE_ITEMS.map((item) => {
      let conditionText = item.conditionText;
      if (this.data.currentMode === 'gift') conditionText = item.price === 0 ? '免费赠送' : '九成新';
      if (this.data.currentMode === 'swap') conditionText = '可交换';
      if (this.data.currentMode === 'sell') conditionText = item.conditionText;
      return enrichIdle({ ...item, conditionText });
    });
    return [...local, ...mockItems];
  },

  async loadItems(reset = false) {
    if (this.data.loading) return;
    if (!reset && !this.data.hasMore && !this.data.isMock) return;

    if (reset) {
      this.setData({ page: 1, hasMore: true, items: [], isMock: false });
    }

    this.setData({ loading: true });

    try {
      const res = await api.get('/idle', {
        categoryId: this.data.currentCategory || undefined,
        page: this.data.page,
        pageSize: this.data.pageSize,
      });

      const list = (res.data?.list || []).map((item, index) => {
        const level = item.conditionLevel || 2;
        let conditionText = CONDITION_MAP[level - 1] || '九成新';
        if (this.data.currentMode === 'gift' && Number(item.price) === 0) {
          conditionText = '免费赠送';
        } else if (this.data.currentMode === 'swap') {
          conditionText = '可交换';
        }

        return enrichIdle({
          ...item,
          conditionText,
          displayIcon: ICON_POOL[(item.id || index) % ICON_POOL.length],
        });
      });

      if (list.length) {
        const local = store.listLocalIdleItems().map((x) => enrichIdle(x));
        const merged = this.data.page === 1 ? [...local, ...list] : [...this.data.items, ...list];
        this.setData({
          items: merged,
          hasMore: list.length === this.data.pageSize,
          page: this.data.page + 1,
          isMock: false,
        });
      } else if (this.data.page === 1) {
        this.setData({
          items: this.buildMockList(),
          hasMore: false,
          isMock: true,
        });
      } else {
        this.setData({ hasMore: false });
      }
    } catch (e) {
      if (this.data.page === 1) {
        this.setData({
          items: this.buildMockList(),
          hasMore: false,
          isMock: true,
        });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  onModeTap(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ currentMode: id });
    this.loadItems(true);
  },

  onItemTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/idle-detail/idle-detail?id=${id}` });
  },

  onPublishTap() {
    wx.navigateTo({ url: '/pages/idle-publish/idle-publish' });
  },

  onReachBottom() {
    this.loadItems();
  },
});
