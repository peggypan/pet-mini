const { findEvent, getDefaultPet } = require('../../utils/catalog');
const { isHealingEvent } = require('../../utils/event-plaza');
const { RISK_TIPS } = require('../../utils/mock');
const store = require('../../utils/store');
const { isEventOrganizer } = require('../../utils/event-organizer');
const amap = require('../../utils/amap');
const { drawQrCanvas } = require('../../utils/qrcode');
const { requireInteract } = require('../../utils/pet-profile-guard');
const { deleteOwnedEvent, finishAfterDelete } = require('../../utils/user-content-delete');
const cloudApi = require('../../utils/cloud-api');
const { fetchEventFromCloud, recordEventInterest } = require('../../utils/event-cloud-sync');
const {
  fetchMySignupByEvent,
  saveSignupToCloud,
} = require('../../utils/event-signup-cloud-sync');
const { ensureChatThreadOnCloud } = require('../../utils/chat-cloud-sync');
const { buildEventDetailSection, buildEventCoverImages } = require('../../utils/event-detail-content');
const { applyEventQuota } = require('../../utils/event-quota');
const { petExtrasFromProfile } = require('../../utils/event-signup-host-detail');

function readUserPhone() {
  const info = wx.getStorageSync('userInfo') || {};
  return info.phone || info.mobile || '';
}

function normalizeSignupRow(signup, event, defaults) {
  if (!signup) return null;
  const merged = {
    ...signup,
    eventId: signup.eventId || event.id,
    title: signup.title || signup.eventTitle || event.title,
    contactName: signup.contactName || (defaults && defaults.contactName) || '宠友',
    phone: signup.phone || (defaults && defaults.phone) || '',
    petName: signup.petName || (defaults && defaults.petName) || '',
    petBreed: signup.petBreed || (defaults && defaults.petBreed) || '',
  };
  if (!merged.ticketCode && event && event.id) {
    return store.ensureEventSignupTicket(event.id, defaults) || merged;
  }
  return merged;
}

