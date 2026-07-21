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
    selectedPetIndex: -1,
    selectedAddressId: null,
    selectedAddressIndex: -1,
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
    const index = e.detail.value;
    const pet = this.data.pets[index];
    this.setData({
      selectedPetId: pet ? pet.id : null,
      selectedPetIndex: Number(index)
    });
  },

  onAddressSelect(e) {
    const index = e.detail.value;
    const address = this.data.addresses[index];
    this.setData({
      selectedAddressId: address ? address.id : null,
      selectedAddressIndex: Number(index)
    });
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

  getSelectedPetName() {
    const { pets, selectedPetId } = this.data;
    const pet = pets.find(p => p.id == selectedPetId);
    return pet ? pet.name : '';
  },

  getSelectedAddressDetail() {
    const { addresses, selectedAddressId } = this.data;
    const address = addresses.find(a => a.id == selectedAddressId);
    return address ? address.detail : '';
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
