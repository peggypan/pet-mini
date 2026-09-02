const api = require('../../utils/request');
const { findService, getDefaultPets } = require('../../utils/catalog');
const store = require('../../utils/store');

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
    addressText: '',
    contactName: '',
    contactPhone: '',
    appointmentDate: '',
    appointmentTime: '',
    remark: '',
    submitting: false,
  },

  onLoad(options) {
    this.setData({
      serviceId: options.serviceId,
      quantity: Number(options.quantity) || 1,
    });
    this.loadServiceDetail(options.serviceId);
    this.loadUserData();
  },

  async loadServiceDetail(id) {
    const fallback = findService(id);
    try {
      const res = await api.get(`/services/${id}`);
      if (res.data) {
        this.setData({
          service: {
            ...fallback,
            ...res.data,
            coverUrls: res.data.coverUrls?.length
              ? res.data.coverUrls
              : fallback?.coverUrls || [],
          },
        });
        return;
      }
    } catch (e) {
      // mock
    }
    if (fallback) this.setData({ service: fallback });
  },

  async loadUserData() {
    const localPets = getDefaultPets();
    try {
      const profileRes = await api.get('/users/profile');
      const profile = profileRes.data || {};
      this.setData({
        pets: (profile.pets && profile.pets.length) ? profile.pets : localPets,
        addresses: profile.addresses || [],
        contactName: profile.realName || profile.nickname || '宠主',
        contactPhone: profile.phone || '',
      });
    } catch (e) {
      this.setData({
        pets: localPets,
        addresses: [{ id: 'addr-demo', detail: '同城上门 · 请补充门牌号' }],
        contactName: '宠主',
        contactPhone: '',
        addressText: '',
        selectedAddressIndex: 0,
        selectedAddressId: 'addr-demo',
      });
    }
  },

  onPetSelect(e) {
    const index = Number(e.detail.value);
    const pet = this.data.pets[index];
    this.setData({
      selectedPetId: pet ? pet.id : null,
      selectedPetIndex: index,
    });
  },

  onAddressSelect(e) {
    const index = Number(e.detail.value);
    const address = this.data.addresses[index];
    this.setData({
      selectedAddressId: address ? address.id : null,
      selectedAddressIndex: index,
      addressText: address ? address.detail : '',
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

  async onSubmit() {
    const {
      serviceId,
      quantity,
      service,
      selectedPetId,
      selectedAddressId,
      addressText,
      addresses,
      selectedAddressIndex,
      contactName,
      contactPhone,
      appointmentDate,
      appointmentTime,
      remark,
      submitting,
    } = this.data;

    if (submitting) return;
    if (!contactName || !contactPhone) {
      wx.showToast({ title: '请填写联系人信息', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(contactPhone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }
    if (!appointmentDate) {
      wx.showToast({ title: '请选择预约日期', icon: 'none' });
      return;
    }

    const addr =
      addressText ||
      (selectedAddressIndex >= 0 && addresses[selectedAddressIndex]
        ? addresses[selectedAddressIndex].detail
        : '');
    if (!addr) {
      wx.showToast({ title: '请填写服务地址', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      await api.post('/services/orders', {
        serviceId,
        quantity: Number(quantity),
        petId: selectedPetId || undefined,
        addressId: selectedAddressId || undefined,
        contactName,
        contactPhone,
        appointmentDate,
        appointmentTime,
        remark,
      });
    } catch (e) {
      // 无后端：本地落单
    }

    const payAmount = Number(service?.price || 0) * Number(quantity);
    store.addServiceOrder({
      serviceId,
      serviceName: service?.name || '宠物服务',
      payAmount,
      coverUrls: service?.coverUrls || [],
      merchantName: service?.merchant?.name || service?.merchantName || '服务商',
      appointmentDate,
      appointmentTime,
      contactName,
      contactPhone,
      addressText: addr,
      remark,
    });

    wx.showToast({ title: '预约成功', icon: 'success' });
    setTimeout(() => {
      wx.redirectTo({ url: '/pages/orders/orders?type=service' });
    }, 800);
  },
});
