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
const { syncPetProfileGate, requireInteract } = require('../../utils/pet-profile-guard');
const { deleteOwnedBuddyPost } = require('../../utils/user-content-delete');
const { autoLocateCity } = require('../../utils/city-location');

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
    petProfileBlocked: false,
  },

  decorateBuddy(row) {
    const o = store.getBuddyOverride(row.id) || {};
    const likes = o.likes != null ? o.likes : (row.likes != null ? row.likes : 8);
    const comments = o.comments != null ? o.comments : (row.comments != null ? row.comments : 2);
    const shares = o.shares != null ? o.shares : (row.shares != null ? row.shares : 0);
    const plaza = buildBuddyPlazaCard(row, store.getCityLocation());
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

  onLoad() {
    this.setData({ city: store.getCity() });
    this.reload();
  },

  onShow() {
    syncPetProfileGate(this);
    this.setData({ city: store.getCity() });
    this.reload();
    loadPetMap(this);
    this.refreshBuddyFeedInBackground();
  },

  refreshBuddyFeedInBackground() {
    if (this._buddyFeedRefreshPromise) return this._buddyFeedRefreshPromise;
    this._buddyFeedRefreshPromise = (async () => {
      try {
        try {
          await autoLocateCity({ silent: true, force: false });
        } catch (e) {
          /* 无定位权限时用已选城市中心估算 */
        }
        this.setData({ city: store.getCity() });
        this.reload();
        if (!cloudApi.cloudEnabled()) return;
        await refreshBuddyFeedFromCloud({ limit: 80 });
        const cached = store.listBuddyPosts();
        const needResolve = cached.some(
          (p) => (p.cover && p.cover.startsWith('cloud://'))
            || (p.avatar && p.avatar.startsWith('cloud://'))
            || (p.mediaList || []).some(
              (m) => (m.url && m.url.startsWith('cloud://'))
                || (m.poster && m.poster.startsWith('cloud://')),
            ),
        );
        if (needResolve) {
          store.replaceAllBuddyPostsFromCloud(await resolveBuddyPosts(cached));
        }
        this.reload();
        loadPetMap(this);
      } catch (e) {
        // keep cache
      } finally {
        this._buddyFeedRefreshPromise = null;
      }
    })();
    return this._buddyFeedRefreshPromise;
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

  onShareAppMessage() {
    return {
      title: '遛搭搭 · 搭子广场',
      path: '/pages/buddy/buddy',
    };
  },

  onPublish() {
    if (!requireInteract()) return;
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
