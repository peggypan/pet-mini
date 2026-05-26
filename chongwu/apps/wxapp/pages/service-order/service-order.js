const app = getApp();
const api = require('../../utils/request');

Page({
  data: {
    serviceId: null,
    quantity: 1,
    service: null,
    pets: [],
    addresses: [],
    selectedPetId: null,
    selectedAddressId: null,
    contactName: '',
    contactPhone: '',
    appointmentDate: '',
    appointmentTime: '',
    remark: '',
  },

  onLoad(options) {
    this.setData({
      serviceId: options.serviceId,
      quantity: options.quantity || 1,
    });
    this.loadServiceDetail(options.serviceId);
    this.loadUserData();
  },

  async loadServiceDetail(id) {
    try {
      const res = await api.get(`/services/${id}`);
      this.setData({ service: res.data });
    } catch (e) {
      console.error(e);
    }
  },

  async loadUserData() {
    try {
      const [profileRes] = await Promise.all([
        api.get('/users/profile'),
      ]);
      
      const profile = profileRes.data;
      this.setData({
        pets: profile.pets || [],
        addresses: profile.addresses || [],
        contactName: profile.realName || profile.nickname || '',
        contactPhone: profile.phone || '',
      });
    } catch (e) {
      console.error(e);
    }
  },

  onPetSelect(e) {
    this.setData({ selectedPetId: e.detail.value });
  },

  onAddressSelect(e) {
    this.setData({ selectedAddressId: e.detail.value });
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ appointmentDate: e.detail.value });
  },

  onTimeChange(e) {
    this.setData({ appointmentTime: e.detail.value });
  },

  async onSubmit() {
    const { serviceId, quantity, selectedPetId, selectedAddressId, contactName, contactPhone, appointmentDate, appointmentTime, remark } = this.data;
    
    if (!contactName || !contactPhone) {
      wx.showToast({ title: '请填写联系人信息', icon: 'none' });
      return;
    }

    try {
      const res = await api.post('/services/orders', {
        serviceId: Number(serviceId),
        quantity: Number(quantity),
        petId: selectedPetId ? Number(selectedPetId) : undefined,
        addressId: selectedAddressId ? Number(selectedAddressId) : undefined,
        contactName,
        contactPhone,
        appointmentDate,
        appointmentTime,
        remark,
      });

      wx.showToast({ title: '预约成功', icon: 'success' });
      
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/orders/orders?type=service`,
        });
      }, 1500);
    } catch (e) {
      wx.showToast({ title: '预约失败', icon: 'none' });
    }
  },
});
