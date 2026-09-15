const store = require('../../utils/store');
const { chooseMedia } = require('../../utils/choose-media');
const { getStepHint, ROLE_LABEL } = require('../../utils/event-qualify');
const amap = require('../../utils/amap');

const WEEKS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const CATEGORIES = ['遛狗社交', '宠物聚会', '萌宠摄影', '宠物科普', '爱心领养', '其他'];
const REFUND_POLICIES = ['随时退 · 开场前全额退', '开场前24小时可退', '一旦报名不退不改'];
const SIGNUP_SCOPES = ['所有人', '仅限女生', '仅限男生', '仅限认证宠友'];

function formatToday() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

Page({
  data: {
    role: 'personal',
    qualify: null,
    stepHint: '',
    roleLabel: ROLE_LABEL,
    eventType: 'single',
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
    maxMediaCount: 9,
  },

  onLoad(options) {
    const role = options.role === 'merchant' ? 'merchant' : 'personal';
    const draft = store.getDraft('event_publish');
    if (draft) {
      this.setData(draft);
      this.refreshTimedLabel();
    }
    this.setData({ role });
  },

  onShow() {
    this.refreshQualify();
  },

  refreshQualify() {
    const { role } = this.data;
    const qualify = store.getEventPublishQualify(role);
    this.setData({
      qualify,
      stepHint: getStepHint(qualify.nextStep, role),
    });
  },

  onSwitchRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ role });
    this.refreshQualify();
  },

  onGoQualify() {
    wx.navigateTo({ url: `/pages/event-qualify/event-qualify?role=${this.data.role}` });
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
      wx.showToast({ title: '多场次活动即将上线', icon: 'none' });
      return;
    }
    this.setData({ eventType: type });
  },

  onPickCategory() {
    wx.showActionSheet({
      itemList: CATEGORIES,
      success: (res) => this.setData({ category: CATEGORIES[res.tapIndex] }),
    });
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
    const { eventDate, eventTime } = this.data;
    if (!eventDate) return '';
    const d = new Date(eventDate.replace(/-/g, '/'));
    const label = `${+d.getMonth() + 1}月${d.getDate()}日 ${WEEKS[d.getDay()]}`;
    return eventTime ? `${label} ${eventTime}` : label;
  },

  // 点击地点行直接跳转系统地图选点
  onChoosePlace() {
    if (!this.data.qualify.canPublish) return;
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

  onChooseImage() {
    const remain = this.data.maxMediaCount - this.data.mediaList.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 9 个媒体', icon: 'none' });
      return;
    }
    chooseMedia({
      count: Math.min(remain, 9),
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const append = (res.tempFiles || []).map((f) => ({
          type: 'image',
          url: f.tempFilePath,
        }));
        if (!append.length) return;
        this.setData({
          mediaList: [...this.data.mediaList, ...append].slice(0, this.data.maxMediaCount),
        });
      },
    });
  },

  onChooseVideo() {
    const remain = this.data.maxMediaCount - this.data.mediaList.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 9 个媒体', icon: 'none' });
      return;
    }
    chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (!file) return;
        if (file.size > 50 * 1024 * 1024) {
          wx.showToast({ title: '视频请小于 50MB', icon: 'none' });
          return;
        }
        this.setData({
          mediaList: [...this.data.mediaList, {
            type: 'video',
            url: file.tempFilePath,
            poster: file.thumbTempFilePath || '',
            duration: file.duration || 0,
          }].slice(0, this.data.maxMediaCount),
        });
      },
    });
  },

  onRemoveMedia(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    this.setData({ mediaList: this.data.mediaList.filter((_, i) => i !== index) });
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
    const { title, place, price, maxPeople, desc, role, mediaList, qualify, eventDate, category, refundPolicy } = this.data;

    if (!qualify.canPublish) {
      wx.showModal({
        title: '尚未满足发布条件',
        content: this.data.stepHint,
        confirmText: '去完善',
        success: (res) => {
          if (res.confirm) this.onGoQualify();
        },
      });
      return;
    }
    if (!category) {
      wx.showToast({ title: '请选择活动分类', icon: 'none' });
      return;
    }
    if (!title) {
      wx.showToast({ title: '请填写活动名称', icon: 'none' });
      return;
    }
    if (!eventDate) {
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
    const publisherName = role === 'merchant'
      ? (qualify.verify?.companyName || '认证商家')
      : (qualify.verify?.realName || '认证用户');

    store.addMyEvent({
      title,
      category,
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
      depositPaid: true,
      depositAmount: qualify.depositAmount,
      status: 'pending',
      auditStatus: 'pending',
      mediaList,
      images: mediaList.filter((m) => m.type === 'image').map((m) => m.url),
      cover: firstImage?.url || firstVideo?.poster || '',
    });

    store.setDraft('event_publish', null);
    wx.showToast({ title: '已提交审核', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 700);
  },
});
