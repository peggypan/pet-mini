const api = require('../../utils/request');
const {
  MOCK_PET,
  MOCK_SERVICES_MINI,
  MOCK_SOCIAL,
  MOCK_MALL,
  MOCK_MODULES,
} = require('../../utils/mock');
const store = require('../../utils/store');

function getInviteCode() {
  let code = wx.getStorageSync('my_invite_code');
  if (!code) {
    code = `CTT${Date.now().toString(36).toUpperCase().slice(-6)}`;
    wx.setStorageSync('my_invite_code', code);
  }
  return code;
}

Page({
  data: {
    pet: { ...MOCK_PET },
    modules: MOCK_MODULES.slice(),
    previewPosts: [],
    previewProducts: MOCK_MALL.products.slice(0, 2),
    mallServices: MOCK_MALL.services.slice(),
    services: MOCK_SERVICES_MINI.slice(),
    invite: { ...MOCK_SOCIAL.invite },
    inviteRewardVisible: false,
    inviteRewardText: '',
  },

  onLoad(options) {
    this.loadData();
    this.reloadSocialPreview();
    this.maybeGuideBindPet();
    this.handleInviteEntry(options || {});
  },

  onShow() {
    this.loadData();
    this.reloadSocialPreview();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  reloadSocialPreview() {
    const local = store.listSocialPosts();
    const mock = MOCK_SOCIAL.posts.map((p) => {
      const override = store.getSocialOverride(p.id);
      return { ...p, ...(override || {}) };
    });
    this.setData({ previewPosts: [...local, ...mock].slice(0, 2) });
  },

  goSocial() {
    wx.navigateTo({ url: '/pages/social/social' });
  },

  goSocialEvents() {
    wx.navigateTo({ url: '/pages/social/social?filter=event' });
  },

  onCreatePost() {
    wx.navigateTo({ url: '/pages/social-post/social-post' });
  },

  onPostTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/social-detail/social-detail?id=${id}` });
  },

  onLostTap() {
    wx.navigateTo({ url: '/pages/lost-publish/lost-publish' });
  },

  /**
   * 新用户引导绑定自家宠物（本地标记，避免反复弹）
   */
  maybeGuideBindPet() {
    const guided = wx.getStorageSync('pet_bind_guided');
    if (guided) return;
    wx.showModal({
      title: '先绑定你家毛孩子',
      content: '完善宠物类型与年龄后，首页内容会更贴合你的养宠场景～',
      confirmText: '去绑定',
      cancelText: '稍后再说',
      success: (res) => {
        wx.setStorageSync('pet_bind_guided', 1);
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/pet-form/pet-form' });
        }
      },
    });
  },

  /**
   * 拉取首页数据；失败或为空时使用 Mock
   */
  async loadData() {
    let services = MOCK_SERVICES_MINI.slice();
    let pet = { ...MOCK_PET };

    try {
      const servicesRes = await api.get('/services', { page: 1, pageSize: 6 });
      const apiServices = (servicesRes.data?.list || []).map((item) => ({
        ...item,
        coverUrls: item.coverUrls?.length ? item.coverUrls : [MOCK_SERVICES_MINI[0].coverUrls[0]],
      }));
      if (apiServices.length) services = apiServices;

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
        // 未登录保持 Mock
      }
    } catch (e) {
      console.error('加载数据失败，使用 Mock', e);
    }

    const localPets = store.listPets();
    if (localPets[0]) {
      pet = {
        ...MOCK_PET,
        name: localPets[0].name || MOCK_PET.name,
        breed: localPets[0].breedName || MOCK_PET.breed,
        age: localPets[0].birthday ? '已建档' : MOCK_PET.age,
        avatar: localPets[0].avatarUrl || MOCK_PET.avatar,
      };
    }

    this.setData({ services, pet });
  },

  onFamilyTap() {
    wx.navigateTo({ url: '/pages/health/health' });
  },

  onModuleTap(e) {
    const { type } = e.currentTarget.dataset;
    if (type === 'service') {
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
    if (type === 'lost') {
      this.onLostTap();
      return;
    }
    if (type === 'social') {
      wx.navigateTo({ url: '/pages/social/social' });
      return;
    }
    if (type === 'mall') {
      wx.navigateTo({ url: '/pages/mall/mall' });
    }
  },

  handleInviteEntry(options) {
    const inviteCode = options.invite || '';
    const myCode = getInviteCode();
    if (!inviteCode || inviteCode === myCode) return;

    const claimedKey = `invite_claimed_${inviteCode}`;
    if (wx.getStorageSync(claimedKey)) return;

    wx.setStorageSync(claimedKey, 1);
    const coupons = wx.getStorageSync('mall_coupons') || [];
    coupons.unshift({
      id: `c_${Date.now()}`,
      amount: 5,
      title: '邀请新人券',
      from: inviteCode,
    });
    wx.setStorageSync('mall_coupons', coupons.slice(0, 20));

    this.setData({
      inviteRewardVisible: true,
      inviteRewardText: '已获得 ¥5 商城券，可在商城下单抵扣（演示）',
    });
    setTimeout(() => {
      this.setData({ inviteRewardVisible: false });
    }, 4000);
  },

  onCloseInviteReward() {
    this.setData({ inviteRewardVisible: false });
  },

  onMallMore() {
    wx.navigateTo({ url: '/pages/mall/mall' });
  },

  goMall() {
    wx.navigateTo({ url: '/pages/mall/mall' });
  },

  onMallProduct(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/mall-product/mall-product?id=${id}` });
  },

  onMallService(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/mall-service/mall-service?id=${id || 's1'}` });
  },

  onServiceTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${id}` });
  },

  onMoreServices() {
    wx.switchTab({ url: '/pages/service/service' });
  },

  onShareAppMessage() {
    const invite = getInviteCode();
    return {
      title: this.data.invite?.shareTitle || '宠头头 · 养宠一站式服务社区',
      path: `/pages/index/index?invite=${invite}`,
    };
  },

  onShareTimeline() {
    return {
      title: '宠头头 · 养宠一站式服务社区',
      query: `invite=${getInviteCode()}`,
    };
  },
});
