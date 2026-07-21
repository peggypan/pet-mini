const app = getApp();
const api = require('../../utils/request');

Page({
  data: {
    banners: [
      {
        id: 1,
        title: '新手养宠指南',
        type: 'grooming',
        color1: '#48C9B0',
        color2: '#3AA896',
        emoji: '🐕',
        desc: '从0到1照顾好毛孩子'
      },
      {
        id: 2,
        title: '夏季宠物护理',
        type: 'medical',
        color1: '#FF9A76',
        color2: '#FF7B7B',
        emoji: '☀️',
        desc: '高温天如何保护宠物'
      },
      {
        id: 3,
        title: '闲置好物转让',
        type: 'idle',
        color1: '#C8A8E9',
        color2: '#9B7FC7',
        emoji: '🎁',
        desc: '好物流转，让爱延续'
      }
    ],
    categories: [
      { id: 1, name: '上门洗护', icon: '🛁' },
      { id: 2, name: '上门喂宠', icon: '🍼' },
      { id: 3, name: '寄养', icon: '🏠' },
      { id: 4, name: '遛狗', icon: '🦮' },
      { id: 5, name: '宠物医院', icon: '🏥' },
      { id: 6, name: '健康档案', icon: '📋' },
    ],
    services: [],
    idleItems: [],
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const [servicesRes, idleRes] = await Promise.all([
        api.get('/services', { page: 1, pageSize: 6 }),
        api.get('/idle', { page: 1, pageSize: 6 }),
      ]);
      
      this.setData({
        services: (servicesRes.data?.list || []).map(item => {
          // 根据服务名称添加图标
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
            merchantName: item.merchant ? item.merchant.name : ''
          };
        }),
        idleItems: idleRes.data?.list || [],
      });
    } catch (e) {
      console.error('加载数据失败', e);
    }
  },

  onCategoryTap(e) {
    const { id, name } = e.currentTarget.dataset;
    if (id === 6) {
      wx.switchTab({ url: '/pages/health/health' });
    } else {
      wx.navigateTo({ url: `/pages/service/service?categoryId=${id}` });
    }
  },

  onServiceTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${id}` });
  },

  onIdleTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/idle-detail/idle-detail?id=${id}` });
  },

  onMoreServices() {
    wx.switchTab({ url: '/pages/service/service' });
  },

  onMoreIdle() {
    wx.switchTab({ url: '/pages/idle/idle' });
  },

  onQuickTap(e) {
    const { type } = e.currentTarget.dataset;
    const typeMap = {
      grooming: { url: '/pages/service/service', name: '洗护服务' },
      medical: { url: '/pages/service/service', name: '医疗服务' },
      hotel: { url: '/pages/service/service', name: '寄养服务' },
      training: { url: '/pages/service/service', name: '训练服务' },
      food: { url: '/pages/service/service', name: '用品服务' },
      idle: { url: '/pages/idle/idle', name: '闲置市场' },
    };

    const target = typeMap[type];
    if (target) {
      if (type === 'idle') {
        wx.switchTab({ url: target.url });
      } else {
        wx.navigateTo({ url: target.url });
      }
    }
  },

  onBannerTap(e) {
    const { type } = e.currentTarget.dataset;
    // Banner 点击跳转到对应页面
    if (type === 'idle') {
      wx.switchTab({ url: '/pages/idle/idle' });
    } else {
      wx.navigateTo({ url: '/pages/service/service' });
    }
  },
});
