const { listAllBuddies } = require('../../utils/catalog');
const store = require('../../utils/store');

const SWIPE_THRESHOLD = 80;

// 由 id 生成稳定的缘分值（60-99），演示用
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
    dragging: false,
    likeOp: 0,
    skipOp: 0,
    fly: '',
    likeUsed: 0,
    likeLimit: 20,
    likeLeft: 20,
    showLikes: false,
    likedList: [],
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    // 会话内跳过的卡片不再出现，仅保留未处理的
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
    const dy = e.touches[0].clientY - this._sy;
    this.setData({
      dx,
      dy: dy * 0.3,
      rot: dx / 12,
      likeOp: Math.min(1, Math.max(0, dx / SWIPE_THRESHOLD)),
      skipOp: Math.min(1, Math.max(0, -dx / SWIPE_THRESHOLD)),
    });
  },

  onCardEnd() {
    if (!this.data.dragging || this.data.fly) return;
    const { dx } = this.data;
    this.setData({ dragging: false });
    if (dx > SWIPE_THRESHOLD) return this.flyOut('right');
    if (dx < -SWIPE_THRESHOLD) return this.flyOut('left');
    this.resetCard();
  },

  resetCard() {
    this.setData({ dx: 0, dy: 0, rot: 0, likeOp: 0, skipOp: 0 });
  },

  onSkip() {
    if (this.data.fly || !this.topCard()) return;
    this.flyOut('left');
  },

  onLike() {
    if (this.data.fly || !this.topCard()) return;
    const card = this.topCard();
    const res = store.addPetLike(card);
    if (!res.ok && res.quota) {
      wx.showToast({ title: '今日喜欢次数已用完', icon: 'none' });
      return;
    }
    this.refreshQuota();
    wx.showToast({ title: `已喜欢 ${card.petName} 🐾`, icon: 'none' });
    this.flyOut('right');
  },

  flyOut(dir) {
    const card = this.topCard();
    if (!card) return;
    this._skipped = [...(this._skipped || []), card.id];
    this.setData({ fly: dir });
    setTimeout(() => {
      this.setData({
        fly: '',
        dx: 0,
        dy: 0,
        rot: 0,
        likeOp: 0,
        skipOp: 0,
        deck: this.data.deck.slice(1),
      });
    }, 320);
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
