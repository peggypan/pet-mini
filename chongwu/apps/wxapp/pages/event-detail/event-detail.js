const { findEvent, getDefaultPet } = require('../../utils/catalog');
const { isHealingEvent } = require('../../utils/event-plaza');
const { RISK_TIPS } = require('../../utils/mock');
const store = require('../../utils/store');
const amap = require('../../utils/amap');
const { drawQrCanvas } = require('../../utils/qrcode');
const { requirePetProfile } = require('../../utils/pet-profile-guard');
const { deleteOwnedEvent, finishAfterDelete } = require('../../utils/user-content-delete');
const cloudApi = require('../../utils/cloud-api');
const { fetchEventFromCloud } = require('../../utils/event-cloud-sync');
const {
  fetchMySignupByEvent,
  saveSignupToCloud,
} = require('../../utils/event-signup-cloud-sync');
const { ensureChatThreadOnCloud } = require('../../utils/chat-cloud-sync');
const { buildEventDetailSection, buildEventCoverImages } = require('../../utils/event-detail-content');

function readUserPhone() {
  const info = wx.getStorageSync('userInfo') || {};
  return info.phone || info.mobile || '';
}

Page({
  data: {
    event: null,
    coverImages: [],
    coverCurrent: 0,
    detailSection: { show: false, text: '', images: [], media: [] },
    detailImageCurrent: 0,
    isOwner: false,
    signedUp: false,
    eventSafetyTip: RISK_TIPS.event,
    showTicket: false,
    signup: null,
    ticketPayload: '',
  },

  async onLoad(options) {
    let eventId = options.id || '';
    if (!eventId && options.scene) {
      const scene = decodeURIComponent(String(options.scene));
      eventId = scene.replace(/^id=/, '').trim();
    }
    await this.loadEventDetail(eventId, options);
  },

  async loadEventDetail(id, options = {}) {
    let event = findEvent(id);
    if (!event && cloudApi.cloudEnabled() && id) {
      const row = await fetchEventFromCloud(id);
      event = row ? findEvent(id) : null;
    }
    if (!event) {
      wx.showToast({ title: '活动不存在', icon: 'none' });
      return;
    }
    this._eventId = event.id;
    let signedUp = store.listEventSignups().some((x) => String(x.eventId) === String(event.id));
    if (cloudApi.cloudEnabled()) {
      const mine = await fetchMySignupByEvent(event.id);
      signedUp = !!mine;
    }
    const isOwner = event.isMine === true || !!store.getMyEvent(event.id);
    this.setData({
      event,
      coverImages: buildEventCoverImages(event),
      coverCurrent: 0,
      detailSection: buildEventDetailSection(event),
      detailImageCurrent: 0,
      signedUp,
      isOwner,
    });
    wx.setNavigationBarTitle({ title: '约局详情' });
    if (isHealingEvent(event)) {
      wx.showModal({ title: '疗愈活动说明', content: RISK_TIPS.healingEvent, showCancel: false });
    }
    if (options.ticket === '1' && signedUp) {
      this.openTicket();
    }
  },

  async onShow() {
    const event = this.data.event;
    if (!event) return;
    let signedUp = store.listEventSignups().some((x) => String(x.eventId) === String(event.id));
    if (cloudApi.cloudEnabled()) {
      signedUp = !!(await fetchMySignupByEvent(event.id));
    }
    this.setData({ signedUp });
  },

  onOpenPlace() {
    amap.openPlace(this.data.event || {});
  },

  onSignup() {
    if (!requirePetProfile()) return;
    if (this.data.isOwner) {
      wx.navigateTo({ url: '/pages/my-events/my-events' });
      return;
    }
    if (this.data.signedUp) {
      this.openTicket();
      return;
    }
    this.openTicket();
  },

  /**
   * 报名并弹出核销二维码，码内含报名人和宠物信息
   */
  async openTicket() {
    if (!requirePetProfile()) return;
    const { event } = this.data;
    if (!event) return;
    const pet = getDefaultPet();
    const profile = store.getUserProfile();
    const defaults = {
      contactName: profile.nickname || '宠友',
      phone: readUserPhone(),
      petName: pet.name || '我家毛孩',
      petBreed: pet.breed || pet.breedName || '',
    };

    wx.showLoading({ title: '报名中…', mask: true });
    try {
      let signup;
      if (cloudApi.cloudEnabled()) {
        signup = await fetchMySignupByEvent(event.id);
        if (!signup) {
          const res = await saveSignupToCloud(event, defaults);
          signup = res.signup;
        } else {
          signup = store.ensureEventSignupTicket(event.id, defaults) || signup;
        }
      } else {
        signup = store.getEventSignupByEventId(event.id);
      }
      if (!cloudApi.cloudEnabled()) {
        if (!signup) {
          signup = store.addEventSignup(event, defaults).signup;
        } else {
          signup = store.ensureEventSignupTicket(event.id, defaults);
        }
      }

      const ticketPayload = store.buildTicketPayload(signup);
      const patch = { signedUp: true, showTicket: true, signup, ticketPayload };
      if (cloudApi.cloudEnabled()) {
        const cached = store.getEventFromCache(event.id);
        if (cached) patch.event = { ...event, remain: cached.remain, signupCount: cached.signupCount };
      }
      this.setData(patch, () => {
        setTimeout(() => {
          drawQrCanvas(this, 'ticketQr', ticketPayload).catch(() => {
            wx.showToast({ title: '二维码绘制失败', icon: 'none' });
          });
        }, 80);
      });
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '报名失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onCloseTicket() {
    this.setData({ showTicket: false });
  },

  onSharePoster() {
    const { event } = this.data;
    if (!event) return;
    wx.navigateTo({ url: `/pages/event-poster/event-poster?id=${event.id}` });
  },

  async onChatHost() {
    if (!requirePetProfile()) return;
    const { event, isOwner } = this.data;
    if (!event) return;
    if (isOwner) {
      wx.showToast({ title: '这是您发起的活动', icon: 'none' });
      return;
    }
    const peerId = event.hostId || event.publisherId || `host_${event.id}`;
    const peerNameRaw = event.host || '主理人';
    const petNameRaw = event.hostPetName || '活动主理';
    const avatarRaw = event.hostAvatar || '';
    wx.showModal({
      title: '发起私聊',
      content: `将向「${peerNameRaw}」发起私信。${RISK_TIPS.meet}`,
      confirmText: '去聊天',
      success: async (res) => {
        if (!res.confirm) return;
        await ensureChatThreadOnCloud({
          id: `c_${peerId}`,
          peerId,
          peerName: peerNameRaw,
          petName: petNameRaw,
          avatar: avatarRaw,
        });
        const peerName = encodeURIComponent(peerNameRaw);
        const petName = encodeURIComponent(petNameRaw);
        const avatar = encodeURIComponent(avatarRaw);
        wx.navigateTo({
          url: `/pages/chat/chat?peerId=${peerId}&peerName=${peerName}&petName=${petName}&avatar=${avatar}`,
        });
      },
    });
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

  onDetailImageSwiperChange(e) {
    const current = Number(e.detail.current);
    if (!Number.isNaN(current)) {
      this.setData({ detailImageCurrent: current });
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
