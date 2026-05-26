const api = require('../../utils/request');

Page({
  data: {
    categories: [],
    currentCategory: 0,
    services: [],
    page: 1,
    pageSize: 20,
    loading: false,
    hasMore: true,
  },

  onLoad(options) {
    this.loadCategories();
    this.loadServices(options.categoryId);
    if (options.categoryId) {
      this.setData({ currentCategory: Number(options.categoryId) });
    }
  },

  async loadCategories() {
    try {
      const res = await api.get('/services/categories');
      this.setData({ categories: [{ id: 0, name: '全部' }, ...(res.data || [])] });
    } catch (e) {
      console.error(e);
    }
  },

  async loadServices(categoryId) {
    if (this.data.loading || !this.data.hasMore) return;
    
    this.setData({ loading: true });
    
    try {
      const res = await api.get('/services', {
        categoryId: categoryId || this.data.currentCategory || undefined,
        page: this.data.page,
        pageSize: this.data.pageSize,
      });
      
      const list = res.data?.list || [];
      this.setData({
        services: this.data.page === 1 ? list : [...this.data.services, ...list],
        hasMore: list.length === this.data.pageSize,
        page: this.data.page + 1,
      });
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ loading: false });
    }
  },

  onCategoryTap(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ currentCategory: id, page: 1, hasMore: true, services: [] });
    this.loadServices(id);
  },

  onServiceTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${id}` });
  },

  onReachBottom() {
    this.loadServices();
  },
});
