const api = require('../../utils/request');

Page({
  data: {
    activeTab: 'service',
    serviceOrders: [],
    idleOrders: {
      buyOrders: [],
      sellOrders: [],
    },
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

  async loadOrders() {
    try {
      const [serviceRes, idleRes] = await Promise.all([
        api.get('/services/orders/my'),
        api.get('/idle/orders/my'),
      ]);

      this.setData({
        serviceOrders: serviceRes.data || [],
        idleOrders: idleRes.data || { buyOrders: [], sellOrders: [] },
      });
    } catch (e) {
      console.error(e);
    }
  },

  onTabTap(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ activeTab: tab });
  },

  getStatusText(status) {
    const map = {
      0: '待付款',
      1: '已付款',
      2: '已接单',
      3: '服务中',
      4: '已完成',
      5: '已取消',
      6: '退款中',
      7: '已退款',
    };
    return map[status] || '未知';
  },

  getIdleStatusText(status) {
    const map = {
      0: '待付款',
      1: '已付款',
      2: '已发货',
      3: '已收货',
      4: '已完成',
      5: '退款中',
      6: '已退款',
      7: '已取消',
    };
    return map[status] || '未知';
  },
});
