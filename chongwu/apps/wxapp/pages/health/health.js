const api = require('../../utils/request');

Page({
  data: {
    pets: [],
    reminders: [],
    activeTab: 'pets',
  },

  onLoad() {
    this.loadPets();
    this.loadReminders();
  },

  onShow() {
    this.loadPets();
    this.loadReminders();
  },

  async loadPets() {
    try {
      const res = await api.get('/health/pets');
      this.setData({ pets: res.data || [] });
    } catch (e) {
      console.error(e);
    }
  },

  async loadReminders() {
    try {
      const res = await api.get('/health/reminders');
      const reminders = (res.data || []).map(item => ({
        ...item,
        daysLeft: this.calculateDaysLeft(item.validUntil)
      }));
      this.setData({ reminders });
    } catch (e) {
      console.error(e);
    }
  },

  calculateDaysLeft(validUntil) {
    if (!validUntil) return 0;
    const target = new Date(validUntil);
    const now = new Date();
    const diff = target - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },

  onTabTap(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ activeTab: tab });
  },

  onAddPet() {
    wx.navigateTo({ url: '/pages/pet-form/pet-form' });
  },

  onPetTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/health-record/health-record?petId=${id}` });
  },

  onAddRecord(e) {
    const { petId } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/health-record/health-record?petId=${petId}&mode=add` });
  },
});
