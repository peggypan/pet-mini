const store = require('../../utils/store');
const amap = require('../../utils/amap');

const POINT_TYPES = ['公园', '咖啡馆', '酒店', '商场', '露营地', '其他'];

Page({
  data: {
    pointTypes: POINT_TYPES,
    name: '',
    type: '公园',
    address: '',
    allowPet: true,
    latitude: 0,
    longitude: 0,
    city: '',
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onTypeChange(e) {
    this.setData({ type: POINT_TYPES[e.detail.value] });
  },

  onAllowChange(e) {
    this.setData({ allowPet: e.detail.value });
  },

  onPickLocation() {
    amap.choosePoint()
      .then((loc) => {
        this.setData({
          address: loc.address || loc.name,
          latitude: loc.latitude,
          longitude: loc.longitude,
          city: loc.city || store.getCity(),
          name: this.data.name || loc.name,
        });
      })
      .catch((err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return;
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要位置权限',
            content: '请在设置中开启位置权限以使用地图选点',
            confirmText: '去设置',
            success: (r) => { if (r.confirm) wx.openSetting(); },
          });
        }
      });
  },

  onSubmit() {
    const { name, type, address, allowPet, latitude, longitude, city } = this.data;
    if (!name || !address) {
      wx.showToast({ title: '请填写名称和地址', icon: 'none' });
      return;
    }
    store.addMapPoint({
      name,
      type,
      address,
      allowPet,
      city: city || store.getCity(),
      latitude,
      longitude,
      distance: latitude ? '已定位' : '待定位',
    });
    wx.showToast({ title: '已提交审核', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 700);
  },
});
