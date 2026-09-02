const { MOCK_MALL } = require('../../utils/mock');
const store = require('../../utils/store');

const DETAIL_MAP = {
  s1: {
    points: [
      '第三方实验室成分与风险指标检测',
      '覆盖常见猫粮 / 狗粮送检套餐',
      '出具可读报告，适合囤粮前自查',
      '对接食安科普资源，非医疗诊断',
    ],
    audience: '关心粮商品质、换粮焦虑、或想做风险测评的养宠人。',
  },
  s2: {
    points: [
      '结合宠物档案给出喂食建议',
      '支持幼宠 / 老年宠 / 减重场景咨询',
      '可联动健康本数据持续跟进',
      '不提供线上诊疗处方，仅营养建议',
    ],
    audience: '想优化日常喂养、软便呕吐后需要饮食调整参考的用户。',
  },
};

Page({
  data: {
    serviceType: 's1',
    service: {},
    contactName: '',
    phone: '',
    remark: '',
  },

  onLoad(options) {
    const id = options.id || 's1';
    const base = (MOCK_MALL.services || []).find((s) => s.id === id) || MOCK_MALL.services[0];
    const extra = DETAIL_MAP[base.id] || DETAIL_MAP.s1;
    this.setData({
      serviceType: base.id,
      service: { ...base, ...extra },
    });
    wx.setNavigationBarTitle({ title: base.name || '专业服务' });
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  onSubmit() {
    const { contactName, phone, remark, service } = this.data;
    if (!contactName || !phone) {
      wx.showToast({ title: '请填写联系人与手机号', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }

    const orders = wx.getStorageSync('mall_service_orders') || [];
    orders.unshift({
      id: `ms_${Date.now()}`,
      serviceId: service.id,
      serviceName: service.name,
      price: service.price,
      contactName,
      phone,
      remark,
      createdAt: new Date().toISOString(),
      status: 'pending',
    });
    wx.setStorageSync('mall_service_orders', orders.slice(0, 30));
    store.pushMessage('专业服务预约成功', `已预约「${service.name}」`, 'order');

    wx.showModal({
      title: '预约已提交',
      content: '顾问将尽快联系你确认。可在「我的-订单-商城」查看。',
      showCancel: false,
      success: () => {
        wx.redirectTo({ url: '/pages/orders/orders?type=mall' });
      },
    });
  },
});
