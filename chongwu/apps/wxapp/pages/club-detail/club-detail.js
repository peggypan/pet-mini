const store = require('../../utils/store');
const cloudApi = require('../../utils/cloud-api');
const { findClub } = require('../../utils/catalog');
const { fetchClubFromCloud } = require('../../utils/club-cloud-sync');
const { joinClubToCloud } = require('../../utils/club-member-cloud-sync');
const { requireLogin } = require('../../utils/require-login');
const { showClubJoinResult } = require('../../utils/club-join-feedback');

function clubMatchesApply(clubId, club) {
  const apply = store.getClubApply();
  if (!apply) return false;
  const ids = [apply.id, apply.clubId].filter(Boolean).map(String);
  if (clubId && ids.includes(String(clubId))) return true;
  if (club && apply.name && club.name === apply.name) return true;
  if (club && apply.clubName && club.name === apply.clubName) return true;
  return false;
}

function resolveIsOwner(clubId, club, fromApply) {
  if (club && (club.isOwner || club.isMine)) return true;
  if (clubId && store.listMyOwnedClubs().some((c) => String(c.id) === String(clubId))) return true;
  if (clubMatchesApply(clubId, club)) return true;
  if (fromApply) return true;
  return false;
}

Page({
  data: {
    club: null,
    joined: false,
    isOwner: false,
    auditPending: false,
  },

  onLoad(options) {
    this._clubId = options.id || '';
    this._fromApply = options.fromApply === '1';
    this.loadClub(this._clubId);
  },

  onShow() {
    if (this._clubId) this.syncJoinState(this._clubId);
  },

  syncJoinState(clubId) {
    const joined = store.listJoinedClubs().some((c) => String(c.id) === String(clubId));
    const isOwner = resolveIsOwner(clubId, this.data.club, this._fromApply);
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
      if (remote) club = store.mapClubFromCloud(remote) || remote;
    }
    if (!club && this._fromApply) {
      const apply = store.getClubApply();
      if (apply) {
        club = {
          id: apply.id || apply.clubId || id || 'apply',
          name: apply.name || apply.clubName || '我的俱乐部',
          city: apply.city || '',
          intro: apply.intro || '',
          cover: apply.cover || '',
          members: 0,
          owner: '我',
          onlineStatus: apply.status === 'approved' ? 'online' : 'pending',
          auditPending: apply.status !== 'approved',
        };
      }
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
    const isOwner = resolveIsOwner(id, club, this._fromApply);
    this.setData({
      club,
      joined,
      isOwner,
      auditPending: !!club.auditPending || club.onlineStatus === 'pending',
    });
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

  onViewApply() {
    const id = this._clubId || (this.data.club && this.data.club.id) || '';
    wx.navigateTo({
      url: `/pages/club-apply/club-apply?mode=view${id ? `&clubId=${id}` : ''}`,
    });
  },

  onEditApply() {
    const id = this._clubId || (this.data.club && this.data.club.id) || '';
    wx.navigateTo({
      url: `/pages/club-apply/club-apply?mode=edit${id ? `&clubId=${id}` : ''}`,
    });
  },

  onChat() {
    const { club } = this.data;
    if (!club) return;
    wx.navigateTo({ url: `/pages/circle-community/circle-community?id=${club.id}` });
  },
});
