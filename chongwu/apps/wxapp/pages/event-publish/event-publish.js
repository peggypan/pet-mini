const store = require('../../utils/store');
const { chooseMedia } = require('../../utils/choose-media');
const { getStepHint, ROLE_LABEL } = require('../../utils/event-qualify');

Page({
  data: {
    role: 'personal',
    qualify: null,
    stepHint: '',
    roleLabel: ROLE_LABEL,
    title: '',
    place: '',
    time: '',
    fee: '免费',
    maxPeople: '20',
    desc: '',
    mediaList: [],
    maxMediaCount: 9,
  },

  onLoad(options) {
    const role = options.role === 'merchant' ? 'merchant' : 'personal';
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
    const { title, place, time, fee, maxPeople, desc, role, mediaList, qualify } = this.data;

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

    if (!title || !place) {
      wx.showToast({ title: '请填写活动名称和地点', icon: 'none' });
      return;
    }

    const firstImage = mediaList.find((m) => m.type === 'image');
    const firstVideo = mediaList.find((m) => m.type === 'video');
    const publisherName = role === 'merchant'
      ? (qualify.verify?.companyName || '认证商家')
      : (qualify.verify?.realName || '认证用户');

    store.addMyEvent({
      title,
      place,
      time,
      fee,
      maxPeople,
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

    wx.showToast({ title: '已提交审核', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 700);
  },
});
