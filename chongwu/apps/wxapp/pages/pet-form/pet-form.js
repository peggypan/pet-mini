const api = require('../../utils/request');
const store = require('../../utils/store');
const { getDefaultPets } = require('../../utils/catalog');

Page({
  data: {
    mode: 'add',
    petId: null,
    name: '',
    species: 2,
    breedName: '',
    gender: 0,
    birthday: '',
    weight: '',
    color: '',
    isSterilized: false,
    microchip: '',
    remark: '',
    submitting: false,
  },

  onLoad(options) {
    if (options.petId) {
      this.setData({ mode: 'edit', petId: options.petId });
      this.loadPetDetail(options.petId);
    }
  },

  async loadPetDetail(id) {
    const local = store.getPet(id) || getDefaultPets().find((p) => String(p.id) === String(id));
    try {
      const res = await api.get(`/health/pets/${id}`);
      if (res.data) {
        this.applyPet(res.data);
        return;
      }
    } catch (e) {
      // local
    }
    if (local) this.applyPet(local);
  },

  applyPet(pet) {
    this.setData({
      name: pet.name,
      species: pet.species,
      breedName: pet.breedName || '',
      gender: pet.gender || 0,
      birthday: pet.birthday || '',
      weight: pet.weight || '',
      color: pet.color || '',
      isSterilized: !!pet.isSterilized,
      microchip: pet.microchip || '',
      remark: pet.remark || '',
    });
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  onSpeciesChange(e) {
    this.setData({ species: Number(e.detail.value) + 1 });
  },

  onGenderChange(e) {
    this.setData({ gender: Number(e.detail.value) });
  },

  onSterilizedChange(e) {
    this.setData({ isSterilized: e.detail.value });
  },

  async onSubmit() {
    const {
      name, species, breedName, gender, birthday, weight, color,
      isSterilized, microchip, remark, mode, petId, submitting,
    } = this.data;

    if (submitting) return;
    if (!name) {
      wx.showToast({ title: '请输入宠物名字', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    const payload = {
      name,
      species,
      breedName,
      gender,
      birthday,
      weight: weight ? Number(weight) : undefined,
      color,
      isSterilized,
      microchip,
      remark,
    };

    try {
      if (mode === 'add') {
        await api.post('/health/pets', payload);
      }
    } catch (e) {
      // local
    }

    if (mode === 'add') {
      store.addPet(payload);
    } else if (petId) {
      store.updatePet(petId, payload);
    }

    wx.showToast({ title: mode === 'add' ? '添加成功' : '保存成功', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 800);
  },
});
