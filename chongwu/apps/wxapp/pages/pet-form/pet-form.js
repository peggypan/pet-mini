const api = require('../../utils/request');

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
  },

  onLoad(options) {
    if (options.petId) {
      this.setData({ mode: 'edit', petId: options.petId });
      this.loadPetDetail(options.petId);
    }
  },

  async loadPetDetail(id) {
    try {
      const res = await api.get(`/health/pets/${id}`);
      const pet = res.data;
      this.setData({
        name: pet.name,
        species: pet.species,
        breedName: pet.breedName || '',
        gender: pet.gender || 0,
        birthday: pet.birthday || '',
        weight: pet.weight || '',
        color: pet.color || '',
        isSterilized: pet.isSterilized,
        microchip: pet.microchip || '',
        remark: pet.remark || '',
      });
    } catch (e) {
      console.error(e);
    }
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
    const { name, species, breedName, gender, birthday, weight, color, isSterilized, microchip, remark } = this.data;
    
    if (!name) {
      wx.showToast({ title: '请输入宠物名字', icon: 'none' });
      return;
    }

    try {
      if (this.data.mode === 'add') {
        await api.post('/health/pets', {
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
        });
        wx.showToast({ title: '添加成功', icon: 'success' });
      }
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },
});
