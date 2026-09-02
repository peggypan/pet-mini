const { findMallProduct } = require('../../utils/catalog');
const store = require('../../utils/store');

Page({
  data: {
    product: null,
    selectedAddress: null,
    contactName: '',
    contactPhone: '',
    address: '',
    remark: '',
  },

  onLoad(options) {
    const product = findMallProduct(options.id);
    if (!product) {
      wx.showToast({ title: '商品不存在', icon: 'none' });
      return;
    }
    this.setData({ product });

    // 自动加载默认地址
    const defaultAddress = store.getDefaultAddress();
    if (defaultAddress) {
      this.setData({ selectedAddress: defaultAddress });
    }
  },

  onShow() {
    // 页面显示时重新加载默认地址（可能从地址簿选择回来）
    const defaultAddress = store.getDefaultAddress();
    if (defaultAddress && !this.data.selectedAddress) {
      this.setData({ selectedAddress: defaultAddress });
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  onSelectAddress() {
    wx.navigateTo({
      url: '/pages/address-book/address-book?select=true',
    });
  },

  // 供地址簿页面调用的方法
  setSelectedAddress(address) {
    this.setData({
      selectedAddress: address,
      // 清空手动输入的地址信息
      contactName: address.contactName,
      contactPhone: address.contactPhone,
      address: address.address,
    });
  },

  onBuy() {
    const { product, selectedAddress, contactName, contactPhone, address, remark } = this.data;
    if (!product) return;

    let finalContactName, finalContactPhone, finalAddress;

    if (selectedAddress) {
      // 使用选择的地址
      finalContactName = selectedAddress.contactName;
      finalContactPhone = selectedAddress.contactPhone;
      finalAddress = selectedAddress.address;
    } else {
      // 使用手动输入的地址
      if (!contactName || !contactPhone || !address) {
        wx.showToast({ title: '请填写收货信息', icon: 'none' });
        return;
      }
      if (!/^1\d{10}$/.test(contactPhone)) {
        wx.showToast({ title: '手机号格式不正确', icon: 'none' });
        return;
      }
      finalContactName = contactName;
      finalContactPhone = contactPhone;
      finalAddress = address;

      // 询问是否保存地址
      const addresses = store.listAddresses();
      if (addresses.length === 0) {
        // 如果是第一个地址，自动保存
        store.addAddress({
          contactName,
          contactPhone,
          address,
          isDefault: true,
        });
        wx.showToast({ title: '已保存到地址簿', icon: 'success', duration: 1500 });
      }
    }

    store.addMallGoodsOrder({
      productName: product.name,
      payAmount: product.price,
      cover: product.cover,
      contactName: finalContactName,
      contactPhone: finalContactPhone,
      address: finalAddress,
      remark,
    });

    wx.showToast({ title: '下单成功', icon: 'success' });
    setTimeout(() => {
      wx.redirectTo({ url: '/pages/orders/orders?type=mall' });
    }, 700);
  },
});
