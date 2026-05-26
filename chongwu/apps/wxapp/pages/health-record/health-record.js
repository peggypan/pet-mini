const api = require('../../utils/request');

Page({
  data: {
    petId: null,
    mode: 'view',
    pet: null,
    records: [],
    recordTypeOptions: ['疫苗', '驱虫', '体检', '绝育', '芯片', '年检', '看病', '其他'],
  },

  onLoad(options) {
    this.setData({ petId: options.petId, mode: options.mode || 'view' });
    this.loadPetData(options.petId);
  },

  async loadPetData(petId) {
    try {
      const [petRes, recordsRes] = await Promise.all([
        api.get(`/health/pets/${petId}`),
        api.get(`/health/records/${petId}`),
      ]);
      
      this.setData({
        pet: petRes.data,
        records: recordsRes.data || [],
      });
    } catch (e) {
      console.error(e);
    }
  },

  onAddRecord() {
    this.setData({ mode: 'add' });
  },

  async onSubmitRecord(e) {
    const formData = e.detail.value;
    
    try {
      await api.post('/health/records', {
        petId: Number(this.data.petId),
        recordType: Number(formData.recordType) + 1,
        itemName: formData.itemName,
        itemBrand: formData.itemBrand,
        doneAt: formData.doneAt,
        validUntil: formData.validUntil,
        clinicName: formData.clinicName,
        cost: formData.cost ? Number(formData.cost) : undefined,
        remark: formData.remark,
      });

      wx.showToast({ title: '添加成功', icon: 'success' });
      this.setData({ mode: 'view' });
      this.loadPetData(this.data.petId);
    } catch (e) {
      wx.showToast({ title: '添加失败', icon: 'none' });
    }
  },

  onCancel() {
    this.setData({ mode: 'view' });
  },
});
