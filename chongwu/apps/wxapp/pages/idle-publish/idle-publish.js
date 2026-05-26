const api = require('../../utils/request');

Page({
  data: {
    categories: [
      { id: 1, name: '食品' },
      { id: 2, name: '日用品' },
      { id: 3, name: '笼具' },
      { id: 4, name: '服饰' },
      { id: 5, name: '玩具' },
      { id: 6, name: '保健护理' },
      { id: 7, name: '其他' },
    ],
    categoryId: null,
    title: '',
    description: '',
    images: [],
    price: '',
    originalPrice: '',
    conditionLevel: 2,
    usageDesc: '',
    tradeType: 1,
    location: '',
    district: '',
  },

  onCategoryChange(e) {
    const index = Number(e.detail.value);
    this.setData({ categoryId: this.data.categories[index].id });
  },

  onConditionChange(e) {
    this.setData({ conditionLevel: Number(e.detail.value) + 1 });
  },

  onTradeTypeChange(e) {
    this.setData({ tradeType: Number(e.detail.value) + 1 });
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  async onChooseImage() {
    try {
      const res = await wx.chooseMedia({
        count: 9 - this.data.images.length,
        mediaType: ['image'],
      });
      
      const newImages = res.tempFiles.map(file => file.tempFilePath);
      this.setData({ images: [...this.data.images, ...newImages] });
    } catch (e) {
      console.error(e);
    }
  },

  onRemoveImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images });
  },

  async onSubmit() {
    const { categoryId, title, description, images, price, originalPrice, conditionLevel, usageDesc, tradeType, location, district } = this.data;
    
    if (!categoryId || !title || !description || !price) {
      wx.showToast({ title: '请填写必填项', icon: 'none' });
      return;
    }

    try {
      await api.post('/idle', {
        categoryId,
        title,
        description,
        images,
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        conditionLevel,
        usageDesc,
        tradeType,
        location,
        district,
      });

      wx.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/idle/idle' });
      }, 1500);
    } catch (e) {
      wx.showToast({ title: '发布失败', icon: 'none' });
    }
  },
});
