const { findBuddy } = require('../../utils/catalog');
const { RISK_TIPS } = require('../../utils/mock');
const store = require('../../utils/store');
const { startBuddyChat } = require('../../utils/buddy-chat');
const amap = require('../../utils/amap');
const { followResultToast } = require('../../utils/pet-follow');
const { requirePetProfile } = require('../../utils/pet-profile-guard');
const { deleteOwnedBuddyPost, finishAfterDelete } = require('../../utils/user-content-delete');

Page({
  data: { buddy: null, followed: false, collected: false, isOwner: false },

  onLoad(options) {
    const raw = findBuddy(options.id);
    if (!raw) {
      wx.showToast({ title: '搭子不存在', icon: 'none' });
      return;
    }
    let autoPlayAssigned = false;
    const mediaList = (raw.mediaList || []).map((item) => {
      if (item.type !== 'video') return item;
      const demoOnly = !item.url || item.url === item.poster;
      const videoAutoPlay = !demoOnly && !autoPlayAssigned;
      if (videoAutoPlay) autoPlayAssigned = true;
      return { ...item, videoDemoOnly: demoOnly, videoAutoPlay };
    });
    const buddy = { ...raw, mediaList };
    this.setData({
      buddy,
      followed: store.isFollowed(buddy.id),
      collected: store.isCollected(buddy.id),
      isOwner: store.isMyUserContent(raw),
    });
    if (buddy.zone === 'match') {
      wx.showModal({ title: '风险提示', content: RISK_TIPS.match, showCancel: false });
    } else if (buddy.zone === 'healing') {
      wx.showModal({ title: '疗愈搭子说明', content: RISK_TIPS.healing, showCancel: false });
    }
  },

  onChat() {
    startBuddyChat(this.data.buddy);
  },

  onFollow() {
    if (!requirePetProfile()) return;
    const result = store.toggleFollow(this.data.buddy);
    this.setData({ followed: result.followed });
    wx.showToast({ title: followResultToast(result.followed), icon: 'none' });
  },

  onCollectBuddy() {
    if (!requirePetProfile()) return;
    const result = store.toggleCollect(this.data.buddy);
    this.setData({ collected: result.collected });
    wx.showToast({
      title: result.collected ? '已收藏搭子' : '已取消收藏',
      icon: 'none',
    });
  },

  async onDeleteBuddy() {
    const buddy = this.data.buddy;
    if (!buddy || !this.data.isOwner) return;
    const res = await deleteOwnedBuddyPost(buddy.id, { title: '删除搭子帖' });
    if (!res.ok) {
      if (res.reason && !res.cancelled) wx.showToast({ title: res.reason, icon: 'none' });
      return;
    }
    finishAfterDelete('/pages/buddy/buddy');
  },

  onReport() {
    wx.showToast({ title: '举报已提交审核', icon: 'none' });
  },

  onShare() {
    const buddy = this.data.buddy;
    if (!buddy) return;
    store.updateBuddyEngagement(buddy.id, { shares: (buddy.shares || 0) + 1 });
  },

  onShareAppMessage() {
    const buddy = this.data.buddy;
    if (!buddy) {
      return { title: '宠头头 · 搭子详情', path: '/pages/buddy/buddy' };
    }
    return {
      title: `${buddy.userName} · ${buddy.petName} 找${buddy.buddyType || '搭子'}`,
      path: `/pages/buddy-detail/buddy-detail?id=${buddy.id}`,
      imageUrl: buddy.cover || buddy.avatar || '',
    };
  },

  onOpenPlace() {
    amap.openPlace(this.data.buddy || {});
  },

  onCert() {
    wx.navigateTo({ url: '/pages/pet-cert/pet-cert' });
  },

  onPreviewMedia(e) {
    const index = Number(e.currentTarget.dataset.index);
    const list = this.data.buddy?.mediaList || [];
    const item = list[index];
    if (!item) return;
    if (item.type === 'video' && item.videoAutoPlay) return;
    if (item.type === 'video') {
      if (!item.url || item.url === item.poster) {
        wx.showToast({ title: '演示视频暂不可播放', icon: 'none' });
        return;
      }
      wx.previewMedia({
        sources: [{ url: item.url, type: 'video', poster: item.poster || '' }],
      });
      return;
    }
    const images = list.filter((m) => m.type === 'image').map((m) => m.url);
    wx.previewImage({ urls: images, current: item.url });
  },
});
