const store = require('../../utils/store');

Page({
  data: {
    addresses: [],
    showModal: false,
    showActions: false,
    editingId: null,
    currentAddressId: null,
    currentAddress: null,
    formData: {
      contactName: '',
      contactPhone: '',
      address: '',
      isDefault: false,
    },
  },

  onLoad(options) {
    // 如果是从商品页选择地址过来
    this.selectMode = options.select === 'true';
    this.loadAddresses();
  },

  onShow() {
    this.loadAddresses();
  },

  loadAddresses() {
    const addresses = store.listAddresses();
    this.setData({ addresses });
  },

  onAddAddress() {
    this.setData({
      showModal: true,
      editingId: null,
      formData: {
        contactName: '',
        contactPhone: '',
        address: '',
        isDefault: false,
      },
    });
  },

  onSelectAddress(e) {
    const { id } = e.currentTarget.dataset;
    const address = this.data.addresses.find((a) => String(a.id) === String(id));

    if (this.selectMode && address) {
      // 返回选中的地址
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      if (prevPage) {
        prevPage.setSelectedAddress && prevPage.setSelectedAddress(address);
      }
      wx.navigateBack();
    }
  },

  onShowActions(e) {
    const { id } = e.currentTarget.dataset;
    const address = this.data.addresses.find((a) => String(a.id) === String(id));
    this.setData({
      showActions: true,
      currentAddressId: id,
      currentAddress: address,
    });
  },

  onCloseActions() {
    this.setData({
      showActions: false,
      currentAddressId: null,
      currentAddress: null,
    });
  },

  onEditAddress() {
    const { currentAddress } = this.data;
    this.setData({
      showActions: false,
      showModal: true,
      editingId: currentAddress.id,
      formData: {
        contactName: currentAddress.contactName,
        contactPhone: currentAddress.contactPhone,
        address: currentAddress.address,
        isDefault: currentAddress.isDefault || false,
      },
    });
  },

  onDeleteAddress() {
    const { currentAddressId } = this.data;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      success: (res) => {
        if (res.confirm) {
          store.deleteAddress(currentAddressId);
          this.setData({
            showActions: false,
            currentAddressId: null,
            currentAddress: null,
          });
          this.loadAddresses();
          wx.showToast({ title: '删除成功', icon: 'success' });
        }
      },
    });
  },

  onCloseModal() {
    this.setData({
      showModal: false,
      editingId: null,
      formData: {
        contactName: '',
        contactPhone: '',
        address: '',
        isDefault: false,
      },
    });
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value,
    });
  },

  onToggleDefault() {
    this.setData({
      'formData.isDefault': !this.data.formData.isDefault,
    });
  },

  onSaveAddress() {
    const { formData, editingId } = this.data;

    // 验证
    if (!formData.contactName || !formData.contactPhone || !formData.address) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    if (!/^1\d{10}$/.test(formData.contactPhone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }

    if (editingId) {
      // 编辑
      store.updateAddress(editingId, formData);
      wx.showToast({ title: '修改成功', icon: 'success' });
    } else {
      // 新增
      store.addAddress(formData);
      wx.showToast({ title: '添加成功', icon: 'success' });
    }

    this.onCloseModal();
    this.loadAddresses();
  },

  onStopPropagation() {
    // 阻止事件冒泡
  },
});
