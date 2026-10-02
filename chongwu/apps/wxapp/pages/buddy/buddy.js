const { buddyTypesForZone, RISK_TIPS } = require('../../utils/mock');
const { listAllBuddies } = require('../../utils/catalog');
const { buildBuddyPlazaCard } = require('../../utils/buddy-plaza-card');
const { appendFeedItems, resetFeed } = require('../../utils/buddy-plaza-feed');
const store = require('../../utils/store');
const cloudApi = require('../../utils/cloud-api');
const { refreshBuddyFeedFromCloud } = require('../../utils/buddy-cloud-sync');
const { resolveBuddyPosts } = require('../../utils/cloud-media');
const { loadPetMap } = require('../../utils/pet-buddy-map');
const amap = require('../../utils/amap');
const { syncPetProfileGate, requirePetProfile } = require('../../utils/pet-profile-guard');
const { deleteOwnedBuddyPost } = require('../../utils/user-content-delete');

Page({
  data: {
    city: '北京',
    zoneTab: 'normal',
    buddyTypes: buddyTypesForZone('normal'),
    filterType: '全部',
    filterVerified: false,
    list: [],
    listHasMore: true,
    listLoading: false,
    matchTip: RISK_TIPS.match,
    healingTip: RISK_TIPS.healing,
    mapLatitude: 39.9042,
    mapLongitude: 116.4074,
    mapScale: 13,
    mapMarkers: [],
    mapPeerCount: 0,
    shareBuddy: null,
    petProfileBlocked: false,
  },

  decorateBuddy(row) {
    const o = store.getBuddyOverride(row.id) || {};
    const likes = o.likes != null ? o.likes : (row.likes != null ? row.likes : 8);
    const comments = o.comments != null ? o.comments : (row.comments != null ? row.comments : 2);
    const shares = o.shares != null ? o.shares : (row.shares != null ? row.shares : 0);
    const plaza = buildBuddyPlazaCard(row);
    return {
      ...row,
      ...plaza,
      likes,
      comments,
      shares,
      liked: !!o.liked,
      canDelete: !!(row.isMine || store.isMyUserContent(row)),
    };
  },

  filterSourceRows() {
    let list = listAllBuddies().filter((b) => b.zone === this.data.zoneTab);
    if (this.data.filterType !== '全部') {
      list = list.filter((b) => b.buddyType === this.data.filterType);
    }
    if (this.data.filterVerified) {
      list = list.filter((b) => b.verified);
    }
    return list;
  },

  async onShow() {
    syncPetProfileGate(this);
    this.setData({ city: store.getCity() });
    if (cloudApi.cloudEnabled()) {
      try {
        await refreshBuddyFeedFromCloud({ limit: 80 });
        const cached = store.listBuddyPosts();
        const needResolve = cached.some(
          (p) => (p.cover && p.cover.startsWith('cloud://'))
            || (p.avatar && p.avatar.startsWith('cloud://')),
        );
        if (needResolve) {
          store.replaceAllBuddyPostsFromCloud(await resolveBuddyPosts(cached));
        }
      } catch (e) {
        // keep cache
      }
    }
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
    this._sourceRows = this.filterSourceRows();
    const { list, hasMore } = resetFeed(this._sourceRows, (row) => this.decorateBuddy(row));
    this.setData({
      list,
      listHasMore: hasMore,
      listLoading: false,
    });
  },

  loadMoreFeed() {
    if (this.data.listLoading || !this.data.listHasMore) return;
    this.setData({ listLoading: true });
    const { list, hasMore } = appendFeedItems(
      this._sourceRows,
      this.data.list,
      (row) => this.decorateBuddy(row),
    );
    this.setData({
      list,
      listHasMore: hasMore,
      listLoading: false,
    });
  },

  onReachBottom() {
    this.loadMoreFeed();
  },

  onZoneTab(e) {
    const zoneTab = e.currentTarget.dataset.zone;
    this.setData(
      {
        zoneTab,
        buddyTypes: buddyTypesForZone(zoneTab),
        filterType: '全部',
      },
      () => this.reload(),
    );
  },

  onFilterType(e) {
    this.setData({ filterType: e.currentTarget.dataset.type }, () => this.reload());
  },

  onToggleVerified() {
    this.setData({ filterVerified: !this.data.filterVerified }, () => this.reload());
  },

  onCardTap(e) {
    if (!requirePetProfile()) return;
    wx.navigateTo({ url: `/pages/buddy-detail/buddy-detail?id=${e.currentTarget.dataset.id}` });
  },

  onOpenPlace(e) {
    amap.openPlaceFromTap(e);
  },

  onPreviewCover(e) {
    this.onPreviewMedia({
      currentTarget: { dataset: { id: e.currentTarget.dataset.id, index: 0 } },
    });
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

  async onDeleteBuddy(e) {
    const { id } = e.currentTarget.dataset;
    const res = await deleteOwnedBuddyPost(id, { title: '删除搭子帖' });
    if (!res.ok) {
      if (res.reason && !res.cancelled) wx.showToast({ title: res.reason, icon: 'none' });
      return;
    }
    this.reload();
  },

  onLikeTap(e) {
    if (!requirePetProfile()) return;
    const { id, feedKey } = e.currentTarget.dataset;
    const list = this.data.list.map((p) => {
      if (feedKey ? p.feedKey !== feedKey : String(p.id) !== String(id)) return p;
      const liked = !p.liked;
      const likes = liked ? (p.likes || 0) + 1 : Math.max(0, (p.likes || 0) - 1);
      store.updateBuddyEngagement(id, { liked, likes });
      store.recordPostThumbLike({
        channel: 'buddy',
        postId: id,
        liked,
        title: p.buddyType || p.desc || '搭子帖',
        cover: (p.mediaList && p.mediaList[0] && (p.mediaList[0].url || p.mediaList[0].poster))
          || p.cover
          || p.avatar,
        userName: p.userName,
        petName: p.petName,
      });
      return { ...p, liked, likes };
    });
    this.setData({ list });
  },

  onCommentTap(e) {
    if (!requirePetProfile()) return;
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/buddy-detail/buddy-detail?id=${id}&focus=comment` });
  },

  onShareTap(e) {
    const id = e.currentTarget.dataset.id;
    const buddy = this.data.list.find((b) => String(b.id) === String(id));
    if (buddy) this.setData({ shareBuddy: buddy });
  },

  onShareAppMessage() {
    const { shareBuddy } = this.data;
    if (shareBuddy) {
      const shares = (shareBuddy.shares || 0) + 1;
      store.updateBuddyEngagement(shareBuddy.id, { shares });
      return {
        title: `${shareBuddy.userName} · ${shareBuddy.petName} 找${shareBuddy.buddyType}`,
        path: `/pages/buddy-detail/buddy-detail?id=${shareBuddy.id}`,
      };
    }
    return {
      title: '宠头头 · 搭子广场',
      path: '/pages/buddy/buddy',
    };
  },

  onPublish() {
    if (!requirePetProfile()) return;
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
    if (this.data.zoneTab === 'healing') {
      wx.showModal({
        title: '疗愈搭子说明',
        content: RISK_TIPS.healing,
        confirmText: '我知道了',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/buddy-publish/buddy-publish?zone=healing' });
        },
      });
      return;
    }
    wx.navigateTo({ url: '/pages/buddy-publish/buddy-publish' });
  },
});
