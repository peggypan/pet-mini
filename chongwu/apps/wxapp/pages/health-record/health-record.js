const api = require('../../utils/request');
const store = require('../../utils/store');
const { getDefaultPets } = require('../../utils/catalog');

const TYPE_NAMES = ['疫苗', '驱虫', '体检', '绝育', '芯片', '年检', '看病', '其他'];

function emptyForm() {
  return {
    recordTypeIndex: 0,
    recordTypeLabel: TYPE_NAMES[0],
    itemName: '',
    itemBrand: '',
    doneAt: '',
    validUntil: '',
    clinicName: '',
    cost: '',
    remark: '',
  };
}

Page({
  data: {
    petId: null,
    mode: 'view',
    pet: null,
    records: [],
    recordTypeOptions: TYPE_NAMES,
    form: emptyForm(),
  },

  onLoad(options) {
    this.setData({
      petId: options.petId,
      mode: options.mode || 'view',
      form: emptyForm(),
    });
    this.loadPetData(options.petId);
  },

  async loadPetData(petId) {
    let pet = store.getPet(petId) || getDefaultPets().find((p) => String(p.id) === String(petId));
    let records = store.listRecords(petId);

    try {
      const [petRes, recordsRes] = await Promise.all([
        api.get(`/health/pets/${petId}`),
        api.get(`/health/records/${petId}`),
      ]);
      if (petRes.data) pet = petRes.data;
      if (recordsRes.data?.length) records = recordsRes.data;
    } catch (e) {
      // local
    }

    if (pet && !store.getPet(petId) && String(petId).indexOf('hp') === 0) {
      const pets = store.listPets();
      if (!pets.find((p) => String(p.id) === String(petId))) {
        pets.push(pet);
        store.write(store.KEYS.healthPets, pets);
      }
    }

    this.setData({
      pet: pet || null,
      records: (records || []).map((r) => ({
        ...r,
        typeName: r.typeName || TYPE_NAMES[(r.recordType || 1) - 1] || '记录',
      })),
    });
  },

  onAddRecord() {
    this.setData({ mode: 'add', form: emptyForm() });
  },

  onFieldInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onTypeChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      'form.recordTypeIndex': index,
      'form.recordTypeLabel': TYPE_NAMES[index],
    });
  },

  onDoneAtChange(e) {
    this.setData({ 'form.doneAt': e.detail.value });
  },

  onValidUntilChange(e) {
    this.setData({ 'form.validUntil': e.detail.value });
  },

  async onSave() {
    const { form, petId } = this.data;
    if (!form.itemName || !form.doneAt) {
      wx.showToast({ title: '请填写项目名称与完成日期', icon: 'none' });
      return;
    }

    const payload = {
      petId,
      recordType: Number(form.recordTypeIndex) + 1,
      typeName: form.recordTypeLabel || TYPE_NAMES[0],
      itemName: form.itemName,
      itemBrand: form.itemBrand,
      doneAt: form.doneAt,
      validUntil: form.validUntil,
      clinicName: form.clinicName,
      cost: form.cost ? Number(form.cost) : undefined,
      remark: form.remark,
    };

    try {
      await api.post('/health/records', {
        ...payload,
        petId: Number(petId) || petId,
      });
    } catch (e) {
      // local
    }

    store.addRecord(petId, payload);
    wx.showToast({ title: '添加成功', icon: 'success' });
    this.setData({ mode: 'view', form: emptyForm() });
    this.loadPetData(petId);
  },

  onCancel() {
    this.setData({ mode: 'view', form: emptyForm() });
  },
});
