const api = require('../../utils/request');
const { MOCK_PROVIDERS } = require('../../utils/mock');

Page({
  data: {
    categories: [
      { id: 1, name: '上门喂养' },
      { id: 2, name: '美容' },
      { id: 3, name: '体检' },
      { id: 4, name: '寄养' },
    ],
    currentCategory: 1,
    services: MOCK_PROVIDERS.slice(),
    isMock: true,
    page: 1,
    pageSize: 20,
    loading: false,
    hasMore: true,
  },

  onLoad(options) {
    if (options.categoryId) {
      this.setData({ currentCategory: Number(options.categoryId) });
    }
    this.loadServices(this.data.currentCategory);
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true, services: [] });
    this.loadServices(this.data.currentCategory).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 按分类分页加载服务；无数据时回退 Mock
   * @param {number|null} categoryId
   */
  async loadServices(categoryId) {
    if (this.data.loading || (!this.data.hasMore && this.data.page > 1 && !this.data.isMock)) return;

    this.setData({ loading: true });

    try {
      const res = await api.get('/services', {
        categoryId: categoryId || this.data.currentCategory || undefined,
        page: this.data.page,
        pageSize: this.data.pageSize,
      });

      const list = (res.data?.list || []).map((item) => ({
        ...item,
        merchantLogoUrl: item.merchant?.logoUrl || MOCK_PROVIDERS[0].merchantLogoUrl,
        merchantName: item.merchant?.name || item.name || '服务商',
        merchantRating: item.merchant?.rating || 5,
        subtitle: item.subtitle || item.name || '专业宠物服务，品质保障',
        coverUrls: item.coverUrls?.length ? item.coverUrls : [MOCK_PROVIDERS[0].coverUrls[0]],
      }));

      if (list.length) {
        this.setData({
          services: this.data.page === 1 ? list : [...this.data.services, ...list],
          hasMore: list.length === this.data.pageSize,
          page: this.data.page + 1,
          isMock: false,
        });
      } else if (this.data.page === 1) {
        this.setData({
          services: MOCK_PROVIDERS.slice(),
          hasMore: false,
          isMock: true,
        });
      } else {
        this.setData({ hasMore: false });
      }
    } catch (e) {
      console.error(e);
      if (this.data.page === 1) {
        this.setData({
          services: MOCK_PROVIDERS.slice(),
          hasMore: false,
          isMock: true,
        });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  onCategoryTap(e) {
    const { id } = e.currentTarget.dataset;
    const categoryId = Number(id);
    this.setData({ currentCategory: categoryId, page: 1, hasMore: true, services: [], isMock: false });
    this.loadServices(categoryId);
  },

  onServiceTap(e) {
    const { id } = e.currentTarget.dataset;
    if (String(id).indexOf('mock-') === 0) {
      wx.showToast({ title: '示例服务商', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${id}` });
  },

  onQuickBook() {
    const first = this.data.services[0];
    if (first && String(first.id).indexOf('mock-') !== 0) {
      wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${first.id}` });
    } else {
      wx.showToast({ title: '示例预约入口', icon: 'none' });
    }
  },

  onMapView() {
    wx.showToast({ title: '地图模式开发中', icon: 'none' });
  },

  onReachBottom() {
    this.loadServices();
  },
});