Page({
  data: {
    event: null,
    coverImages: [],
    coverCurrent: 0,
    detailSection: { show: false, text: '', images: [], media: [] },
    isOwner: false,
    signedUp: false,
    eventSafetyTip: RISK_TIPS.event,
    showTicket: false,
    signup: null,
    ticketPayload: '',
    ticketQrReady: false,
  },

  async onLoad(options) {
    let eventId = options.id || '';
    if (!eventId && options.scene) {
      const scene = decodeURIComponent(String(options.scene));
      eventId = scene.replace(/^id=/, '').trim();
    }
    await this.loadEventDetail(eventId, options);
  },

  paintEventDetail(event, options = {}, signedUp) {
    if (!event) return;
    const isOwner = isEventOrganizer(event);
    const applied = applyEventQuota(event);
    this._eventId = applied.id;
    this.setData({
      event: applied,
      coverImages: buildEventCoverImages(applied),
      coverCurrent: 0,
      detailSection: buildEventDetailSection(applied),
      signedUp: isOwner ? false : !!signedUp,
      isOwner,
    });
    wx.setNavigationBarTitle({ title: '约局详情' });
    return { event: applied, isOwner, signedUp: !!signedUp };
  },

  async loadEventDetail(id, options = {}) {
    let cached = findEvent(id);
    if (cached) {
      const signedUpLocal = store.listEventSignups().some(
        (x) => String(x.eventId) === String(cached.id),
      );
      this.paintEventDetail(cached, options, signedUpLocal);
    }
    if (cloudApi.cloudEnabled() && id) {
      await fetchEventFromCloud(id);
    }
    const event = findEvent(id);
    if (!event) {
      if (!cached) wx.showToast({ title: '活动不存在', icon: 'none' });
      return;
    }
    let signedUp = store.listEventSignups().some((x) => String(x.eventId) === String(event.id));
    if (cloudApi.cloudEnabled()) {
      const mine = await fetchMySignupByEvent(event.id);
      signedUp = !!mine;
    }
    const painted = this.paintEventDetail(event, options, signedUp);
    if (isHealingEvent(painted.event)) {
      wx.showModal({ title: '疗愈活动说明', content: RISK_TIPS.healingEvent, showCancel: false });
    }
    if (options.ticket === '1' && painted.signedUp && !painted.isOwner) {
      this.openTicket();
    }
    if (!painted.isOwner && painted.event.id) {
      this.trackEventBrowse(painted.event.id);
    }
  },

  trackEventBrowse(eventId) {
    recordEventInterest(eventId)
      .then(() => {
        const updated = applyEventQuota(findEvent(eventId) || this.data.event);
        if (updated) this.setData({ event: updated });
      })
      .catch(() => {});
  },

  async refreshEventQuota() {
    const id = this._eventId || (this.data.event && this.data.event.id);
    if (!id) return;
    if (cloudApi.cloudEnabled()) {
      await fetchEventFromCloud(id);
    }
    const event = applyEventQuota(findEvent(id) || this.data.event);
    if (event) this.setData({ event });
  },

  onShow() {
    const event = this.data.event;
    if (!event) return;
    const signedUpLocal = store.listEventSignups().some(
      (x) => String(x.eventId) === String(event.id),
    );
    this.setData({ signedUp: this.data.isOwner ? false : signedUpLocal });
    this.refreshEventDetailOnShow();
  },

  refreshEventDetailOnShow() {
    if (this._eventDetailShowRefresh) return;
    this._eventDetailShowRefresh = (async () => {
      const event = this.data.event;
      if (!event) return;
      try {
        await this.refreshEventQuota();
        let signedUp = store.listEventSignups().some(
          (x) => String(x.eventId) === String(event.id),
        );
        if (cloudApi.cloudEnabled()) {
          signedUp = !!(await fetchMySignupByEvent(event.id));
        }
        this.setData({ signedUp: this.data.isOwner ? false : signedUp });
        if (!this.data.isOwner && event.id) {
          this.trackEventBrowse(event.id);
        }
      } finally {
        this._eventDetailShowRefresh = null;
      }
    })();
  },

  onOpenPlace() {
    amap.openPlace(this.data.event || {});
  },

  onSignupTap() {
    if (!requireInteract()) return;
    const { event, isOwner } = this.data;
    if (!event) return;
    if (isOwner) {
      wx.navigateTo({
        url: `/pages/event-host-signups/event-host-signups?eventId=${event.id}`,
      });
      return;
    }
    this.openTicket();
  },

  drawTicketQrWithRetry(payload, attempt = 0) {
    return drawQrCanvas(this, 'ticketQrCanvas', payload).catch(() => {
      if (attempt >= 10) {
        wx.showToast({ title: '二维码生成失败', icon: 'none' });
        return false;
      }
      return new Promise((resolve) => {
        setTimeout(resolve, 150 + attempt * 60);
      }).then(() => this.drawTicketQrWithRetry(payload, attempt + 1));
    });
  },

  presentTicket(signup, event) {
    const row = signup || null;
    if (!row) return Promise.resolve();
    const ticketQrText = store.buildTicketQrContent(row);
    const patch = {
      signedUp: true,
      showTicket: true,
      signup: row,
      ticketPayload: ticketQrText,
      ticketQrReady: false,
    };
    if (event) {
      const cached = store.getEventFromCache(event.id);
      if (cached) {
        patch.event = applyEventQuota({ ...event, ...cached });
      }
    }
    return new Promise((resolve) => {
      this.setData(patch, () => {
        setTimeout(() => {
          this.drawTicketQrWithRetry(ticketQrText)
            .then((ok) => {
              if (ok !== false) this.setData({ ticketQrReady: true });
            })
            .finally(resolve);
        }, 200);
      });
    });
  },

  /**
   * 参与者报名并弹出核销二维码（发起人不可走此流程）
   */
  async openTicket() {
    if (!requireInteract()) return;
    const { event, isOwner } = this.data;
    if (!event) return;
    if (isOwner) {
      wx.navigateTo({
        url: `/pages/event-host-signups/event-host-signups?eventId=${event.id}`,
      });
      return;
    }
    const pet = getDefaultPet();
    const profile = store.getUserProfile();
    const defaults = {
      contactName: profile.nickname || '宠友',
      phone: readUserPhone(),
      petName: pet.name || '我家毛孩',
      petBreed: pet.breed || pet.breedName || '',
      petExtras: petExtrasFromProfile(pet),
    };

    const wasSignedUp = this.data.signedUp;
    wx.showLoading({ title: wasSignedUp ? '加载中…' : '报名中…', mask: true });
    try {
      let signup;
      let justSignedUp = false;
      if (cloudApi.cloudEnabled()) {
        signup = await fetchMySignupByEvent(event.id);
        if (!signup) {
          const res = await saveSignupToCloud(event, defaults);
          signup = res.signup;
          justSignedUp = !res.duplicated;
        } else {
          signup = store.ensureEventSignupTicket(event.id, defaults) || signup;
        }
      } else {
        signup = store.getEventSignupByEventId(event.id);
        if (!signup) {
          const res = store.addEventSignup(event, defaults);
          signup = res.signup;
          justSignedUp = !res.duplicated;
        } else {
          signup = store.ensureEventSignupTicket(event.id, defaults);
        }
      }
      signup = normalizeSignupRow(signup, event, defaults);
      if (!signup) throw new Error('报名失败');

      await this.presentTicket(signup, event);
      if (justSignedUp) {
        wx.showToast({ title: '报名成功', icon: 'success', duration: 1200 });
      }
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '报名失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onCloseTicket() {
    this.setData({ showTicket: false, ticketQrReady: false });
  },

  onSharePoster() {
    const { event } = this.data;
    if (!event) return;
    wx.navigateTo({ url: `/pages/event-poster/event-poster?id=${event.id}` });
  },

  async onChatHost() {
    if (!requireInteract()) return;
    const { event, isOwner } = this.data;
    if (!event) return;
    if (isOwner) {
      wx.showToast({ title: '这是您发起的活动', icon: 'none' });
      return;
    }
    const peerOpenid = event.openid || event._openid || '';
    const peerId = peerOpenid || event.hostId || event.publisherId || `host_${event.id}`;
    const peerNameRaw = event.host || '主理人';
    const petNameRaw = event.hostPetName || '活动主理';
    const avatarRaw = event.hostAvatar || '';
    const localThread = store.ensureChatThread({
      id: `c_${peerId}`,
      peerId,
      peerOpenid,
      peerName: peerNameRaw,
      petName: petNameRaw,
      avatar: avatarRaw,
    });
    const threadId = (localThread && localThread.id) || `c_${peerId}`;
    const q = [
      `threadId=${encodeURIComponent(threadId)}`,
      `peerId=${encodeURIComponent(peerId)}`,
      peerOpenid ? `peerOpenid=${encodeURIComponent(peerOpenid)}` : '',
      `peerName=${encodeURIComponent(peerNameRaw)}`,
      `petName=${encodeURIComponent(petNameRaw)}`,
      `avatar=${encodeURIComponent(avatarRaw)}`,
      `attachEventId=${encodeURIComponent(event.id)}`,
    ].filter(Boolean);
    wx.navigateTo({ url: `/pages/chat/chat?${q.join('&')}` });
    if (cloudApi.cloudEnabled()) {
      ensureChatThreadOnCloud({
        id: threadId,
        peerId,
        peerOpenid,
        peerName: peerNameRaw,
        petName: petNameRaw,
        avatar: avatarRaw,
      }).catch(() => {});
    }
  },

  onShareAppMessage() {
    const { event } = this.data;
    if (!event) {
      return { title: '宠头头 · 同城宠物活动', path: '/pages/events/events' };
    }
    return {
      title: event.title || '一起来参加宠物活动',
      path: `/pages/event-detail/event-detail?id=${event.id}`,
      imageUrl: (this.data.coverImages && this.data.coverImages[0]) || event.cover || '',
    };
  },

  onCoverSwiperChange(e) {
    const current = Number(e.detail.current);
    if (!Number.isNaN(current)) {
      this.setData({ coverCurrent: current });
    }
  },

  onPreviewDetailImage(e) {
    const { src } = e.currentTarget.dataset;
    const urls = this.data.detailSection.images || [];
    if (!urls.length) return;
    wx.previewImage({ urls, current: src || urls[0] });
  },

  onPreviewCover(e) {
    const { src } = e.currentTarget.dataset;
    const urls = this.data.coverImages || [];
    if (!urls.length) return;
    wx.previewImage({ urls, current: src || urls[0] });
  },

  async onDeleteEvent() {
    const { event, isOwner } = this.data;
    if (!event || !isOwner) return;
    const res = await deleteOwnedEvent(event.id);
    if (!res.ok) {
      if (res.reason && !res.cancelled) wx.showToast({ title: res.reason, icon: 'none' });
      return;
    }
    finishAfterDelete('/pages/events/events');
  },

  noop() {},
});
