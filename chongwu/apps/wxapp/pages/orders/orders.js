const api = require('../../utils/request');
const store = require('../../utils/store');

Page({
  data: {
    activeTab: 'service',
    serviceOrders: [],
    idleOrders: {
      buyOrders: [],
      sellOrders: [],
    },
    mallOrders: [],
  },

  onLoad(options) {
    if (options.type) {
      this.setData({ activeTab: options.type });
    }
    this.loadOrders();
  },

  onShow() {
    this.loadOrders();
  },

  normalizeService(list) {
    return (list || []).map((item) => ({
      ...item,
      statusText: item.statusText || this.getStatusText(item.status),
      cover: item.service?.coverUrls?.[0] || '/assets/mock/real_svc1.jpg',
      merchantName: item.merchant?.name || '商家',
      appointmentText: item.appointmentDate
        ? `${item.appointmentDate} ${item.appointmentTime || ''}`.trim()
        : '',
      addressText: item.addressText || item.address || item.serviceAddress || '',
    }));
  },

  normalizeIdle(list) {
    return (list || []).map((item) => ({
      ...item,
      statusText: item.statusText || this.getIdleStatusText(item.status),
      cover: item.idleItem?.images?.[0] || '',
      icon: item.idleItem?.displayIcon || '📦',
      peerName: item.seller?.nickname || item.buyer?.nickname || '',
      address: item.address || item.addressText || '',
    }));
  },

  async loadOrders() {
    let serviceOrders = [];
    let idleOrders = { buyOrders: [], sellOrders: [] };

    try {
      const [serviceRes, idleRes] = await Promise.all([
        api.get('/services/orders/my'),
        api.get('/idle/orders/my'),
      ]);
      serviceOrders = serviceRes.data || [];
      idleOrders = idleRes.data || { buyOrders: [], sellOrders: [] };
    } catch (e) {
      // local only
    }

    const localService = store.listServiceOrders();
    const localBuy = store.listIdleBuyOrders();
    const localSell = store.listIdleSellOrders();

    serviceOrders = this.normalizeService([
      ...localService,
      ...(Array.isArray(serviceOrders) ? serviceOrders : []),
    ]);

    idleOrders = {
      buyOrders: this.normalizeIdle([
        ...localBuy,
        ...(idleOrders.buyOrders || []),
      ]),
      sellOrders: this.normalizeIdle([
        ...localSell,
        ...(idleOrders.sellOrders || []),
      ]),
    };

    const mallGoods = store.listMallGoodsOrders().map((o) => ({
      ...o,
      kind: 'goods',
    }));
    const mallSvc = store.listMallServiceOrders().map((o) => ({
      id: o.id,
      orderNo: o.id,
      productName: o.serviceName,
      payAmount: o.price,
      statusText: o.status === 'pending' ? '待回访' : '已完成',
      cover: '',
      kind: 'service',
      createdAt: o.createdAt,
    }));

    this.setData({
      serviceOrders,
      idleOrders,
      mallOrders: [...mallGoods, ...mallSvc],
    });
  },

  onTabTap(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ activeTab: tab });
  },

  getStatusText(status) {
    const map = {
      0: '待付款',
      1: '已预约',
      2: '已接单',
      3: '服务中',
      4: '已完成',
      5: '已取消',
      6: '退款中',
      7: '已退款',
    };
    return map[status] || '处理中';
  },

  getIdleStatusText(status) {
    const map = {
      0: '待付款',
      1: '已下单',
      2: '已发货',
      3: '已收货',
      4: '已完成',
      5: '退款中',
      6: '已退款',
      7: '已取消',
    };
    return map[status] || '处理中';
  },

  goService() {
    wx.switchTab({ url: '/pages/service/service' });
  },

  goIdle() {
    wx.switchTab({ url: '/pages/idle/idle' });
  },

  goMall() {
    wx.navigateTo({ url: '/pages/mall/mall' });
  },
});
