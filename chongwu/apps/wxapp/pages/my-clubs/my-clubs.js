const store = require('../../utils/store');
const { MOCK_CLUBS } = require('../../utils/mock');

Page({
  data: {
    tab: 'mine',
    myClubs: [],
    joinedClubs: [],
    recommendClubs: [],
  },

  onLoad(options) {
    if (options.tab) this.setData({ tab: options.tab });
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const apply = store.getClubApply();
    // 演示：提交即视为审核中，超过 10 秒自动视为已上线
    let myClubs = [];
    if (apply) {
      const approved = apply.status === 'approved' || Date.now() - new Date(apply.submittedAt).getTime() > 10 * 1000;
      myClubs = [{ ...apply, status: approved ? 'approved' : 'pending' }];
    }
    const joined = store.listJoinedClubs();
    this.setData({
      myClubs,
      joinedClubs: joined,
      recommendClubs: MOCK_CLUBS.filter((c) => !joined.some((j) => String(j.id) === String(c.id))),
    });
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  onGoApply() {
    wx.navigateTo({ url: '/pages/club-apply/club-apply' });
  },

  onJoin(e) {
    const club = MOCK_CLUBS.find((c) => String(c.id) === String(e.currentTarget.dataset.id));
    if (!club) return;
    store.joinClub(club);
    this.refresh();
    wx.showToast({ title: '已加入', icon: 'success' });
  },

  onLeave(e) {
    const id = e.currentTarget.dataset.id;
    const club = this.data.joinedClubs.find((c) => String(c.id) === String(id));
    wx.showModal({
      title: '退出俱乐部',
      content: `确定退出「${club ? club.name : ''}」？`,
      success: (res) => {
        if (res.confirm) {
          store.leaveClub(id);
          this.refresh();
        }
      },
    });
  },

  onChat(e) {
    const club = this.data.joinedClubs.find((c) => String(c.id) === String(e.currentTarget.dataset.id));
    if (!club) return;
    wx.navigateTo({
      url: `/pages/circle-community/circle-community?id=${club.id}`,
    });
  },
});
