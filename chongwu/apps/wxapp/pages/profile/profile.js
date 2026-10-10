const app = getApp();
const { getDefaultPet } = require('../../utils/catalog');
const { requireInteract } = require('../../utils/pet-profile-guard');
const { requireLogin } = require('../../utils/require-login');
const store = require('../../utils/store');
const cloudApi = require('../../utils/cloud-api');
const { refreshPointsFromCloud } = require('../../utils/points-ledger-cloud-sync');
const { refreshPetsFromCloud } = require('../../utils/pet-cloud-sync');
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
const amap = require('../../utils/amap');
const { getDisplayNickname } = require('../../utils/user-profile-display');
const { pullUserProfileFromCloud } = require('../../utils/persist-user-profile');
const { buildProfileStatList } = require('../../utils/profile-stat-list');
const { consumeLoginPromptFlag } = require('../../utils/require-login');
const { ensurePrivacyBeforeLogin, isDevtools } = require('../../utils/privacy');
const { displayPublishTime } = require('../../utils/relative-time');
const TAB_KEYS = ['myEvents', 'joined', 'buddy', 'social'];

function buildClubTileSub() {
  const mine = store.listMyOwnedClubs();
  const joined = store.listJoinedClubs();
  const total = mine.length + joined.length;
  if (total > 0) {
    const parts = [];
    if (mine.length) parts.push(`${mine.length} 个主理`);
    if (joined.length) parts.push(`${joined.length} 个已加入`);
    return parts.join(' · ');
  }
  const apply = store.getClubApply();
  if (apply && apply.status === 'pending') return '入驻审核中';
  if (apply && apply.status === 'approved') return '主理已通过';
  return '暂无俱乐部';
}

