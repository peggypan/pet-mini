const api = require('../../utils/request');
const {
  MOCK_PET,
  MOCK_FEED,
  MOCK_SERVICES_MINI,
} = require('../../utils/mock');

Page({
  data: {
    pet: { ...MOCK_PET },
    quickActions: [
      { id: 1, name: '健康', icon: '💚', type: 'health', bg: 'rgba(111, 207, 151, 0.22)' },
      { id: 2, name: '社交', icon: '👥', type: 'social', bg: 'rgba(126, 200, 163, 0.28)' },
      { id: 3, name: '饮食', icon: '🦴', type: 'diet', bg: 'rgba(245, 194, 107, 0.28)' },
      { id: 4, name: '指南', icon: '📄', type: 'guide', bg: 'rgba(168, 230, 195, 0.35)' },
    ],
    feedMain: { ...MOCK_FEED.feedMain },
    feedSide: MOCK_FEED.feedSide.slice(),
    services: MOCK_SERVICES_MINI.slice(),
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  /**
   * 拉取首页数据；失败或为空时使用 Mock 占位
   */
  async loadData() {
    let services = MOCK_SERVICES_MINI.slice();
    let feedMain = { ...MOCK_FEED.feedMain };
    let feedSide = MOCK_FEED.feedSide.slice();
    let pet = { ...MOCK_PET };

    try {
      const [servicesRes, idleRes] = await Promise.all([
        api.get('/services', { page: 1, pageSize: 6 }),
        api.get('/idle', { page: 1, pageSize: 6 }),
      ]);

      const apiServices = (servicesRes.data?.list || []).map((item) => {
        let categoryIcon = '🐾';
        const name = item.name?.toLowerCase() || '';
        if (name.includes('洗') || name.includes('美容')) categoryIcon = '🛁';
        else if (name.includes('医') || name.includes('健康')) categoryIcon = '💊';
        else if (name.includes('寄养')) categoryIcon = '🏠';
        else if (name.includes('训')) categoryIcon = '🎾';
        else if (name.includes('粮') || name.includes('食品')) categoryIcon = '🦴';
        return {
          ...item,
          categoryIcon,
          coverUrls: item.coverUrls?.length ? item.coverUrls : [MOCK_SERVICES_MINI[0].coverUrls[0]],
        };
      });

      if (apiServices.length) {
        services = apiServices;
      }

      const idleItems = idleRes.data?.list || [];
      if (idleItems[0]?.images?.[0] || services[0]?.coverUrls?.[0]) {
        feedMain = {
          id: idleItems[0]?.id || feedMain.id,
          kind: 'idle',
          image: idleItems[0]?.images?.[0] || services[0]?.coverUrls?.[0] || feedMain.image,
        };
      }
      if (services[0] || idleItems[1]) {
        feedSide = [
          {
            id: services[0]?.id || 'mock-s1',
            kind: 'service',
            title: services[0]?.name || '小猫',
            rating: 4,
            stars: [1, 2, 3, 4],
            image: services[0]?.coverUrls?.[0] || MOCK_FEED.feedSide[0].image,
          },
          {
            id: idleItems[1]?.id || services[1]?.id || 'mock-s2',
            kind: idleItems[1] ? 'idle' : 'service',
            title: idleItems[1]?.title || services[1]?.name || '金毛',
            image: idleItems[1]?.images?.[0] || services[1]?.coverUrls?.[0] || MOCK_FEED.feedSide[1].image,
          },
        ];
      }

      try {
        const profile = await api.get('/users/profile');
        const firstPet = profile.data?.pets?.[0];
        if (firstPet) {
          pet = {
            ...MOCK_PET,
            name: firstPet.name || MOCK_PET.name,
            breed: firstPet.breed || MOCK_PET.breed,
            age: firstPet.age ? `${firstPet.age}岁` : MOCK_PET.age,
            avatar: firstPet.avatarUrl || firstPet.avatar || MOCK_PET.avatar,
          };
        }
      } catch (e) {
        // 未登录保持 Mock 宠物
      }
    } catch (e) {
      console.error('加载数据失败，使用 Mock', e);
    }

    this.setData({ services, feedMain, feedSide, pet });
  },

  onSearchTap() {
    wx.showToast({ title: '搜索功能开发中', icon: 'none' });
  },

  onQuickAction(e) {
    const { type } = e.currentTarget.dataset;
    if (type === 'health') {
      wx.navigateTo({ url: '/pages/health/health' });
      return;
    }
    if (type === 'diet' || type === 'guide') {
      wx.switchTab({ url: '/pages/service/service' });
      return;
    }
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  onFeedTap(e) {
    const { id, kind } = e.currentTarget.dataset;
    if (!id || String(id).indexOf('mock-') === 0) {
      if (kind === 'service') this.onMoreServices();
      else this.onMoreIdle();
      return;
    }
    if (kind === 'service') {
      wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${id}` });
    } else {
      wx.navigateTo({ url: `/pages/idle-detail/idle-detail?id=${id}` });
    }
  },

  onServiceTap(e) {
    const { id } = e.currentTarget.dataset;
    if (String(id).indexOf('mock-') === 0) {
      this.onMoreServices();
      return;
    }
    wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${id}` });
  },

  onMoreServices() {
    wx.switchTab({ url: '/pages/service/service' });
  },

  onMoreIdle() {
    wx.switchTab({ url: '/pages/idle/idle' });
  },
});
