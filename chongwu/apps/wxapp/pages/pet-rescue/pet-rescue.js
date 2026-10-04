const { RISK_TIPS } = require('../../utils/mock');
const { buildRescueList, filterRescueList } = require('../../utils/pet-rescue-list');
const amap = require('../../utils/amap');
const { requireInteract } = require('../../utils/pet-profile-guard');
const { deleteRescueItem } = require('../../utils/user-content-delete');
const cloudApi = require('../../utils/cloud-api');
const { refreshLocalPostsFromCloud } = require('../../utils/local-cloud-sync');
const { refreshSocialFeedFromCloud } = require('../../utils/social-cloud-sync');

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
    this.reload();
  },

  onShow() {
    this.reload();
  },

  onPullDownRefresh() {
    this.reload();
    wx.stopPullDownRefresh();
  },

  async reload() {
    try {
      if (cloudApi.cloudEnabled()) {
        await Promise.all([
          refreshSocialFeedFromCloud({ zone: 'all', limit: 80 }),
          refreshLocalPostsFromCloud({ type: 'all', limit: 80 }),
        ]);
      }
      const list = buildRescueList();
      this.applyFilter(list, this.data.filter);
      this.setData({ loadError: '' });
    } catch (err) {
      console.error('pet-rescue reload', err);
      this.setData({
        loadError: '加载失败，请下拉刷新或重新进入',
        list: [],
        displayList: [],
      });
    }
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
    this.reload();
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
