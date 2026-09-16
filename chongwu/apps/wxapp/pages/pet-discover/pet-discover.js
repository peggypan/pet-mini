const { listAllBuddies } = require('../../utils/catalog');
const store = require('../../utils/store');

const SWIPE_THRESHOLD = 72;
const FLY_MS = 420;

function matchScore(id) {
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return 60 + (h % 40);
}

function buildDeck() {
  return listAllBuddies().map((b) => ({
    id: b.id,
    cover: b.cover || b.avatar,
    userName: b.userName,
    petName: b.petName,
    breed: b.breed,
    distance: b.distance,
    expectPlace: b.expectPlace || '同城',
    buddyType: b.buddyType || '宠友',
    desc: b.desc || '',
    tags: [b.personality, ...(b.tags || [])].filter(Boolean).slice(0, 4),
    score: matchScore(b.id),
  }));
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
    likeUsed: 0,
    likeLimit: 20,
    likeLeft: 20,
    showLikes: false,
    likedList: [],
    likeBurst: false,
    actPulse: '',
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    const skipped = this._skipped || [];
    const deck = buildDeck().filter((c) => !skipped.some((s) => String(s) === String(c.id)));
    this.setData({ deck });
    this.refreshQuota();
  },

  refreshQuota() {
    const q = store.petLikeQuota();
    this.setData({ likeUsed: q.used, likeLimit: q.limit, likeLeft: q.left });
  },

  topCard() {
    return this.data.deck[0];
  },

  onCardStart(e) {
    if (this.data.fly) return;
    this._sx = e.touches[0].clientX;
    this._sy = e.touches[0].clientY;
    this.setData({ dragging: true });
  },

  onCardMove(e) {
    if (!this.data.dragging || this.data.fly) return;
    const dx = e.touches[0].clientX - this._sx;
    let dy = e.touches[0].clientY - this._sy;
    dy = Math.max(-48, Math.min(48, dy * 0.35));
    const likeOp = Math.min(1, Math.max(0, dx / SWIPE_THRESHOLD));
    const skipOp = Math.min(1, Math.max(0, -dx / SWIPE_THRESHOLD));
    const cardScale = 1 + Math.min(0.035, Math.abs(dx) / 2800);
    const underScale = 0.92 + (likeOp + skipOp) * 0.05;
    this.setData({
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
    const { dx } = this.data;
    this.setData({ dragging: false });
    if (dx > SWIPE_THRESHOLD) {
      this.handleLike({ fromSwipe: true });
      return;
    }
    if (dx < -SWIPE_THRESHOLD) {
      this.handleDislike();
      return;
    }
    this.resetCard();
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

  tryAddLike() {
    const card = this.topCard();
    if (!card) return false;
    const res = store.addPetLike(card);
    if (!res.ok && res.quota) {
      wx.showToast({ title: '今日喜欢次数已用完', icon: 'none' });
      return false;
    }
    this.refreshQuota();
    return true;
  },

  handleLike(opts = {}) {
    if (this.data.fly || !this.topCard()) return;
    if (!this.tryAddLike()) {
      if (opts.fromSwipe) this.resetCard();
      return;
    }
    const card = this.topCard();
    if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' });
    wx.showToast({ title: `已喜欢 ${card.petName} 🐾`, icon: 'none' });
    this.setData({ likeBurst: true, actPulse: 'like' });
    setTimeout(() => this.setData({ likeBurst: false, actPulse: '' }), 520);
    this.flyOut('right');
  },

  handleDislike() {
    if (this.data.fly || !this.topCard()) return;
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
    this.setData({ actPulse: 'dislike' });
    setTimeout(() => this.setData({ actPulse: '' }), 320);
    this.flyOut('left');
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

  onReload() {
    this._skipped = [];
    this.setData({ deck: buildDeck() });
  },

  onOpenLikes() {
    const row = store.getPetLikes();
    this.setData({ showLikes: true, likedList: row.items });
  },

  onCloseLikes() {
    this.setData({ showLikes: false });
  },

  onLikedTap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ showLikes: false });
    wx.navigateTo({ url: `/pages/buddy-detail/buddy-detail?id=${id}` });
  },

  noop() {},
});
