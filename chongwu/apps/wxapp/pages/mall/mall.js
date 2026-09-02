const { MOCK_MALL } = require('../../utils/mock');

Page({
  data: {
    mallCategories: MOCK_MALL.categories.slice(),
    mallCategory: 'food',
    mallProducts: MOCK_MALL.products.slice(),
    displayProducts: MOCK_MALL.products.slice(),
    mallServices: MOCK_MALL.services.slice(),
  },

  onLoad(options) {
    if (options.category) {
      this.setData({ mallCategory: options.category });
    }
    this.applyCategory(this.data.mallCategory);
  },

  applyCategory(id) {
    // Mock 商品暂未按分类细分字段时，全部展示；后续可按 category 过滤
    const all = this.data.mallProducts;
    const filtered = all.filter((p) => !p.category || p.category === id);
    this.setData({
      mallCategory: id,
      displayProducts: filtered.length ? filtered : all,
    });
  },

  onMallCategory(e) {
    this.applyCategory(e.currentTarget.dataset.id);
  },

  onMallProduct(e) {
    wx.navigateTo({
      url: `/pages/mall-product/mall-product?id=${e.currentTarget.dataset.id}`,
    });
  },

  onMallService(e) {
    wx.navigateTo({
      url: `/pages/mall-service/mall-service?id=${e.currentTarget.dataset.id || 's1'}`,
    });
  },
});
