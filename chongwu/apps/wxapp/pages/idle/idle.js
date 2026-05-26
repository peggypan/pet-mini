const api = require('../../utils/request');

Page({
  data: {
    categories: [],
    currentCategory: 0,
    items: [],
    page: 1,
    pageSize: 20,
    loading: false,
    hasMore: true,
  },

  onLoad() {
    this.loadCategories();
    this.loadItems();
  },

  onShow() {
    this.loadItems();
  },

  async loadCategories() {
    try {
      const res = await api.get('/idle/categories');
      this.setData({ categories: [{ id: 0, name: '全部' }, ...(res.data || [])] });
    } catch (e) {
      console.error(e);
    }
  },

  async loadItems() {
    if (this.data.loading || !this.data.hasMore) return;
    
    this.setData({ loading: true });
    
    try {
      const res = await api.get('/idle', {
        categoryId: this.data.currentCategory || undefined,
        page: this.data.page,
        pageSize: this.data.pageSize,
      });
      
      const list = res.data?.list || [];
      this.setData({
        items: this.data.page === 1 ? list : [...this.data.items, ...list],
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
    this.setData({ currentCategory: id, page: 1, hasMore: true, items: [] });
    this.loadItems();
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
