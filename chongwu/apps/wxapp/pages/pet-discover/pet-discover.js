const { listAllBuddies, findBuddy } = require('../../utils/catalog');
const { HEALING_BUDDY_TYPES } = require('../../utils/mock');
const store = require('../../utils/store');
const cloudApi = require('../../utils/cloud-api');
const { refreshBuddyFeedFromCloud } = require('../../utils/buddy-cloud-sync');
const { resolveBuddyPosts } = require('../../utils/cloud-media');
const {
  refreshPetDiscoverFromCloud,
  swipeOnCloud,
  addShareBonusOnCloud,
} = require('../../utils/pet-discover-likes-cloud-sync');
const amap = require('../../utils/amap');
const { requireInteract } = require('../../utils/pet-profile-guard');
const { requireLogin } = require('../../utils/require-login');
const { buddyDistanceText } = require('../../utils/geo-distance');
const { autoLocateCity } = require('../../utils/city-location');

const SWIPE_THRESHOLD = 72;
const FLY_MS = 420;
const TAP_MOVE_PX = 10;
const MOVE_SETDATA_MS = 32;

function matchScore(id) {
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return 60 + (h % 40);
}

function mapDeckCard(b, viewerLocation) {
  const zone = b.zone || 'normal';
  const isHealing = zone === 'healing';
  const buddyType = b.buddyType || '宠友';
  const personalityTags = [b.personality, ...(b.tags || [])].filter(Boolean);
  const tags = isHealing
    ? [...new Set([buddyType, ...personalityTags])].slice(0, 5)
    : personalityTags.slice(0, 4);
  const distance = buddyDistanceText(b, viewerLocation) || '';
  return {
    id: b.id,
    cover: b.cover || b.avatar,
    userName: b.userName,
    petName: b.petName,
    breed: b.breed,
    distance,
    expectPlace: b.expectPlace || '同城',
    expectPlaceAddress: b.expectPlaceAddress || (b.location && b.location.address) || '',
    placeLat: (b.location && b.location.latitude) || '',
    placeLng: (b.location && b.location.longitude) || '',
    zone,
    isHealing,
    buddyType,
    desc: b.desc || '',
    tags,
    score: matchScore(b.id),
  };
}

function filterBuddyRows(discoverFilter, healingTypeFilter) {
  let list = listAllBuddies().filter((b) => !b.healingPetProfile);
  if (discoverFilter === 'healing') {
    list = list.filter((b) => (b.zone || 'normal') === 'healing');
    if (healingTypeFilter && healingTypeFilter !== '全部') {
      list = list.filter((b) => b.buddyType === healingTypeFilter);
    }
  } else if (discoverFilter === 'normal') {
    list = list.filter((b) => {
      const z = b.zone || 'normal';
      return z === 'normal';
    });
  }
  return list;
}

function buildDeck(discoverFilter = 'all', healingTypeFilter = '全部', viewerLocation) {
  const viewer = viewerLocation || store.getCityLocation();
  return filterBuddyRows(discoverFilter, healingTypeFilter).map((b) => mapDeckCard(b, viewer));
}

