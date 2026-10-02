const store = require('../../utils/store');
const { getDefaultPet } = require('../../utils/catalog');
const { chooseMedia } = require('../../utils/choose-media');
const { persistUserProfileFields } = require('../../utils/persist-user-profile');
const { getDisplayNickname } = require('../../utils/user-profile-display');

const DEFAULT_BIO = '和毛孩子一起，遇见同城宠友与好活动～';

Page({
  data: {
    avatarUrl: '',
    nickname: '',
    bio: '',
    saving: false,
  },

  onLoad() {
    this.loadForm();
  },

  loadForm() {
    const pet = getDefaultPet();
    const profile = store.getUserProfile();
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({
      avatarUrl: pet.avatar || pet.avatarUrl || '/assets/mock/real_avatar.jpg',
      nickname: getDisplayNickname(),
      bio: profile.bio || DEFAULT_BIO,
    });
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  onChooseAvatar() {
    chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (file && file.tempFilePath) {
          this.setData({ avatarUrl: file.tempFilePath });
        }
      },
    }).catch(() => {});
  },

  async onSave() {
    if (this.data.saving) return;
    const { avatarUrl, nickname, bio } = this.data;
    if (!nickname.trim()) {
      wx.showToast({ title: '请填写昵称', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      const bioText = bio.trim() || DEFAULT_BIO;
      await persistUserProfileFields({ nickname: nickname.trim(), bio: bioText });
      store.updateDefaultPetAvatar(avatarUrl);
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 400);
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  onOpenPetForm() {
    const pet = getDefaultPet();
    const petId = pet.id && pet.id !== 'demo' ? pet.id : '';
    const url = petId ? `/pages/pet-form/pet-form?petId=${petId}` : '/pages/pet-form/pet-form';
    wx.navigateTo({ url });
  },
});
