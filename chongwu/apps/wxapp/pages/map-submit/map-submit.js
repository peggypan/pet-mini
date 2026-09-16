const store = require('../../utils/store');
const amap = require('../../utils/amap');

const POINT_TYPES = [
  '宠物友好公园',
  '宠物友好酒店',
  '宠物友好商场',
  '宠物友好餐厅',
  '宠物友好景区',
  '宠物友好露营地',
  '其他',
  '宠物不友好',
  '宠物毒点',
];

Page({
  data: {
    pointTypes: POINT_TYPES,
    name: '',
    type: POINT_TYPES[0],
    address: '',
    allowPet: true,
    danger: false,
    dangerDesc: '',
    latitude: 0,
    longitude: 0,
    city: '',
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onTypeChange(e) {
    const type = POINT_TYPES[e.detail.value];
    const isUnfriendly = type === '宠物不友好';
    const isDanger = type === '宠物毒点';
    this.setData({
      type,
      allowPet: !(isUnfriendly || isDanger),
      danger: isDanger,
      dangerDesc: isDanger ? (this.data.dangerDesc || '请勿让宠物靠近、嗅闻') : '',
    });
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
    const {
      name, type, address, allowPet, danger, dangerDesc, latitude, longitude, city,
    } = this.data;
    if (!name || !address) {
      wx.showToast({ title: '请填写名称和地址', icon: 'none' });
      return;
    }
    if (type === '宠物毒点' && !dangerDesc.trim()) {
      wx.showToast({ title: '请填写毒点说明', icon: 'none' });
      return;
    }
    store.addMapPoint({
      name,
      type,
      address,
      allowPet: type === '宠物不友好' || type === '宠物毒点' ? false : allowPet,
      danger: type === '宠物毒点' || danger,
      dangerDesc: type === '宠物毒点' ? dangerDesc.trim() : '',
      city: city || store.getCity(),
      latitude,
      longitude,
      distance: latitude ? '已选位置' : '待选位置',
    });
    wx.showToast({ title: '已提交审核', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 700);
  },
});
