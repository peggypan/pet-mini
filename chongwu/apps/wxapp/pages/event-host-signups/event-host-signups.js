const { findEvent } = require('../../utils/catalog');
const store = require('../../utils/store');
const { isEventOrganizer } = require('../../utils/event-organizer');
const cloudApi = require('../../utils/cloud-api');
const { fetchEventFromCloud } = require('../../utils/event-cloud-sync');
const {
  listSignupsByEventForHost,
  checkInSignupForHost,
} = require('../../utils/event-signup-cloud-sync');
const { parseCheckinFromScan } = require('../../utils/event-ticket');
const { scanTicketCode } = require('../../utils/scan-code');
const { buildHostSignupDetail } = require('../../utils/event-signup-host-detail');

Page({
  data: {
    eventId: '',
    event: null,
    list: [],
    checkedInCount: 0,
    loading: true,
    checkInDetail: null,
  },

  onLoad(options) {
    const eventId = options.eventId || options.id || '';
    if (!eventId) {
      wx.showToast({ title: '缺少活动', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 400);
      return;
    }
    let event = findEvent(eventId);
    if (event) {
      const isOwner = isEventOrganizer(event);
      if (!isOwner) {
        wx.showToast({ title: '仅发起人可查看', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 400);
        return;
      }
      this.setData({ eventId, event, loading: true });
      this.loadList();
    }
    if (!event && cloudApi.cloudEnabled()) {
      fetchEventFromCloud(eventId).then(() => {
        const loaded = findEvent(eventId);
        if (!loaded) {
          wx.showToast({ title: '活动不存在', icon: 'none' });
          setTimeout(() => wx.navigateBack(), 400);
          return;
        }
        const isOwner = isEventOrganizer(loaded);
        if (!isOwner) {
          wx.showToast({ title: '仅发起人可查看', icon: 'none' });
          setTimeout(() => wx.navigateBack(), 400);
          return;
        }
        this.setData({ eventId, event: loaded });
        this.loadList();
      }).catch(() => {
        if (!this.data.event) {
          wx.showToast({ title: '活动不存在', icon: 'none' });
          setTimeout(() => wx.navigateBack(), 400);
        }
      });
      return;
    }
    if (!event) {
      wx.showToast({ title: '活动不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 400);
      return;
    }
  },

  onShow() {
    if (this.data.eventId) this.loadList();
  },

  async loadList() {
    this.setData({ loading: true });
    try {
      const list = await listSignupsByEventForHost(this.data.eventId);
      const checkedInCount = list.filter((x) => x.checkedIn).length;
      this.setData({ list, checkedInCount, loading: false });
    } catch (e) {
      this.setData({ loading: false });
      const msg = String((e && e.message) || '加载失败');
      if (/未实现|501/.test(msg)) {
        wx.showModal({
          title: '云函数需更新',
          content: '请部署最新 cloudfunctions/api（含 event_signups.listByEvent / checkIn）',
          showCancel: false,
        });
      } else {
        wx.showToast({ title: msg.slice(0, 36), icon: 'none' });
      }
    }
  },

  onManualCheckIn() {
    wx.showModal({
      title: '输入核销码',
      editable: true,
      placeholderText: '如 VP3SSP',
      confirmText: '核销',
      success: (res) => {
        if (!res.confirm) return;
        const code = String(res.content || '').trim();
        if (!code) {
          wx.showToast({ title: '请输入核销码', icon: 'none' });
          return;
        }
        this.performCheckIn(parseCheckinFromScan(code));
      },
    });
  },

  async onScanCheckIn() {
    if (this._scanBusy) return;
    this._scanBusy = true;
    wx.showLoading({ title: '打开扫码…', mask: true });
    try {
      const raw = await scanTicketCode({
        beforeOpen: () => wx.hideLoading(),
      });
      const parsed = parseCheckinFromScan(raw);
      if (!parsed.ticketCode) {
        const hint = raw ? String(raw).slice(0, 48) : '';
        wx.showModal({
          title: '未识别核销码',
          content: hint
            ? `扫码内容无法解析（${hint}${raw.length > 48 ? '…' : ''}）。请扫参与者「已报名」里的最新二维码，或使用「输入核销码」。`
            : '请扫参与者「已报名」里的二维码，或使用「输入核销码」。',
          showCancel: false,
        });
        return;
      }
      await this.performCheckIn(parsed);
    } catch (err) {
      wx.hideLoading();
      const msg = String((err && err.errMsg) || (err && err.message) || err || '');
      if (/cancel|取消|privacy|隐私/.test(msg)) {
        if (/privacy|隐私/.test(msg)) {
          wx.showToast({ title: '请先同意隐私协议', icon: 'none' });
        }
        return;
      }
      if (/camera|摄像头|auth deny|authorize/.test(msg)) {
        wx.showToast({ title: '需要摄像头权限', icon: 'none' });
        return;
      }
      wx.showModal({
        title: '无法扫码',
        content: msg.slice(0, 120) || '请重试或使用「输入核销码」',
        showCancel: false,
      });
    } finally {
      this._scanBusy = false;
    }
  },

  async performCheckIn(parsed) {
    const ticketCode = (parsed && parsed.ticketCode) || '';
    if (!ticketCode) {
      wx.showToast({ title: '核销码无效', icon: 'none' });
      return;
    }
    if (parsed.eventId && String(parsed.eventId) !== String(this.data.eventId)) {
      wx.showToast({ title: '不是本活动的报名码', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '核销中…', mask: true });
    try {
      const result = await checkInSignupForHost(this.data.eventId, ticketCode);
      if (!result || !result.ok) {
        wx.showModal({
          title: '核销失败',
          content: (result && result.reason) || '未找到该报名记录',
          showCancel: false,
        });
        return;
      }
      const s = result.signup || {};
      const detail = buildHostSignupDetail(
        { ...s, checkedIn: true },
        result.participantPet || null,
      );
      detail.title = result.alreadyCheckedIn ? '已核销过' : '核销成功';
      this.setData({ checkInDetail: detail });
      await this.loadList();
    } catch (e) {
      wx.showModal({
        title: '核销失败',
        content: (e && e.message) || '请稍后重试',
        showCancel: false,
      });
    } finally {
      wx.hideLoading();
    }
  },

  onTapSignupRow(e) {
    const id = e.currentTarget.dataset.id;
    const row = (this.data.list || []).find(
      (x) => String(x.id || x._id) === String(id),
    );
    if (!row) return;
    this.setData({
      checkInDetail: buildHostSignupDetail(row, null),
    });
  },

  onCloseCheckInDetail() {
    this.setData({ checkInDetail: null });
  },

  onOpenParticipantPetCert() {
    const petId = this.data.checkInDetail && this.data.checkInDetail.petId;
    if (!petId) {
      wx.showToast({ title: '暂无关联宠物档案', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/pet-cert-verify/pet-cert-verify?petId=${encodeURIComponent(petId)}`,
    });
  },

  noop() {},
});
