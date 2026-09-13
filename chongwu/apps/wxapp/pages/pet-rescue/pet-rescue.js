const { RISK_TIPS } = require('../../utils/mock');
const { buildRescueList, filterRescueList } = require('../../utils/pet-rescue-list');

Page({
  data: {
    filter: 'all',
    filters: [
      { id: 'all', name: '全部' },
      { id: 'lost', name: '寻宠' },
      { id: 'found', name: '招领' },
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

  reload() {
    try {
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
    wx.navigateTo({ url: '/pages/lost-publish/lost-publish' });
  },

  onPublishAdopt() {
    wx.navigateTo({ url: '/pages/adopt-publish/adopt-publish' });
  },

  onItemTap(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.list.find((x) => x.id === id);
    if (!item) return;

    if (item.source === 'social' && item.refId) {
      wx.navigateTo({ url: '/pages/social-detail/social-detail?id=' + item.refId });
      return;
    }

    if (item.kind === 'adopt') {
      const lines = [item.desc || item.preview, item.contact ? '联系：' + item.contact : ''].filter(Boolean);
      wx.showModal({
        title: item.title,
        content: lines.join('\n\n'),
        showCancel: false,
      });
    }
  },
});
