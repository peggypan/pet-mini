const { BUDDY_TYPES, RISK_TIPS } = require('../../utils/mock');
const { listAllBuddies } = require('../../utils/catalog');
const store = require('../../utils/store');
const { loadPetMap } = require('../../utils/pet-buddy-map');

Page({
  data: {
    city: '北京',
    zoneTab: 'normal',
    buddyTypes: BUDDY_TYPES,
    filterType: '全部',
    filterVerified: false,
    list: [],
    matchTip: RISK_TIPS.match,
    mapLatitude: 39.9042,
    mapLongitude: 116.4074,
    mapScale: 13,
    mapMarkers: [],
    mapPeerCount: 0,
  },

  onShow() {
    this.setData({ city: store.getCity() });
    this.reload();
    loadPetMap(this);
  },

  onCityTap() {
    wx.navigateTo({ url: '/pages/city-picker/city-picker' });
  },

  onOpenBuddyMap() {
    wx.navigateTo({ url: '/pages/buddy-map/buddy-map' });
  },

  reload() {
    let list = listAllBuddies().filter((b) => b.zone === this.data.zoneTab);
    if (this.data.filterType !== '全部') {
      list = list.filter((b) => b.buddyType === this.data.filterType);
    }
    if (this.data.filterVerified) {
      list = list.filter((b) => b.verified);
    }
    this.setData({ list });
  },

  onZoneTab(e) {
    this.setData({ zoneTab: e.currentTarget.dataset.zone }, () => this.reload());
  },

  onFilterType(e) {
    this.setData({ filterType: e.currentTarget.dataset.type }, () => this.reload());
  },

  onToggleVerified() {
    this.setData({ filterVerified: !this.data.filterVerified }, () => this.reload());
  },

  onCardTap(e) {
    wx.navigateTo({ url: `/pages/buddy-detail/buddy-detail?id=${e.currentTarget.dataset.id}` });
  },

  onPreviewMedia(e) {
    const { id, index } = e.currentTarget.dataset;
    const buddy = this.data.list.find((b) => String(b.id) === String(id));
    const list = buddy?.mediaList || [];
    const item = list[Number(index)];
    if (!item) return;
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
    wx.previewImage({ urls: images.length ? images : [item.url], current: item.url });
  },

  onPublish() {
    if (this.data.zoneTab === 'match') {
      wx.showModal({
        title: '风险提示',
        content: RISK_TIPS.match,
        confirmText: '我知道了',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/buddy-publish/buddy-publish?zone=match' });
        },
      });
      return;
    }
    wx.navigateTo({ url: '/pages/buddy-publish/buddy-publish' });
  },
});
