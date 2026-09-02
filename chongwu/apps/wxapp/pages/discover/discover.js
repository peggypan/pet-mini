const { MOCK_SOCIAL, MOCK_NEARBY } = require('../../utils/mock');
const store = require('../../utils/store');

Page({
  data: {
    topics: MOCK_SOCIAL.topics,
    events: MOCK_SOCIAL.events,
    friends: [],
    filter: 'all',
    filters: [
      { id: 'all', name: '全部' },
      { id: 'dog', name: '狗狗' },
      { id: 'cat', name: '猫咪' },
      { id: 'other', name: '异宠' },
    ],
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.reloadFriends();
  },

  reloadFriends(filterId) {
    const filter = filterId || this.data.filter;
    const follows = store.listFollows();
    const all = MOCK_NEARBY.map((f) => ({
      ...f,
      followed: follows.some((x) => String(x.id) === String(f.id)),
    }));
    this.applyFilter(filter, all);
  },

  applyFilter(filterId, friends) {
    let list = friends || [];
    if (filterId === 'dog') list = list.filter((f) => f.species === 2);
    if (filterId === 'cat') list = list.filter((f) => f.species === 1);
    if (filterId === 'other') list = list.filter((f) => f.species === 3);
    this.setData({ filter: filterId, friends: list });
  },

  onFilter(e) {
    this.reloadFriends(e.currentTarget.dataset.id);
  },

  onTopicTap(e) {
    const { name } = e.currentTarget.dataset;
    wx.switchTab({ url: '/pages/social/social' });
    wx.showToast({ title: `已筛选 ${name}`, icon: 'none' });
  },

  onEventTap(e) {
    wx.navigateTo({ url: `/pages/event-detail/event-detail?id=${e.currentTarget.dataset.id}` });
  },

  onFollowTap(e) {
    const { id } = e.currentTarget.dataset;
    const friend = MOCK_NEARBY.find((f) => String(f.id) === String(id));
    if (!friend) return;
    const result = store.toggleFollow(friend);
    wx.showToast({
      title: result.followed ? '已关注宠友' : '已取消关注',
      icon: 'none',
    });
    this.reloadFriends();
  },

  onChatTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/chat/chat?peerId=${id}` });
  },

  onCardTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/chat/chat?peerId=${id}` });
  },
});
