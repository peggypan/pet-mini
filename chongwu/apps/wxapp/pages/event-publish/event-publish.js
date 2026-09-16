const store = require('../../utils/store');
const { pickMixedMedia, MEDIA_LIMIT_HINT, mediaSlots } = require('../../utils/media-upload');
const { ROLE_LABEL } = require('../../utils/event-qualify');
const { getDefaultPet } = require('../../utils/catalog');
const amap = require('../../utils/amap');

const WEEKS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const CATEGORIES = ['遛狗社交', '撸猫社交', '宠物聚会', '萌宠摄影', '宠物科普', '爱心领养', '赛事举办', '其他'];
const REFUND_POLICIES = ['随时退 · 开场前全额退', '开场前24小时可退', '一旦报名不退不改'];
const SIGNUP_SCOPES = ['所有人', '仅限女生', '仅限男生', '仅限认证宠友'];

function newSessionId() {
  return `s_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function formatToday() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

Page({
  data: {
    role: 'personal',
    roleLabel: ROLE_LABEL,
    eventType: 'single',
    eventSessions: [{ id: 's_default', date: '', time: '' }],
    categories: CATEGORIES,
    categoryIndex: -1,
    category: '',
    title: '',
    place: '',
    placeAddress: '',
    location: null,
    eventDate: '',
    eventTime: '',
    today: formatToday(),
    refundPolicy: '',
    price: '',
    feeIncludes: '',
    maxPeople: '20',
    deadlineDate: '',
    deadlineTime: '',
    signupScope: '所有人',
    timedSignup: false,
    timedDate: '',
    timedTime: '',
    timedLabel: '不使用定时报名',
    desc: '',
    mediaList: [],
    mediaLimitHint: MEDIA_LIMIT_HINT,
    mediaCanAdd: true,
    mediaSummary: '0/6 图 · 0/3 视频',
  },

  onLoad(options) {
    const role = options.role === 'merchant' ? 'merchant' : 'personal';
    const draft = store.getDraft('event_publish');
    if (draft) {
      const categoryIndex = draft.category
        ? CATEGORIES.indexOf(draft.category)
        : (draft.categoryIndex != null ? draft.categoryIndex : -1);
      this.setData({ ...draft, categoryIndex: categoryIndex >= 0 ? categoryIndex : -1 });
      this.refreshTimedLabel();
      if (draft.mediaList && draft.mediaList.length) {
        this.syncMediaUI(draft.mediaList);
      }
    }
    this.setData({ role });
  },

  onShow() {},

  onSwitchRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ role });
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ eventDate: e.detail.value });
  },

  onTimeChange(e) {
    this.setData({ eventTime: e.detail.value });
  },

  onEventType(e) {
    const type = e.currentTarget.dataset.type;
    if (type === 'multi') {
      let { eventSessions, eventDate, eventTime } = this.data;
      if (!eventSessions || !eventSessions.length) {
        eventSessions = [{ id: newSessionId(), date: eventDate || '', time: eventTime || '' }];
      }
      this.setData({ eventType: 'multi', eventSessions });
      return;
    }
    const first = (this.data.eventSessions || [])[0];
    this.setData({
      eventType: 'single',
      eventDate: first?.date || this.data.eventDate,
      eventTime: first?.time || this.data.eventTime,
    });
  },

  onCategoryChange(e) {
    const categoryIndex = Number(e.detail.value);
    this.setData({
      categoryIndex,
      category: CATEGORIES[categoryIndex] || '',
    });
  },

  onAddSession() {
    const eventSessions = [...(this.data.eventSessions || []), { id: newSessionId(), date: '', time: '' }];
    this.setData({ eventSessions });
  },

  onRemoveSession(e) {
    const index = Number(e.currentTarget.dataset.index);
    const eventSessions = (this.data.eventSessions || []).filter((_, i) => i !== index);
    if (!eventSessions.length) {
      wx.showToast({ title: '至少保留一场', icon: 'none' });
      return;
    }
    this.setData({ eventSessions });
  },

  onSessionDateChange(e) {
    const index = Number(e.currentTarget.dataset.index);
    const eventSessions = (this.data.eventSessions || []).map((s, i) => (
      i === index ? { ...s, date: e.detail.value } : s
    ));
    this.setData({ eventSessions });
  },

  onSessionTimeChange(e) {
    const index = Number(e.currentTarget.dataset.index);
    const eventSessions = (this.data.eventSessions || []).map((s, i) => (
      i === index ? { ...s, time: e.detail.value } : s
    ));
    this.setData({ eventSessions });
  },

  onPickRefund() {
    wx.showActionSheet({
      itemList: REFUND_POLICIES,
      success: (res) => this.setData({ refundPolicy: REFUND_POLICIES[res.tapIndex] }),
    });
  },

  onPickScope() {
    wx.showActionSheet({
      itemList: SIGNUP_SCOPES,
      success: (res) => this.setData({ signupScope: SIGNUP_SCOPES[res.tapIndex] }),
    });
  },

  onDeadlineDate(e) {
    this.setData({ deadlineDate: e.detail.value });
  },

  onDeadlineTime(e) {
    this.setData({ deadlineTime: e.detail.value });
  },

  onToggleTimed() {
    this.setData({ timedSignup: !this.data.timedSignup }, () => this.refreshTimedLabel());
  },

  onTimedDate(e) {
    this.setData({ timedDate: e.detail.value }, () => this.refreshTimedLabel());
  },

  onTimedTime(e) {
    this.setData({ timedTime: e.detail.value }, () => this.refreshTimedLabel());
  },

  refreshTimedLabel() {
    const { timedSignup, timedDate, timedTime } = this.data;
    const label = !timedSignup
      ? '不使用定时报名'
      : (timedDate || timedTime ? `${timedDate || ''} ${timedTime || ''}`.trim() : '选择开始时间');
    this.setData({ timedLabel: label });
  },

  formatEventTime() {
    const { eventType, eventDate, eventTime, eventSessions } = this.data;
    const fmtOne = (dateStr, timeStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr.replace(/-/g, '/'));
      const label = `${+d.getMonth() + 1}月${d.getDate()}日 ${WEEKS[d.getDay()]}`;
      return timeStr ? `${label} ${timeStr}` : label;
    };
    if (eventType === 'multi') {
      const parts = (eventSessions || [])
        .map((s) => fmtOne(s.date, s.time))
        .filter(Boolean);
      return parts.length ? `多场次 · ${parts.join('；')}` : '';
    }
    return fmtOne(eventDate, eventTime);
  },

  // 点击地点行直接跳转系统地图选点
  onChoosePlace() {
    amap.choosePoint()
      .then((loc) => {
        this.setData({
          place: loc.name || loc.address || '已选地点',
          placeAddress: loc.address || '',
          location: {
            name: loc.name,
            address: loc.address,
            latitude: loc.latitude,
            longitude: loc.longitude,
          },
        });
      })
      .catch((err) => {
        const msg = (err && err.errMsg) || '';
        if (msg.includes('cancel')) return;
        if (msg.includes('auth deny') || msg.includes('authorize')) {
          wx.showModal({
            title: '需要位置权限',
            content: '地图选点需要授权位置信息，请在设置中开启',
            confirmText: '去设置',
            success: (r) => { if (r.confirm) wx.openSetting(); },
          });
          return;
        }
        wx.showToast({ title: '选点失败，请重试', icon: 'none' });
      });
  },

  onDraft() {
    const d = this.data;
    store.setDraft('event_publish', {
      role: d.role,
      eventType: d.eventType,
      eventSessions: d.eventSessions,
      category: d.category,
      title: d.title,
      place: d.place,
      placeAddress: d.placeAddress,
      location: d.location,
      eventDate: d.eventDate,
      eventTime: d.eventTime,
      refundPolicy: d.refundPolicy,
      price: d.price,
      feeIncludes: d.feeIncludes,
      maxPeople: d.maxPeople,
      deadlineDate: d.deadlineDate,
      deadlineTime: d.deadlineTime,
      signupScope: d.signupScope,
      timedSignup: d.timedSignup,
      timedDate: d.timedDate,
      timedTime: d.timedTime,
      desc: d.desc,
    });
    wx.showToast({ title: '草稿已保存', icon: 'success' });
  },

  syncMediaUI(list) {
    const slots = mediaSlots(list);
    this.setData({
      mediaList: list,
      mediaCanAdd: slots.canAddAny,
      mediaSummary: slots.summary,
    });
  },

  onChooseMedia() {
    pickMixedMedia(this.data.mediaList)
      .then((list) => this.syncMediaUI(list))
      .catch(() => {});
  },

  onRemoveMedia(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    this.syncMediaUI(this.data.mediaList.filter((_, i) => i !== index));
  },

  onPreviewMedia(e) {
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.mediaList[index];
    if (!item) return;
    if (item.type === 'video') {
      wx.previewMedia({
        sources: [{ url: item.url, type: 'video', poster: item.poster }],
      });
      return;
    }
    const images = this.data.mediaList.filter((m) => m.type === 'image').map((m) => m.url);
    wx.previewImage({ urls: images, current: item.url });
  },

  onSubmit() {
    const {
      title, place, price, maxPeople, desc, role, mediaList, eventDate, category, refundPolicy,
      eventType, eventSessions,
    } = this.data;

    if (!category) {
      wx.showToast({ title: '请选择活动分类', icon: 'none' });
      return;
    }
    if (!title) {
      wx.showToast({ title: '请填写活动名称', icon: 'none' });
      return;
    }
    if (eventType === 'multi') {
      const sessions = eventSessions || [];
      if (!sessions.length || sessions.some((s) => !s.date)) {
        wx.showToast({ title: '请完善各场次日期', icon: 'none' });
        return;
      }
    } else if (!eventDate) {
      wx.showToast({ title: '请选择活动时间', icon: 'none' });
      return;
    }
    if (!place) {
      wx.showToast({ title: '请在地图上选择活动地点', icon: 'none' });
      return;
    }
    if (!refundPolicy) {
      wx.showToast({ title: '请选择退款政策', icon: 'none' });
      return;
    }
    const people = Number(maxPeople);
    if (!people || people < 2 || people > 100) {
      wx.showToast({ title: '人数需在 2-100 人之间', icon: 'none' });
      return;
    }
    const amount = Number(price || 0);
    if (Number.isNaN(amount) || amount < 0) {
      wx.showToast({ title: '活动价格格式不正确', icon: 'none' });
      return;
    }

    const time = this.formatEventTime();

    const firstImage = mediaList.find((m) => m.type === 'image');
    const firstVideo = mediaList.find((m) => m.type === 'video');
    const pet = getDefaultPet();
    const publisherName = role === 'merchant' ? '商家' : (pet.name ? `我 · ${pet.name}` : '我');

    const created = store.addMyEvent({
      title,
      category,
      eventType,
      eventSessions: eventType === 'multi' ? eventSessions : [],
      place,
      placeAddress: this.data.placeAddress,
      location: this.data.location,
      time,
      refundPolicy,
      price: amount,
      feeText: amount > 0 ? `¥${amount}/人` : '免费',
      fee: amount > 0 ? `¥${amount}/人` : '免费',
      feeIncludes: this.data.feeIncludes,
      deadline: this.data.deadlineDate
        ? `${this.data.deadlineDate} ${this.data.deadlineTime || '23:59'}`
        : '',
      signupScope: this.data.signupScope,
      timedSignup: this.data.timedSignup,
      desc,
      role,
      publisherName,
      depositPaid: false,
      depositAmount: 0,
      status: 'approved',
      auditStatus: 'approved',
      mediaList,
      images: mediaList.filter((m) => m.type === 'image').map((m) => m.url),
      cover: firstImage?.url || firstVideo?.poster || '',
    });

    store.setDraft('event_publish', null);
    wx.showToast({ title: '发布成功', icon: 'success' });
    setTimeout(() => {
      wx.navigateTo({ url: `/pages/event-poster/event-poster?id=${created.id}` });
    }, 600);
  },
});
