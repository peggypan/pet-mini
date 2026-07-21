const api = require('../../utils/request');
const {
  MOCK_PET,
  MOCK_FEED,
  MOCK_SERVICES_MINI,
  MOCK_SOCIAL,
  MOCK_MALL,
} = require('../../utils/mock');

Page({
  data: {
    pet: { ...MOCK_PET },
    modules: [
      {
        id: 1,
        name: '同城服务',
        tip: '上门喂养 · 美容 · 寄养',
        icon: '🛁',
        type: 'service',
        tone: 'tone-mint',
      },
      {
        id: 2,
        name: '闲置集市',
        tip: '赠送 · 置换 · 出售好物',
        icon: '🎁',
        type: 'idle',
        tone: 'tone-peach',
      },
      {
        id: 3,
        name: '健康档案',
        tip: '疫苗 · 驱虫 · 体重记录',
        icon: '💚',
        type: 'health',
        tone: 'tone-leaf',
      },
      {
        id: 4,
        name: '一键预约',
        tip: '精选服务，马上下单',
        icon: '⚡',
        type: 'book',
        tone: 'tone-sky',
      },
      {
        id: 5,
        name: '宠物交友',
        tip: '约局 · 发帖 · 留言',
        icon: '🤝',
        type: 'social',
        tone: 'tone-lilac',
      },
      {
        id: 6,
        name: '宠物商城',
        tip: '主粮 · 零食 · 玩具',
        icon: '🛒',
        type: 'mall',
        tone: 'tone-warm',
      },
    ],
    socialActions: MOCK_SOCIAL.actions.slice(),
    socialEvents: MOCK_SOCIAL.events.slice(),
    socialPosts: MOCK_SOCIAL.posts.map((p) => ({ ...p })),
    mallCategories: MOCK_MALL.categories.slice(),
    mallCategory: 'food',
    mallProducts: MOCK_MALL.products.slice(),
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

  onFamilyTap() {
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  onModuleTap(e) {
    const { type } = e.currentTarget.dataset;
    if (type === 'service' || type === 'book') {
      wx.switchTab({ url: '/pages/service/service' });
      return;
    }
    if (type === 'idle') {
      wx.switchTab({ url: '/pages/idle/idle' });
      return;
    }
    if (type === 'health') {
      wx.navigateTo({ url: '/pages/health/health' });
      return;
    }
    if (type === 'social') {
      wx.pageScrollTo({
        selector: '.social-block',
        duration: 300,
      });
      return;
    }
    if (type === 'mall') {
      wx.pageScrollTo({
        selector: '.mall-block',
        duration: 300,
      });
      return;
    }
  },

  onSocialMore() {
    wx.showToast({ title: '交友广场即将开放', icon: 'none' });
  },

  onSocialAction(e) {
    const { type } = e.currentTarget.dataset;
    const tips = {
      post: '发帖功能即将开放',
      chat: '留言功能即将开放',
      event: '活动报名即将开放',
      nearby: '附近宠友即将开放',
    };
    wx.showToast({ title: tips[type] || '功能开发中', icon: 'none' });
  },

  onEventTap() {
    wx.showToast({ title: '活动详情即将开放', icon: 'none' });
  },

  onLikeTap(e) {
    const { id } = e.currentTarget.dataset;
    const posts = this.data.socialPosts.map((p) => {
      if (p.id !== id) return p;
      const liked = !p.liked;
      return {
        ...p,
        liked,
        likes: liked ? p.likes + 1 : Math.max(0, p.likes - 1),
      };
    });
    this.setData({ socialPosts: posts });
  },

  onCommentTap() {
    wx.showToast({ title: '留言功能即将开放', icon: 'none' });
  },

  onChatTap() {
    wx.showToast({ title: '私信功能即将开放', icon: 'none' });
  },

  onMallMore() {
    wx.showToast({ title: '商城即将开放', icon: 'none' });
  },

  onMallCategory(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ mallCategory: id });
    wx.showToast({ title: '已切换分类', icon: 'none' });
  },

  onMallProduct() {
    wx.showToast({ title: '商品详情即将开放', icon: 'none' });
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
