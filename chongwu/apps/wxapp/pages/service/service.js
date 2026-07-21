const api = require('../../utils/request');

Page({
  data: {
    categories: [
      { id: 1, name: '洗护美容', icon: '🛁' },
      { id: 2, name: '医疗健康', icon: '💊' },
      { id: 3, name: '寄养服务', icon: '🏠' },
      { id: 4, name: '训练辅导', icon: '🎾' },
      { id: 5, name: '宠物用品', icon: '🦴' },
      { id: 6, name: '其他服务', icon: '🐾' },
    ],
    currentCategory: null,
    services: [],
    page: 1,
    pageSize: 20,
    loading: false,
    hasMore: true,
  },

  onLoad(options) {
    this.loadServices(options.categoryId);
    if (options.categoryId) {
      this.setData({ currentCategory: Number(options.categoryId) });
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
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

      const list = (res.data?.list || []).map(item => {
        // 根据服务名称或分类添加默认图标
        let categoryIcon = '🐾';
        let categoryName = '宠物服务';
        const name = item.name?.toLowerCase() || '';

        if (name.includes('洗') || name.includes('美容') || name.includes('洗澡')) {
          categoryIcon = '🛁';
          categoryName = '洗护美容';
        } else if (name.includes('医') || name.includes('健康') || name.includes('体检')) {
          categoryIcon = '💊';
          categoryName = '医疗健康';
        } else if (name.includes('寄养') || name.includes('托管')) {
          categoryIcon = '🏠';
          categoryName = '寄养服务';
        } else if (name.includes('训') || name.includes('学')) {
          categoryIcon = '🎾';
          categoryName = '训练辅导';
        } else if (name.includes('粮') || name.includes('食品') || name.includes('用品')) {
          categoryIcon = '🦴';
          categoryName = '宠物用品';
        }

        return {
          ...item,
          categoryIcon,
          categoryName,
          merchantLogoUrl: item.merchant ? item.merchant.logoUrl : '',
          merchantName: item.merchant ? item.merchant.name : '未知商家',
          merchantRating: item.merchant ? item.merchant.rating : 0
        };
      });

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
    const categoryId = id === '' ? null : Number(id);
    this.setData({ currentCategory: categoryId, page: 1, hasMore: true, services: [] });
    this.loadServices(categoryId);
  },

  onServiceTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${id}` });
  },

  onReachBottom() {
    this.loadServices();
  },
});
