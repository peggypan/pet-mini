const { chooseMedia } = require('../../utils/choose-media');
const { submitUserFeedback } = require('../../utils/feedback-cloud-sync');
const {
  blockSubPageWithoutLogin,
  requireInteract,
} = require('../../utils/pet-profile-guard');

const MAX_IMAGES = 6;

Page({
  data: {
    categories: [
      { id: 'bug', name: '问题反馈' },
      { id: 'feature', name: '功能建议' },
      { id: 'other', name: '其他' },
    ],
    category: 'bug',
    content: '',
    contact: '',
    images: [],
    maxImages: MAX_IMAGES,
    canAddImage: true,
    imageSummary: `0/${MAX_IMAGES}`,
    submitting: false,
  },

  onLoad() {
    if (!blockSubPageWithoutLogin(this)) return;
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) this.setData({ category: id });
  },

  syncImages(list) {
    const images = list || [];
    this.setData({
      images,
      canAddImage: images.length < MAX_IMAGES,
      imageSummary: `${images.length}/${MAX_IMAGES}`,
    });
  },

  onChooseImage() {
    const left = MAX_IMAGES - (this.data.images || []).length;
    if (left <= 0) {
      wx.showToast({ title: `最多 ${MAX_IMAGES} 张`, icon: 'none' });
      return;
    }
    chooseMedia({
      count: left,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
    })
      .then((res) => {
        const paths = (res.tempFiles || []).map((f) => f.tempFilePath).filter(Boolean);
        if (!paths.length) return;
        this.syncImages([...(this.data.images || []), ...paths]);
      })
      .catch((err) => {
        if (err && String(err.message || err).includes('cancel')) return;
      });
  },

  onRemoveImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    this.syncImages((this.data.images || []).filter((_, i) => i !== index));
  },

  onPreviewImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    const urls = this.data.images || [];
    const current = urls[index];
    if (!current) return;
    wx.previewImage({ urls, current });
  },

  async onSubmit() {
    if (this.data.submitting) return;
    if (!requireInteract()) return;

    const content = (this.data.content || '').trim();
    if (content.length < 5) {
      wx.showToast({ title: '请至少填写 5 个字', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const result = await submitUserFeedback({
        content,
        contact: (this.data.contact || '').trim(),
        category: this.data.category,
        source: 'profile',
        images: this.data.images || [],
      });
      wx.showToast({
        title: result.cloud ? '反馈已提交' : '已记录，联网后将同步',
        icon: 'success',
      });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {
      wx.showToast({
        title: (e && e.message) || '提交失败，请稍后重试',
        icon: 'none',
      });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
