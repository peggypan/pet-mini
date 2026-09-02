const api = require('../../utils/request');
const { MOCK_PET } = require('../../utils/mock');
const store = require('../../utils/store');
const { getDefaultPets } = require('../../utils/catalog');

const RECORD_TYPES = [
  { id: 'vomit', name: '呕吐', icon: '🤢' },
  { id: 'soft', name: '软便', icon: '💧' },
  { id: 'appetite', name: '食欲差', icon: '🥣' },
  { id: 'diarrhea', name: '腹泻', icon: '⚠️' },
  { id: 'other', name: '其他', icon: '📝' },
];

function todayStr() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

Page({
  data: {
    pets: [],
    currentPetId: '',
    recordTypes: RECORD_TYPES,
    recordType: 'vomit',
    recordDate: todayStr(),
    note: '',
    records: [],
  },

  onLoad() {
    this.loadPets();
    this.loadLocalRecords();
  },

  async loadPets() {
    let pets = getDefaultPets();
    try {
      const res = await api.get('/health/pets');
      if (res.data && res.data.length) pets = res.data;
    } catch (e) {}
    if (!pets.length) {
      pets = [{ id: 'mock-pet', name: MOCK_PET.name, avatarUrl: MOCK_PET.avatar }];
    }
    this.setData({ pets: pets, currentPetId: pets[0].id });
  },

  loadLocalRecords() {
    this.setData({ records: wx.getStorageSync('diet_records') || [] });
  },

  onSelectPet(e) { this.setData({ currentPetId: e.currentTarget.dataset.id }); },
  onSelectType(e) { this.setData({ recordType: e.currentTarget.dataset.id }); },
  onDateChange(e) { this.setData({ recordDate: e.detail.value }); },
  onNoteInput(e) { this.setData({ note: e.detail.value }); },

  onSubmit() {
    const { pets, currentPetId, recordType, recordDate, note, records } = this.data;
    const pet = pets.find((p) => p.id === currentPetId) || pets[0];
    const typeObj = RECORD_TYPES.find((t) => t.id === recordType);
    const item = {
      id: 'r_' + Date.now(),
      petId: pet.id,
      petName: pet.name,
      type: recordType,
      typeName: typeObj ? typeObj.name : '记录',
      date: recordDate,
      note: note || '未填写说明',
    };
    const next = [item].concat(records).slice(0, 50);
    wx.setStorageSync('diet_records', next);
    store.pushMessage('饮食记录已保存', pet.name + ' · ' + item.typeName + ' · ' + item.date, 'health');
    this.setData({ records: next, note: '' });
    wx.showToast({ title: '已保存', icon: 'success' });
  },
});
