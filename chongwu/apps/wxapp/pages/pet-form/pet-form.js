const api = require('../../utils/request');
const store = require('../../utils/store');
const { getDefaultPets } = require('../../utils/catalog');
const { chooseMedia } = require('../../utils/choose-media');

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
    personality: '',
    socialTagsText: '',
    remark: '',
    avatarUrl: '',
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
      personality: pet.personality || '',
      socialTagsText: (pet.socialTags || []).join('、'),
      remark: pet.remark || '',
      avatarUrl: pet.avatarUrl || pet.avatar || '',
    });
  },

  onChooseAvatar() {
    chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (file && file.tempFilePath) {
          this.setData({ avatarUrl: file.tempFilePath });
        }
      },
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
      isSterilized, microchip, personality, socialTagsText, remark, mode, petId, submitting,
    } = this.data;

    if (submitting) return;
    if (!name) {
      wx.showToast({ title: '请输入宠物名字', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    const socialTags = (socialTagsText || '')
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);

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
      personality,
      socialTags,
      remark,
      avatarUrl: this.data.avatarUrl || undefined,
    };

    let saved;
    if (mode === 'add') {
      saved = store.addPet(payload);
    } else if (petId) {
      saved = store.updatePet(petId, payload);
    }

    if (this.data.avatarUrl) {
      const petRaise = require('../../utils/pet-raise');
      petRaise.generateFromPhoto(this.data.avatarUrl, saved || getDefaultPets()[0]);
    }

    wx.showToast({ title: mode === 'add' ? '添加成功' : '保存成功', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 800);
  },
});
