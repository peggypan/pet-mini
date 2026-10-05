const store = require('../../utils/store');
const cloudApi = require('../../utils/cloud-api');
const { findClub } = require('../../utils/catalog');
const { fetchClubFromCloud } = require('../../utils/club-cloud-sync');
const { joinClubToCloud } = require('../../utils/club-member-cloud-sync');
const { requireLogin } = require('../../utils/require-login');
const { showClubJoinResult } = require('../../utils/club-join-feedback');

Page({
  data: {
    club: null,
    joined: false,
    isOwner: false,
  },

  onLoad(options) {
    this._clubId = options.id || '';
    this.loadClub(this._clubId);
  },

  onShow() {
    if (this._clubId) this.syncJoinState(this._clubId);
  },

  syncJoinState(clubId) {
    const joined = store.listJoinedClubs().some((c) => String(c.id) === String(clubId));
    const isOwner = store.listMyOwnedClubs().some((c) => String(c.id) === String(clubId));
    this.setData({ joined, isOwner });
  },

  async loadClub(id) {
    if (!id) {
      wx.showToast({ title: '缺少俱乐部信息', icon: 'none' });
      return;
    }
    let club = findClub(id);
    if (cloudApi.cloudEnabled()) {
      const remote = await fetchClubFromCloud(id);
      if (remote) club = remote;
    }
    if (!club) {
      wx.showModal({
        title: '俱乐部不存在',
        content: '可能已下线或未通过审核，请返回列表重试。',
        showCancel: false,
        success: () => wx.navigateBack(),
      });
      return;
    }
    wx.setNavigationBarTitle({ title: club.name || '俱乐部详情' });
    const joined = store.listJoinedClubs().some((c) => String(c.id) === String(id));
    const isOwner = store.listMyOwnedClubs().some((c) => String(c.id) === String(id));
    this.setData({ club, joined, isOwner });
  },

  async onJoin() {
    if (!requireLogin()) return;
    const { club } = this.data;
    if (!club) return;
    wx.showLoading({ title: '加入中…', mask: true });
    try {
      await joinClubToCloud(club);
      this.setData({ joined: true });
      showClubJoinResult(club, { ok: true });
    } catch (err) {
      showClubJoinResult(club, { ok: false, message: err.message });
    } finally {
      wx.hideLoading();
    }
  },

  onGoMyClubs() {
    wx.navigateTo({ url: '/pages/my-clubs/my-clubs?tab=joined' });
  },

  onChat() {
    const { club } = this.data;
    if (!club) return;
    wx.navigateTo({ url: `/pages/circle-community/circle-community?id=${club.id}` });
  },
});
