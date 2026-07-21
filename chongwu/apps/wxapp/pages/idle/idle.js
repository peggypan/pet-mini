const api = require('../../utils/request');

Page({
  data: {
    categories: [
      { id: 1, name: '食品', icon: '🍖' },
      { id: 2, name: '日用品', icon: '🧴' },
      { id: 3, name: '笼具', icon: '🏠' },
      { id: 4, name: '服饰', icon: '👕' },
      { id: 5, name: '玩具', icon: '🎾' },
      { id: 6, name: '保健护理', icon: '💊' },
      { id: 7, name: '其他', icon: '📦' },
    ],
    currentCategory: null,
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
      
      const list = (res.data?.list || []).map(item => ({
        ...item,
        userAvatarUrl: item.user ? item.user.avatarUrl : '',
        userNickname: item.user ? item.user.nickname : '匿名'
      }));
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

  onCategoryChange() {
    // Scroll to top and suggest selecting a different category
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    });
    wx.showToast({
      title: '请选择其他分类',
      icon: 'none'
    });
  },

  onReachBottom() {
    this.loadItems();
  },
});
