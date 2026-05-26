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
      this.setData({ reminders: res.data || [] });
    } catch (e) {
      console.error(e);
    }
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