Page({
  data: {
    deck: [],
    dx: 0,
    dy: 0,
    rot: 0,
    cardScale: 1,
    underScale: 0.92,
    dragging: false,
    likeOp: 0,
    skipOp: 0,
    fly: '',
    likedCount: 0,
    likeLimit: 20,
    likeLeft: 20,
    showLikes: false,
    showShareQuota: false,
    likedList: [],
    likeBurst: false,
    actPulse: '',
    likeBonus: 0,
    shareLeft: 3,
    shareMax: 3,
    shareBonusTotal: 30,
    discoverFilter: 'all',
    healingTypeFilter: '全部',
    healingTypeOptions: ['全部', ...HEALING_BUDDY_TYPES],
  },

  onUnload() {
    if (this._moveFlushTimer) {
      clearTimeout(this._moveFlushTimer);
      this._moveFlushTimer = null;
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.reloadDeck();
    this.refreshQuota();
    this.refreshDiscoverInBackground();
  },

  refreshDiscoverInBackground() {
    if (this._discoverRefreshPromise) return this._discoverRefreshPromise;
    this._discoverRefreshPromise = (async () => {
      try {
        try {
          await autoLocateCity({ silent: true, force: false });
        } catch (e) {
          /* 使用已选城市中心估算距离 */
        }
        this.reloadDeck();
        if (!cloudApi.cloudEnabled()) return;
        await Promise.all([
          refreshBuddyFeedFromCloud({ limit: 80 }),
          refreshPetDiscoverFromCloud(),
        ]);
        const cached = store.listBuddyPosts();
        if (cached.some(
          (p) => (p.cover || '').startsWith('cloud://')
            || (p.avatar || '').startsWith('cloud://')
            || (p.mediaList || []).some((m) => (m.url || '').startsWith('cloud://')),
        )) {
          store.replaceAllBuddyPostsFromCloud(await resolveBuddyPosts(cached));
        }
        this.reloadDeck();
        this.refreshQuota();
      } catch (e) {
        // keep cache
      } finally {
        this._discoverRefreshPromise = null;
      }
    })();
    return this._discoverRefreshPromise;
  },

  reloadDeck() {
    const skipped = this._skipped || [];
    const { discoverFilter, healingTypeFilter } = this.data;
    const deck = buildDeck(discoverFilter, healingTypeFilter).filter(
      (c) => !skipped.some((s) => String(s) === String(c.id)),
    );
    this.setData({ deck });
  },

  onDiscoverFilter(e) {
    if (!requireInteract()) return;
    const discoverFilter = e.currentTarget.dataset.id;
    const patch = { discoverFilter };
    if (discoverFilter !== 'healing') {
      patch.healingTypeFilter = '全部';
    }
    this.setData(patch, () => this.reloadDeck());
  },

  onHealingTypeFilter(e) {
    if (!requireInteract()) return;
    const healingTypeFilter = e.currentTarget.dataset.type;
    this.setData({ healingTypeFilter }, () => this.reloadDeck());
  },

  refreshQuota() {
    const q = store.petLikeQuota();
    this.setData({
      likedCount: q.likedCount,
      likeLimit: q.limit,
      likeLeft: q.left,
      likeBonus: q.bonus,
      shareLeft: q.shareLeft,
      shareMax: q.shareMax,
      shareBonusTotal: q.shareMax * 10,
    });
  },

  openShareQuotaModal() {
    if (!requireInteract()) return;
    this.setData({ showShareQuota: true });
  },

  onCloseShareQuota() {
    this.setData({ showShareQuota: false });
  },

  async grantShareBonus() {
    if (!requireInteract()) return;
    const res = await addShareBonusOnCloud();
    this.refreshQuota();
    if (!res.ok) {
      wx.showToast({ title: '分享次数已满', icon: 'none' });
      return;
    }
    this.setData({ showShareQuota: false });
    wx.showToast({ title: `+${res.added} 次`, icon: 'none' });
  },

  hasSwipeQuota() {
    return store.petLikeQuota().left > 0;
  },

  commitSwipe(card, asLike) {
    swipeOnCloud(card, asLike).then((res) => {
      if (!res.ok && res.quota) {
        this.openShareQuotaModal();
      }
      this.refreshQuota();
    });
  },

  topCard() {
    return this.data.deck[0];
  },

  onCardStart(e) {
    if (this.data.fly) return;
    this._sx = e.touches[0].clientX;
    this._sy = e.touches[0].clientY;
    this._cardMoved = false;
    this.setData({ dragging: true });
  },

  flushCardMove() {
    if (!this._movePatch) return;
    const patch = this._movePatch;
    this._movePatch = null;
    this.setData(patch);
  },

  scheduleCardMovePatch(patch) {
    this._movePatch = patch;
    if (this._moveFlushTimer) return;
    this._moveFlushTimer = setTimeout(() => {
      this._moveFlushTimer = null;
      if (!this.data.dragging || this.data.fly) {
        this._movePatch = null;
        return;
      }
      this.flushCardMove();
    }, MOVE_SETDATA_MS);
  },

  onCardMove(e) {
    if (!this.data.dragging || this.data.fly) return;
    const dx = e.touches[0].clientX - this._sx;
    const rawDy = e.touches[0].clientY - this._sy;
    if (Math.abs(dx) > TAP_MOVE_PX || Math.abs(rawDy) > TAP_MOVE_PX) {
      this._cardMoved = true;
    }
    let dy = rawDy;
    dy = Math.max(-48, Math.min(48, dy * 0.35));
    const likeOp = Math.min(1, Math.max(0, dx / SWIPE_THRESHOLD));
    const skipOp = Math.min(1, Math.max(0, -dx / SWIPE_THRESHOLD));
    const cardScale = 1 + Math.min(0.035, Math.abs(dx) / 2800);
    const underScale = 0.92 + (likeOp + skipOp) * 0.05;
    this._lastDx = dx;
    this.scheduleCardMovePatch({
      dx,
      dy,
      rot: dx / 10,
      likeOp,
      skipOp,
      cardScale,
      underScale,
    });
  },

  onCardEnd() {
    if (!this.data.dragging || this.data.fly) return;
    if (this._moveFlushTimer) {
      clearTimeout(this._moveFlushTimer);
      this._moveFlushTimer = null;
    }
    this.flushCardMove();
    const dx = this._lastDx != null ? this._lastDx : this.data.dx;
    this._lastDx = null;
    const tap = !this._cardMoved && Math.abs(dx) <= TAP_MOVE_PX;
    this.setData({ dragging: false });
    if (dx > SWIPE_THRESHOLD) {
      this.handleLike({ fromSwipe: true });
      return;
    }
    if (dx < -SWIPE_THRESHOLD) {
      this.handleDislike({ fromSwipe: true });
      return;
    }
    if (tap) {
      this.openCardDetail();
    }
    this.resetCard();
  },

  openCardDetail() {
    if (!requireInteract()) return;
    const card = this.topCard();
    if (!card) return;
    wx.navigateTo({ url: `/pages/pet-discover-detail/pet-discover-detail?id=${card.id}` });
  },

  resetCard() {
    this.setData({
      dx: 0,
      dy: 0,
      rot: 0,
      likeOp: 0,
      skipOp: 0,
      cardScale: 1,
      underScale: 0.92,
    });
  },

  handleLike(opts = {}) {
    if (!requireLogin()) {
      if (opts.fromSwipe) this.resetCard();
      return;
    }
    if (this.data.fly || !this.topCard()) return;
    if (!this.hasSwipeQuota()) {
      this.openShareQuotaModal();
      if (opts.fromSwipe) this.resetCard();
      return;
    }
    const card = this.topCard();
    if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' });
    this.setData({ likeBurst: true, actPulse: 'like' });
    setTimeout(() => this.setData({ likeBurst: false, actPulse: '' }), 520);
    this.flyOut('right');
    this.commitSwipe(card, true);
    setTimeout(() => {
      wx.showToast({ title: `已喜欢 ${card.petName} 🐾`, icon: 'none' });
    }, 80);
  },

  handleDislike(opts = {}) {
    if (!requireLogin()) {
      if (opts.fromSwipe) this.resetCard();
      return;
    }
    if (this.data.fly || !this.topCard()) return;
    if (!this.hasSwipeQuota()) {
      this.openShareQuotaModal();
      if (opts.fromSwipe) this.resetCard();
      return;
    }
    const card = this.topCard();
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
    this.setData({ actPulse: 'dislike' });
    setTimeout(() => this.setData({ actPulse: '' }), 320);
    this.flyOut('left');
    this.commitSwipe(card, false);
  },

  onSkip() {
    this.handleDislike();
  },

  onLike() {
    this.handleLike({ fromSwipe: false });
  },

  flyOut(dir) {
    const card = this.topCard();
    if (!card) return;
    this._skipped = [...(this._skipped || []), card.id];
    const nudge = dir === 'right' ? SWIPE_THRESHOLD + 40 : -(SWIPE_THRESHOLD + 40);
    this.setData({
      fly: dir,
      dx: nudge,
      rot: dir === 'right' ? 12 : -12,
      likeOp: dir === 'right' ? 1 : 0,
      skipOp: dir === 'left' ? 1 : 0,
      cardScale: 1.02,
    });
    setTimeout(() => {
      this.setData({
        fly: '',
        dx: 0,
        dy: 0,
        rot: 0,
        likeOp: 0,
        skipOp: 0,
        cardScale: 1,
        underScale: 0.92,
        deck: this.data.deck.slice(1),
      });
    }, FLY_MS);
  },

  onOpenPlace(e) {
    if (!requireInteract()) return;
    amap.openPlaceFromTap(e);
  },

  onReload() {
    if (!requireInteract()) return;
    this._skipped = [];
    this.reloadDeck();
  },

  onOpenLikes() {
    if (!requireInteract()) return;
    const row = store.getPetLikes();
    const viewer = store.getCityLocation();
    const items = (row.items || []).map((item) => {
      const buddy = findBuddy(item.id);
      const distance = buddy ? buddyDistanceText(buddy, viewer) : '';
      return { ...item, distance: distance || item.distance || '' };
    });
    this.setData({ showLikes: true, likedList: items });
  },

  onCloseLikes() {
    this.setData({ showLikes: false });
  },

  onLikedTap(e) {
    if (!requireInteract()) return;
    const id = e.currentTarget.dataset.id;
    this.setData({ showLikes: false });
    wx.navigateTo({ url: `/pages/buddy-detail/buddy-detail?id=${id}` });
  },

  onShareAppMessage() {
    const q = store.petLikeQuota();
    if (q.left <= 0) this.grantShareBonus();
    return {
      title: '我家毛孩想找玩伴，来搭搭一起滑卡片吧 🐾',
      path: '/pages/pet-discover/pet-discover',
    };
  },

  onShareTimeline() {
    const q = store.petLikeQuota();
    if (q.left <= 0) this.grantShareBonus();
    return {
      title: '宠头头搭搭 · 让毛孩子遇见更好的伙伴',
    };
  },

  noop() {},
});
