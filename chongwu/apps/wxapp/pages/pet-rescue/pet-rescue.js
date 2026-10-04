const { RISK_TIPS } = require('../../utils/mock');
const { buildRescueList, filterRescueList } = require('../../utils/pet-rescue-list');
const amap = require('../../utils/amap');
const { requireInteract } = require('../../utils/pet-profile-guard');
const { deleteRescueItem } = require('../../utils/user-content-delete');
const cloudApi = require('../../utils/cloud-api');
const { refreshLocalPostsFromCloud } = require('../../utils/local-cloud-sync');
const { refreshSocialFeedFromCloud } = require('../../utils/social-cloud-sync');
const { resolveLocalPosts, resolveSocialPosts } = require('../../utils/cloud-media');
const store = require('../../utils/store');

function postsNeedCloudResolve(list, extraKeys) {
  return (list || []).some((p) => {
    const urls = [
      p.image,
      p.cover,
      ...(p.images || []),
      ...((p.mediaList || []).flatMap((m) => [m && m.url, m && m.poster])),
    ];
    if (urls.some((u) => u && String(u).startsWith('cloud://'))) return true;
    return (extraKeys || []).some((k) => p[k] && String(p[k]).startsWith('cloud://'));
  });
}

Page({
  data: {
    filter: 'all',
    filters: [
      { id: 'all', name: '全部' },
      { id: 'lost', name: '寻宠' },
      { id: 'found', name: '招领' },
      { id: 'rescue', name: '救助' },
      { id: 'adopt', name: '领养' },
    ],
    list: [],
    displayList: [],
    riskAdopt: RISK_TIPS.adopt,
    loadError: '',
  },

  onLoad() {
    this.paintFromCache();
  },

  onShow() {
    this.paintFromCache();
    if (cloudApi.cloudEnabled()) {
      this.refreshRescueInBackground();
    }
  },

  onPullDownRefresh() {
    if (cloudApi.cloudEnabled()) {
      this.refreshRescueInBackground(true).finally(() => wx.stopPullDownRefresh());
    } else {
      this.paintFromCache();
      wx.stopPullDownRefresh();
    }
  },

  paintFromCache() {
    try {
      const list = buildRescueList();
      this.applyFilter(list, this.data.filter);
      this.setData({ loadError: '' });
    } catch (err) {
      console.error('pet-rescue paintFromCache', err);
      this.setData({
        loadError: '加载失败，请下拉刷新或重新进入',
        list: [],
        displayList: [],
      });
    }
  },

  refreshRescueInBackground(force) {
    if (this._rescueRefreshPromise && !force) return this._rescueRefreshPromise;
    this._rescueRefreshPromise = (async () => {
      try {
        await Promise.all([
          refreshLocalPostsFromCloud({ type: 'all', limit: 80 }),
          refreshSocialFeedFromCloud({ zone: 'all', limit: 80 }),
        ]);
        let localPosts = store.listLocalPosts();
        if (postsNeedCloudResolve(localPosts)) {
          localPosts = await resolveLocalPosts(localPosts);
          store.replaceAllLocalPostsFromCloud(localPosts);
        }
        let socialPosts = store.listSocialPosts();
        if (postsNeedCloudResolve(socialPosts, ['avatar'])) {
          socialPosts = await resolveSocialPosts(socialPosts);
          store.replaceAllSocialPostsFromCloud(socialPosts);
        }
        this.paintFromCache();
        this.setData({ loadError: '' });
      } catch (err) {
        console.error('pet-rescue refresh', err);
        if (!this.data.displayList.length) {
          this.setData({ loadError: '加载失败，请下拉刷新或重新进入' });
        }
      } finally {
        this._rescueRefreshPromise = null;
      }
    })();
    return this._rescueRefreshPromise;
  },

  applyFilter(list, filter) {
    const displayList = filterRescueList(list, filter);
    this.setData({ list, displayList });
  },

  onFilter(e) {
    const filter = e.currentTarget.dataset.id;
    this.setData({ filter });
    this.applyFilter(this.data.list, filter);
  },

  onPublishLost() {
    if (!requireInteract()) return;
    wx.navigateTo({ url: '/pages/lost-publish/lost-publish' });
  },

  onPublishAdopt() {
    if (!requireInteract()) return;
    wx.navigateTo({ url: '/pages/lost-publish/lost-publish?mode=rescue-adopt&postType=adopt' });
  },

  async onDeleteItem(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.list.find((x) => x.id === id);
    if (!item || !item.canDelete) return;
    const res = await deleteRescueItem(item);
    if (!res.ok) {
      if (res.reason && !res.cancelled) wx.showToast({ title: res.reason, icon: 'none' });
      return;
    }
    this.paintFromCache();
    if (cloudApi.cloudEnabled()) {
      this.refreshRescueInBackground(true);
    }
  },

  onOpenPlace(e) {
    amap.openPlaceFromTap(e);
  },

  onItemTap(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.list.find((x) => x.id === id);
    if (!item) return;

    if (item.source === 'social' && item.refId) {
      wx.navigateTo({ url: '/pages/social-detail/social-detail?id=' + item.refId });
      return;
    }

    if (item.source === 'local' && item.refId) {
      wx.navigateTo({
        url: `/pages/social-detail/social-detail?id=${item.refId}&source=local`,
      });
    }
  },
});
