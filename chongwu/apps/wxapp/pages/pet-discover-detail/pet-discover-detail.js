const { findBuddy } = require('../../utils/catalog');
const { startBuddyChat } = require('../../utils/buddy-chat');
const amap = require('../../utils/amap');
const store = require('../../utils/store');
const { buddyDistanceText } = require('../../utils/geo-distance');

function matchScore(id) {
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return 60 + (h % 40);
}

function displayTags(raw) {
  const zone = raw.zone || 'normal';
  const isHealing = zone === 'healing';
  const buddyType = raw.buddyType || '宠友';
  const personalityTags = [raw.personality, ...(raw.tags || [])].filter(Boolean);
  return isHealing
    ? [...new Set([buddyType, ...personalityTags])].slice(0, 6)
    : personalityTags.slice(0, 5);
}

Page({
  data: {
    buddy: null,
    score: 0,
    displayTags: [],
    previewUrls: [],
  },

  onLoad(options) {
    const raw = findBuddy(options.id);
    if (!raw) {
      wx.showToast({ title: '搭子不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 600);
      return;
    }
    const zone = raw.zone || 'normal';
    const previewUrls = (raw.mediaList || [])
      .map((m) => (m.type === 'image' ? m.url : m.poster || m.url))
      .filter(Boolean);
    const cover = raw.cover || raw.avatar;
    if (cover && !previewUrls.includes(cover)) {
      previewUrls.unshift(cover);
    }
    const distance = buddyDistanceText(raw, store.getCityLocation()) || '';
    this.setData({
      buddy: {
        ...raw,
        cover,
        isHealing: zone === 'healing',
        expectPlace: raw.expectPlace || '同城',
        distance,
      },
      score: matchScore(raw.id),
      displayTags: displayTags(raw),
      previewUrls,
    });
  },

  onChat() {
    startBuddyChat(this.data.buddy);
  },

  onShare() {
    const buddy = this.data.buddy;
    if (!buddy) return;
    store.updateBuddyEngagement(buddy.id, { shares: (buddy.shares || 0) + 1 });
  },

  onShareAppMessage() {
    const buddy = this.data.buddy;
    if (!buddy) {
      return { title: '宠头头 · 搭搭', path: '/pages/pet-discover/pet-discover' };
    }
    return {
      title: `${buddy.userName} · ${buddy.petName} 找${buddy.buddyType || '搭子'}`,
      path: `/pages/pet-discover-detail/pet-discover-detail?id=${buddy.id}`,
      imageUrl: buddy.cover || buddy.avatar || '',
    };
  },

  onOpenPlace() {
    amap.openPlace(this.data.buddy || {});
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = this.data.previewUrls;
    if (!url || !urls.length) return;
    wx.previewImage({ current: url, urls });
  },
});
