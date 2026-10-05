const store = require('../../utils/store');
const cloudApi = require('../../utils/cloud-api');
const { refreshClubsFromCloud } = require('../../utils/club-cloud-sync');
const {
  refreshJoinedClubsFromCloud,
  joinClubToCloud,
  leaveClubFromCloud,
} = require('../../utils/club-member-cloud-sync');
const { listRecommendClubs, findClub } = require('../../utils/catalog');
const { showClubJoinResult } = require('../../utils/club-join-feedback');

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
    this.applyClubsFromCache();
    if (cloudApi.cloudEnabled()) {
      this.refreshClubsInBackground();
    }
  },

  applyClubsFromCache() {
    let myClubs = store.listMyOwnedClubs();
    if (!myClubs.length) {
      const apply = store.getClubApply();
      if (apply) {
        const approved = apply.status === 'approved';
        myClubs = [{ ...apply, name: apply.name || apply.clubName, status: approved ? 'approved' : 'pending' }];
      }
    } else {
      myClubs = myClubs.map((c) => ({
        ...c,
        status: c.onlineStatus === 'online' ? 'approved' : c.onlineStatus || 'pending',
      }));
    }

    const joined = store.listJoinedClubs();
    const joinedIds = new Set(joined.map((j) => String(j.id)));
    const mineIds = new Set(myClubs.map((c) => String(c.id)));
    const recommendClubs = listRecommendClubs().filter(
      (c) => !joinedIds.has(String(c.id)) && !mineIds.has(String(c.id)),
    );

    this.setData({
      myClubs,
      joinedClubs: joined,
      recommendClubs,
    });
  },

  refreshClubsInBackground() {
    if (this._clubsRefreshPromise) return this._clubsRefreshPromise;
    this._clubsRefreshPromise = (async () => {
      try {
        await refreshClubsFromCloud({ city: store.getCity(), limit: 50 });
        await refreshJoinedClubsFromCloud();
        this.applyClubsFromCache();
      } catch (e) {
        // keep cache
      } finally {
        this._clubsRefreshPromise = null;
      }
    })();
    return this._clubsRefreshPromise;
  },

  async refresh() {
    this.applyClubsFromCache();
    if (cloudApi.cloudEnabled()) {
      await this.refreshClubsInBackground();
    }
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  onGoApply() {
    const { requireInteract } = require('../../utils/pet-profile-guard');
    if (!requireInteract()) return;
    wx.navigateTo({ url: '/pages/club-apply/club-apply' });
  },

  onOpenClub(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/club-detail/club-detail?id=${id}` });
  },

  async onJoin(e) {
    const { requireLogin } = require('../../utils/require-login');
    if (!requireLogin()) return;
    const club = findClub(e.currentTarget.dataset.id);
    if (!club) {
      wx.showToast({ title: '俱乐部信息无效', icon: 'none', duration: 2800 });
      return;
    }
    wx.showLoading({ title: '加入中…', mask: true });
    try {
      await joinClubToCloud(club);
      await this.refresh();
      showClubJoinResult(club, { ok: true });
    } catch (err) {
      showClubJoinResult(club, { ok: false, message: err.message });
    } finally {
      wx.hideLoading();
    }
  },

  onLeave(e) {
    const id = e.currentTarget.dataset.id;
    const club = this.data.joinedClubs.find((c) => String(c.id) === String(id));
    wx.showModal({
      title: '退出俱乐部',
      content: `确定退出「${club ? club.name : ''}」？`,
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中', mask: true });
        try {
          await leaveClubFromCloud(id);
          await this.refresh();
        } catch (err) {
          wx.showToast({ title: err.message || '退出失败', icon: 'none' });
        } finally {
          wx.hideLoading();
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
