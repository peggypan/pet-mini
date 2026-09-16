const app = getApp();
const { getDefaultPet } = require('../../utils/catalog');
const store = require('../../utils/store');
const { explainGetPhoneNumberFail } = require('../../utils/phone-login-errors');
const {
  PRESET_PET_TAGS,
  MAX_SELECTED,
  MAX_CUSTOM_LEN,
} = require('../../utils/pet-profile-tags');
const {
  DEFAULT,
  gradientStyleString,
  sampleImageColors,
} = require('../../utils/image-palette');

const TAB_KEYS = ['myEvents', 'joined', 'buddy', 'social'];

function feedCoverFromPost(p) {
  const list = p.mediaList || [];
  if (list.length) {
    const m = list[0];
    if (m.type === 'image') return m.url;
    if (m.type === 'video') return m.poster || '';
  }
  return p.image || (p.images && p.images[0]) || '';
}

function buildSocialFeedItems() {
  return store.listSocialPosts().slice(0, 20).map((p) => {
    const cover = feedCoverFromPost(p) || getDefaultPet().avatar;
    return {
      id: p.id,
      kind: 'social',
      dateLabel: p.time || '刚刚',
      title: (p.content || '宠友动态').slice(0, 36),
      place: p.topic || '宠友圈',
      org: p.userName || '动态',
      cover,
      hasVideo: (p.mediaList || []).some((m) => m.type === 'video'),
      extra: '',
      url: `/pages/social-detail/social-detail?id=${p.id}`,
    };
  });
}