function buildProfileStatCounts() {
  const socialStats = store.getProfileSocialStats();
  const collectCount = store.listCollects().length;
  return {
    following: store.listFollows().length,
    followers: socialStats.followers,
    heart: store.listHeartLikes().length,
    receivedLikesCollects: socialStats.likesAndCollects,
    collectCount,
    likesCollects: socialStats.likesAndCollects + collectCount,
  };
}

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
      dateLabel: displayPublishTime(p) || p.time || '',
      title: (p.content || '宠友动态').slice(0, 36),
      place: p.topic || '宠物社区',
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
      placeNav: !!(ev.place || ev.placeAddress),
      placeAddress: ev.placeAddress || ev.place || '',
      placeLat: (ev.location && ev.location.latitude) || '',
      placeLng: (ev.location && ev.location.longitude) || '',
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
      placeNav: !!(ev.place && ev.place !== '同城'),
      placeAddress: ev.placeAddress || ev.place || '',
      placeLat: ev.locationLat || '',
      placeLng: ev.locationLng || '',
      org: ev.publisherName || '宠友活动',
      cover: ev.cover || ev.image || getDefaultPet().avatar,
      extra: '',
      url: ev.eventId ? `/pages/event-detail/event-detail?id=${ev.eventId}&ticket=1` : '/pages/my-events/my-events',
    }));
  }
  if (tabKey === 'buddy') {
    return store.listBuddyPosts()
      .filter((p) => p.userName === '我' || !p.userName)
      .slice(0, 20)
      .map((p) => ({
        id: p.id,
        kind: 'buddy',
        dateLabel: displayPublishTime(p) || p.time || '',
        title: p.buddyType || '找搭子',
        place: p.expectPlace || '同城',
        placeNav: !!(p.expectPlace && p.expectPlace !== '同城'),
        placeAddress: p.expectPlaceAddress || (p.location && p.location.address) || p.expectPlace || '',
        placeLat: (p.location && p.location.latitude) || '',
        placeLng: (p.location && p.location.longitude) || '',
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
    privacyReady: true,
    userInfo: null,
    pet: {},
    stats: { following: 0, followers: 0, heart: 0, likesCollects: 0, events: 0, orders: 0, organized: 0 },
    city: '北京',
    activeTab: 0,
    tabLabels: ['我的活动', '我参与的', '我的搭子', '宠友动态'],
    feedList: [],
    clubTileSub: '暂无俱乐部',
    profileTagOptions: [],
    heroGradient: gradientStyleString(DEFAULT),
    heroSourceImage: '',
    profileBio: '和毛孩子一起，遇见同城宠友与好活动～',
    displayNickname: '宠友',
    statSheetVisible: false,
    statSheetTitle: '',
    statSheetSummary: '',
    statSheetList: [],
    statSheetEmpty: '',
  },

  pickHeroImageSource() {
    const list = this.data.feedList || [];
    for (let i = 0; i < list.length; i += 1) {
      const cover = list[i] && list[i].cover;
      if (cover) return cover;
    }
    const pet = this.data.pet || getDefaultPet();
    return pet.avatar || pet.avatarUrl || '';
  },

  applyHeroImage(src) {
    const image = src || this.pickHeroImageSource();
    if (!image) return;
    const patch = image !== this.data.heroSourceImage ? { heroSourceImage: image } : {};
    const applyPalette = () => {
      sampleImageColors(this, 'paletteCanvas', image).then((palette) => {
        const heroGradient = gradientStyleString(palette);
        this.setData({ heroGradient });
        if (palette.c2) {
          wx.setNavigationBarColor({
            frontColor: '#ffffff',
            backgroundColor: palette.c2,
          });
        }
      });
    };
    if (Object.keys(patch).length) {
      this.setData(patch, applyPalette);
    } else {
      applyPalette();
    }
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

  refreshFeed(tabIndex, refreshGradient = true) {
    const key = TAB_KEYS[tabIndex] || TAB_KEYS[0];
    this.setData({ feedList: buildFeed(key) }, () => {
      if (refreshGradient) this.applyHeroImage();
    });
  },

  onHide() {
    if (this.data.statSheetVisible) {
      this.setTabBarHidden(false);
      this.setData({ statSheetVisible: false });
    }
  },

  paintProfileFromCache() {
    let token = wx.getStorageSync('token');
    try {
      const g = getApp().globalData;
      if (g && g.token) token = g.token;
    } catch (e) {
      // ignore
    }
    const myEvents = store.listMyEvents();
    const statCounts = buildProfileStatCounts();
    this.setData({
      isLogin: !!token,
      userInfo: wx.getStorageSync('userInfo'),
      displayNickname: getDisplayNickname(),
      pet: getDefaultPet(),
      stats: {
        following: statCounts.following,
        followers: statCounts.followers,
        heart: statCounts.heart,
        likesCollects: statCounts.likesCollects,
        events: store.listEventSignups().length,
        orders: store.listServiceBooks().length,
        organized: myEvents.length,
      },
      city: store.getCity(),
      clubTileSub: buildClubTileSub(),
      profileBio: store.getUserProfile().bio || '和毛孩子一起，遇见同城宠友与好活动～',
      pointsBalance: store.getUserPointsBalance(),
    });
    this.refreshFeed(this.data.activeTab, true);
    this.refreshProfileTags();
    return token;
  },

  refreshProfileInBackground() {
    if (this._profileRefreshPromise) return this._profileRefreshPromise;
    this._profileRefreshPromise = (async () => {
      const token = wx.getStorageSync('token');
      if (!token || !cloudApi.cloudEnabled()) return;
      try {
        const { refreshClubsFromCloud } = require('../../utils/club-cloud-sync');
        const { refreshJoinedClubsFromCloud } = require('../../utils/club-member-cloud-sync');
        await Promise.all([
          refreshPetsFromCloud(),
          refreshPointsFromCloud(),
          pullUserProfileFromCloud(),
          refreshClubsFromCloud({ city: store.getCity(), limit: 50 }).catch(() => {}),
          refreshJoinedClubsFromCloud().catch(() => {}),
        ]);
        this.paintProfileFromCache();
      } catch (e) {
        // keep local cache
      } finally {
        this._profileRefreshPromise = null;
      }
    })();
    return this._profileRefreshPromise;
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
    if (!this.data.statSheetVisible) {
      this.setTabBarHidden(false);
    }
    this.refreshPrivacyReady();
    const token = this.paintProfileFromCache();
    this.refreshProfileInBackground();
    if (!token && consumeLoginPromptFlag()) {
      wx.nextTick(() => {
        wx.showToast({ title: '请先登录', icon: 'none' });
      });
    }
  },

  refreshPrivacyReady() {
    if (!wx.getPrivacySetting) {
      this.setData({ privacyReady: true });
      return;
    }
    wx.getPrivacySetting({
      success: (res) => {
        const ready = !res.needAuthorization;
        this.setData({ privacyReady: ready });
        if (ready) {
          try {
            getApp().globalData.privacyAccepted = true;
          } catch (e) {
            // ignore
          }
        }
      },
      fail: () => this.setData({ privacyReady: true }),
    });
  },

  setTabBarHidden(hidden) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hidden: !!hidden });
    }
  },

  onProfileStatTap(e) {
    if (!this.data.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    const stat = e.currentTarget.dataset.stat;
    const typeMap = {
      follow: 'follow',
      fans: 'fans',
      heart: 'heart',
      likesCollects: 'likesCollects',
    };
    const type = typeMap[stat];
    if (!type) return;
    const sheet = buildProfileStatList(type);
    this.setTabBarHidden(true);
    this.setData({
      statSheetVisible: true,
      statSheetTitle: sheet.title,
      statSheetSummary: sheet.summary,
      statSheetList: sheet.list,
      statSheetEmpty: sheet.emptyText,
    });
  },

  onCloseStatSheet() {
    this.setTabBarHidden(false);
    this.setData({ statSheetVisible: false });
  },

  onStatSheetItemTap(e) {
    const { id, name, pet, avatar } = e.currentTarget.dataset;
    if (!id) return;
    this.setTabBarHidden(false);
    this.setData({ statSheetVisible: false });
    const idStr = String(id);
    const peerOpenid = idStr.startsWith('oid:') ? idStr.slice(4) : '';
    const peerId = peerOpenid || idStr;
    const q = [
      `peerId=${encodeURIComponent(peerId)}`,
      `peerName=${encodeURIComponent(name || '宠友')}`,
      `petName=${encodeURIComponent(pet || '')}`,
      `avatar=${encodeURIComponent(avatar || '')}`,
    ];
    if (peerOpenid) q.push(`peerOpenid=${encodeURIComponent(peerOpenid)}`);
    const query = q.join('&');
    wx.navigateTo({ url: `/pages/chat/chat?${query}` });
  },

  onFeedTap(e) {
    const cover = e.currentTarget.dataset.cover;
    if (cover) this.applyHeroImage(cover);
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    if (url.includes('switchTab')) {
      wx.switchTab({ url: url.replace('switchTab:', '') });
      return;
    }
    wx.navigateTo({ url });
  },

  onOpenPlace(e) {
    amap.openPlaceFromTap(e);
  },

  onCityTap() {
    wx.navigateTo({ url: '/pages/city-picker/city-picker' });
  },

  _isPhoneAuthOk(errMsg) {
    const msg = String(errMsg || '');
    return msg === 'getPhoneNumber:ok' || msg === 'getRealtimePhoneNumber:ok';
  },

  onAgreePrivacyForLogin() {
    getApp().handlePrivacyAgree('profile-agree-privacy-btn');
    this.setData({ privacyReady: true });
    wx.showToast({ title: '请再点「微信授权手机号登录」', icon: 'none' });
  },

  onGetPhoneNumber(e) {
    const detail = e.detail || {};
    const errMsg = detail.errMsg || '';
    if (isDevtools() && !detail.code && !this._isPhoneAuthOk(errMsg)) {
      wx.showModal({
        title: '请在真机测试手机号',
        content: '开发者工具里通常不会出现手机号授权弹窗，请用「预览」扫码在真机点击「微信授权手机号登录」。',
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }
    if (errMsg.includes('deny') || errMsg.includes('cancel')) {
      wx.showToast({ title: '已取消手机号授权', icon: 'none' });
      return;
    }
    if (errMsg.includes('privacy') || errMsg.includes('privacy agreement')) {
      ensurePrivacyBeforeLogin();
      return;
    }
    const ok = this._isPhoneAuthOk(errMsg) || !!detail.code || !!detail.encryptedData;
    if (!ok) {
      const explained = explainGetPhoneNumberFail(detail);
      if (!explained) return;
      wx.showModal({
        title: explained.title,
        content: explained.content,
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }
    wx.showLoading({ title: '登录中', mask: true });
    app.loginByPhone(detail).then(() => {
      this.onShow();
      wx.showToast({ title: '登录成功', icon: 'success' });
    }).catch((err) => {
      wx.showModal({
        title: '手机号登录失败',
        content: (err && err.message) || '登录失败',
        showCancel: false,
      });
    }).finally(() => wx.hideLoading());
  },

  onPetCert() { wx.navigateTo({ url: '/pages/pet-cert/pet-cert' }); },

  onPoints() {
    wx.showModal({
      title: `我的积分 · ${this.data.pointsBalance || 0}`,
      content: '在友好地图完成有效标记，每次 +5 积分。礼品兑换即将上线，敬请期待。',
      showCancel: false,
      confirmText: '知道了',
    });
  },
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

  onOpenPetActivityArea() {
    const pet = this.data.pet || {};
    const lat = Number(pet.activityAreaLatitude);
    const lng = Number(pet.activityAreaLongitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      wx.navigateTo({ url: '/pages/pet-cert/pet-cert' });
      return;
    }
    wx.openLocation({
      latitude: lat,
      longitude: lng,
      name: pet.activityAreaName || '常活动区域',
      address: pet.activityAreaAddress || '',
      scale: 16,
    });
  },

  onEditPet() {
    if (!requireLogin()) return;
    wx.navigateTo({ url: '/pages/profile-edit/profile-edit' });
  },
  onMyBuddy() {
    if (!requireLogin()) return;
    wx.navigateTo({ url: '/pages/buddy/buddy' });
  },
  onMyPosts() {
    if (!requireLogin()) return;
    wx.switchTab({ url: '/pages/social/social' });
  },
  onMyEvents() {
    if (!requireLogin()) return;
    wx.navigateTo({ url: '/pages/my-events/my-events' });
  },
  onMyHelp() {
    if (!requireLogin()) return;
    wx.navigateTo({ url: '/pages/pet-rescue/pet-rescue' });
  },
  onClubApply() {
    if (!requireInteract()) return;
    wx.navigateTo({ url: '/pages/club-apply/club-apply' });
  },
  onMyClubs() {
    if (!requireLogin()) return;
    wx.navigateTo({ url: '/pages/my-clubs/my-clubs?tab=mine' });
  },
  onJoinedClubs() {
    if (!requireLogin()) return;
    wx.navigateTo({ url: '/pages/my-clubs/my-clubs?tab=joined' });
  },
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
      content: '退出后需重新登录才能同步云端数据',
      success: (res) => {
        if (!res.confirm) return;
        app.logout();
        this.setData({
          isLogin: false,
          userInfo: null,
        });
        wx.showToast({ title: '已退出登录', icon: 'none' });
      },
    });
  },
});