function formatFeedDate(isoOrStr) {
  if (!isoOrStr) return '近期';
  const d = new Date(isoOrStr);
  if (Number.isNaN(d.getTime())) return '近期';
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${m}月${day}`;
}

function buildFeed(tabKey) {
  if (tabKey === 'myEvents') {
    return store.listMyEvents().map((ev) => ({
      id: ev.id,
      kind: 'event',
      dateLabel: formatFeedDate(ev.createdAt || ev.eventDate),
      title: ev.title || '同城宠物活动',
      place: ev.place || ev.placeAddress || '待定地点',
      org: ev.publisherName || '我发起的活动',
      cover: ev.cover || (ev.images && ev.images[0]) || getDefaultPet().avatar,
      extra: '',
      url: `/pages/my-events/my-events`,
    }));
  }
  if (tabKey === 'joined') {
    return store.listEventSignups().map((ev, i) => ({
      id: ev.id || `join-${i}`,
      kind: 'joined',
      dateLabel: formatFeedDate(ev.createdAt || ev.time),
      title: ev.title || '已报名活动',
      place: ev.place || '同城',
      org: ev.publisherName || '宠友活动',
      cover: ev.cover || ev.image || getDefaultPet().avatar,
      extra: '',
      url: `/pages/my-events/my-events`,
    }));
  }
  if (tabKey === 'buddy') {
    return store.listBuddyPosts()
      .filter((p) => p.userName === '我' || !p.userName)
      .slice(0, 20)
      .map((p) => ({
        id: p.id,
        kind: 'buddy',
        dateLabel: p.time || '刚刚',
        title: p.buddyType || '找搭子',
        place: p.expectPlace || '同城',
        org: p.petName ? `${p.petName} · 搭子` : '我的搭子',
        cover: (p.mediaList && p.mediaList[0] && (p.mediaList[0].url || p.mediaList[0].poster))
          || p.cover
          || getDefaultPet().avatar,
        extra: '',
        url: `/pages/buddy-detail/buddy-detail?id=${p.id}`,
      }));
  }
  return buildSocialFeedItems();
}

Page({
  data: {
    isLogin: false,
    userInfo: null,
    pet: {},
    unreadCount: 0,
    stats: { buddies: 0, posts: 0, events: 0, orders: 0, organized: 0 },
    city: '北京',
    activeTab: 0,
    tabLabels: ['我的活动', '我参与的', '我的搭子', '宠友动态'],
    feedList: [],
    clubTileSub: '0 场进行中',
    profileTagOptions: [],
    heroGradient: gradientStyleString(DEFAULT),
    heroSourceImage: '',
    profileBio: '和毛孩子一起，遇见同城宠友与好活动～',
  },

  pickHeroImageSource() {
    const pet = this.data.pet || getDefaultPet();
    const avatar = pet.avatar || pet.avatarUrl || '';
    const feedCover = (this.data.feedList && this.data.feedList[0] && this.data.feedList[0].cover) || '';
    return feedCover || avatar;
  },

  updateHeroGradient() {
    const src = this.pickHeroImageSource();
    if (!src) return;
    this.setData({ heroSourceImage: src });
    sampleImageColors(this, 'paletteCanvas', src).then((palette) => {
      const heroGradient = gradientStyleString(palette);
      this.setData({ heroGradient });
      if (palette.c2) {
        wx.setNavigationBarColor({
          frontColor: '#ffffff',
          backgroundColor: palette.c2,
        });
      }
    });
  },

  buildProfileTagOptions() {
    const { selected, custom } = store.getProfileTags();
    const allLabels = [...PRESET_PET_TAGS, ...custom.filter((t) => !PRESET_PET_TAGS.includes(t))];
    const unique = [...new Set(allLabels)];
    return unique.map((label) => ({
      label,
      active: selected.includes(label),
    }));
  },

  refreshProfileTags() {
    this.setData({ profileTagOptions: this.buildProfileTagOptions() });
  },

  onTabChange(e) {
    const tab = Number(e.currentTarget.dataset.tab);
    if (Number.isNaN(tab)) return;
    this.setData({ activeTab: tab });
    this.refreshFeed(tab, true);
  },

  refreshFeed(tabIndex, refreshGradient) {
    const key = TAB_KEYS[tabIndex] || TAB_KEYS[0];
    this.setData({ feedList: buildFeed(key) }, () => {
      if (refreshGradient) this.updateHeroGradient();
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
    const token = wx.getStorageSync('token');
    const myEvents = store.listMyEvents();
    this.setData({
      isLogin: !!token,
      userInfo: wx.getStorageSync('userInfo'),
      pet: getDefaultPet(),
      unreadCount: store.countUnreadMessages(),
      stats: {
        buddies: store.listFollows().length,
        posts: store.listSocialPosts().length + store.listBuddyPosts().length,
        events: store.listEventSignups().length,
        orders: store.listServiceBooks().length,
        organized: myEvents.length,
      },
      city: store.getCity(),
      clubTileSub: `${myEvents.filter((e) => e.auditStatus !== 'rejected').length} 场进行中`,
      profileBio: store.getUserProfile().bio || '和毛孩子一起，遇见同城宠友与好活动～',
    });
    this.refreshFeed(this.data.activeTab);
    this.refreshProfileTags();
    wx.nextTick(() => this.updateHeroGradient());
  },

  onFeedTap(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    if (url.includes('switchTab')) {
      wx.switchTab({ url: url.replace('switchTab:', '') });
      return;
    }
    wx.navigateTo({ url });
  },

  onCityTap() {
    wx.navigateTo({ url: '/pages/city-picker/city-picker' });
  },

  onAgreePrivacyForPhone() {
    getApp().handlePrivacyAgree('login-phone-btn');
  },

  onGetPhoneNumber(e) {
    const detail = e.detail || {};
    const errMsg = detail.errMsg || '';
    if (errMsg.includes('deny') || errMsg.includes('cancel')) {
      wx.showToast({ title: '已取消手机号授权', icon: 'none' });
      return;
    }
    const ok = errMsg === 'getPhoneNumber:ok' || !!detail.code || !!detail.encryptedData;
    if (!ok) {
      const explained = explainGetPhoneNumberFail(detail);
      if (!explained) return;
      wx.showModal({
        title: explained.title,
        content: explained.content,
        confirmText: explained.suggestWxLogin ? '微信快捷登录' : '知道了',
        cancelText: explained.suggestWxLogin ? '知道了' : undefined,
        showCancel: !!explained.suggestWxLogin,
        success: (res) => {
          if (explained.suggestWxLogin && res.confirm) this.onWxLogin();
        },
      });
      return;
    }
    wx.showLoading({ title: '登录中', mask: true });
    app.loginByPhone(detail).then(() => {
      this.onShow();
      wx.showToast({ title: '登录成功', icon: 'success' });
    }).catch((err) => {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    }).finally(() => wx.hideLoading());
  },

  onWxLogin() {
    wx.showLoading({ title: '登录中', mask: true });
    app.loginByWechat()
      .then(() => {
        this.onShow();
        wx.showToast({ title: '登录成功', icon: 'success' });
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '登录失败', icon: 'none' });
      })
      .finally(() => wx.hideLoading());
  },

  onMessages() { wx.switchTab({ url: '/pages/messages/messages' }); },
  onPetCert() { wx.navigateTo({ url: '/pages/pet-cert/pet-cert' }); },
  onEditProfile() {
    if (!this.data.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/profile-edit/profile-edit' });
  },

  onEditBio() {
    if (!this.data.isLogin) {
      this.onAbout();
      return;
    }
    wx.navigateTo({ url: '/pages/profile-edit/profile-edit' });
  },

  onEditPet() { wx.navigateTo({ url: '/pages/profile-edit/profile-edit' }); },
  onMyBuddy() { wx.navigateTo({ url: '/pages/buddy/buddy' }); },
  onMyPosts() { wx.switchTab({ url: '/pages/social/social' }); },
  onMyEvents() { wx.navigateTo({ url: '/pages/my-events/my-events' }); },
  onMyHelp() { wx.navigateTo({ url: '/pages/pet-rescue/pet-rescue' }); },
  onClubApply() { wx.navigateTo({ url: '/pages/club-apply/club-apply' }); },
  onMyClubs() { wx.navigateTo({ url: '/pages/my-clubs/my-clubs?tab=mine' }); },
  onJoinedClubs() { wx.navigateTo({ url: '/pages/my-clubs/my-clubs?tab=joined' }); },
  onOrders() {
    const orders = store.listServiceBooks();
    wx.showModal({
      title: '服务预约订单',
      content: orders.length ? orders.map((o) => `· ${o.merchantName}`).join('\n') : '暂无订单',
      showCancel: false,
    });
  },
  onAbout() {
    wx.showModal({ title: '关于宠头头', content: '以宠物为媒介的同城社交与生活平台', showCancel: false });
  },
  onToggleProfileTag(e) {
    const label = e.currentTarget.dataset.label;
    if (!label) return;
    const { selected, custom } = store.getProfileTags();
    let next = [...selected];
    if (next.includes(label)) {
      next = next.filter((t) => t !== label);
    } else {
      if (next.length >= MAX_SELECTED) {
        wx.showToast({ title: `最多选择 ${MAX_SELECTED} 个标签`, icon: 'none' });
        return;
      }
      next.push(label);
    }
    store.setProfileTags({ selected: next, custom });
    this.refreshProfileTags();
  },

  onAddTag() {
    wx.showModal({
      title: '自定义标签',
      editable: true,
      placeholderText: '如：柯基家长、社恐修狗',
      success: (res) => {
        if (!res.confirm) return;
        const text = (res.content || '').trim();
        if (!text) return;
        if (text.length > MAX_CUSTOM_LEN) {
          wx.showToast({ title: `标签不超过 ${MAX_CUSTOM_LEN} 个字`, icon: 'none' });
          return;
        }
        const { selected, custom } = store.getProfileTags();
        const nextCustom = custom.includes(text) ? custom : [...custom, text];
        let nextSelected = [...selected];
        if (!nextSelected.includes(text)) {
          if (nextSelected.length >= MAX_SELECTED) {
            wx.showToast({ title: `最多选择 ${MAX_SELECTED} 个标签`, icon: 'none' });
            store.setProfileTags({ selected: nextSelected, custom: nextCustom });
            this.refreshProfileTags();
            return;
          }
          nextSelected.push(text);
        }
        store.setProfileTags({ selected: nextSelected, custom: nextCustom });
        this.refreshProfileTags();
      },
    });
  },
  onMoreMenu() {
    wx.showActionSheet({
      itemList: ['私信 / 通知', '商家预约订单', '关于我们', '退出登录'],
      success: (res) => {
        if (res.tapIndex === 0) this.onMessages();
        if (res.tapIndex === 1) this.onOrders();
        if (res.tapIndex === 2) this.onAbout();
        if (res.tapIndex === 3 && this.data.isLogin) this.onLogout();
      },
    });
  },
  onLogout() {
    wx.showModal({
      title: '退出登录',
      success: (res) => {
        if (res.confirm) {
          app.logout();
          this.onShow();
        }
      },
    });
  },
});
