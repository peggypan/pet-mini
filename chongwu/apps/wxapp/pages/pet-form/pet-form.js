const api = require('../../utils/request');
const store = require('../../utils/store');
const cloudApi = require('../../utils/cloud-api');
const { savePetToCloud, loadPetFromCloud, refreshPetsFromCloud } = require('../../utils/pet-cloud-sync');
const { getDefaultPets } = require('../../utils/catalog');
const { chooseMedia } = require('../../utils/choose-media');
const amap = require('../../utils/amap');
const { HEALING_BUDDY_TYPES } = require('../../utils/pet-healing');
const { RISK_TIPS } = require('../../utils/mock');
const { validatePetProfile } = require('../../utils/pet-profile-guard');

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
    galleryPhotos: [],
    vaccineStatus: 'none',
    vaccineProofUrl: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    activityAreaName: '',
    activityAreaAddress: '',
    activityAreaLatitude: null,
    activityAreaLongitude: null,
    healingPet: false,
    healingBuddyType: '',
    healingIntro: '',
    healingTypeOptions: HEALING_BUDDY_TYPES,
    healingTip: RISK_TIPS.healing,
    submitting: false,
  },

  onLoad(options) {
    if (cloudApi.cloudEnabled()) {
      refreshPetsFromCloud().catch(() => {});
    }
    if (options.petId) {
      this.setData({ mode: 'edit', petId: options.petId });
      this.loadPetDetail(options.petId);
    }
  },

  async loadPetDetail(id) {
    if (cloudApi.cloudEnabled()) {
      const fromCloud = await loadPetFromCloud(id);
      if (fromCloud) {
        this.applyPet(fromCloud);
        return;
      }
    }
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
      galleryPhotos: Array.isArray(pet.galleryPhotos) ? pet.galleryPhotos.slice() : [],
      vaccineStatus: pet.vaccineStatus || (pet.verified ? 'immune' : 'none'),
      vaccineProofUrl: pet.vaccineProofUrl || '',
      emergencyContactName: pet.emergencyContactName || '',
      emergencyContactPhone: pet.emergencyContactPhone || '',
      activityAreaName: pet.activityAreaName || '',
      activityAreaAddress: pet.activityAreaAddress || '',
      activityAreaLatitude: pet.activityAreaLatitude != null ? pet.activityAreaLatitude : null,
      activityAreaLongitude: pet.activityAreaLongitude != null ? pet.activityAreaLongitude : null,
      healingPet: !!pet.healingPet,
      healingBuddyType: pet.healingBuddyType || '',
      healingIntro: pet.healingIntro || '',
    });
  },

  onChooseActivityArea() {
    amap.choosePoint()
      .then((loc) => {
        this.setData({
          activityAreaName: loc.name || loc.address || '已选区域',
          activityAreaAddress: loc.address || '',
          activityAreaLatitude: loc.latitude,
          activityAreaLongitude: loc.longitude,
        });
      })
      .catch((err) => {
        const msg = (err && err.errMsg) || '';
        if (msg.includes('cancel')) return;
        if (msg.includes('auth deny') || msg.includes('authorize')) {
          wx.showModal({
            title: '需要位置权限',
            content: '地图选点需要授权位置信息，请在设置中开启',
            confirmText: '去设置',
            success: (r) => { if (r.confirm) wx.openSetting(); },
          });
          return;
        }
        wx.showToast({ title: '选点失败，请重试', icon: 'none' });
      });
  },

  onClearActivityArea() {
    this.setData({
      activityAreaName: '',
      activityAreaAddress: '',
      activityAreaLatitude: null,
      activityAreaLongitude: null,
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

  onChooseGalleryPhotos() {
    const left = 6 - (this.data.galleryPhotos || []).length;
    if (left <= 0) return;
    chooseMedia({
      count: Math.min(left, 6),
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = (res.tempFiles || []).map((f) => f.tempFilePath).filter(Boolean);
        if (!paths.length) return;
        this.setData({
          galleryPhotos: [...(this.data.galleryPhotos || []), ...paths].slice(0, 6),
        });
      },
    });
  },

  onRemoveGalleryPhoto(e) {
    const index = Number(e.currentTarget.dataset.index);
    const list = [...(this.data.galleryPhotos || [])];
    if (index < 0 || index >= list.length) return;
    list.splice(index, 1);
    this.setData({ galleryPhotos: list });
  },

  onVaccineStatusTap(e) {
    const value = e.currentTarget.dataset.value;
    if (!value) return;
    this.setData({ vaccineStatus: value });
  },

  onChooseVaccineProof() {
    chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (file && file.tempFilePath) {
          this.setData({ vaccineProofUrl: file.tempFilePath });
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
    this.setData({ gender: Number(e.detail.value) + 1 });
  },

  onBirthdayChange(e) {
    this.setData({ birthday: e.detail.value });
  },

  onSterilizedChange(e) {
    this.setData({ isSterilized: e.detail.value });
  },

  onHealingPetChange(e) {
    const next = !!e.detail.value;
    if (!next) {
      this.setData({ healingPet: false });
      return;
    }
    wx.showModal({
      title: '宠物疗愈说明',
      content: RISK_TIPS.healing,
      confirmText: '开启',
      cancelText: '暂不',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            healingPet: true,
            healingBuddyType: this.data.healingBuddyType || HEALING_BUDDY_TYPES[0],
          });
        } else {
          this.setData({ healingPet: false });
        }
      },
    });
  },

  onHealingTypeTap(e) {
    const type = e.currentTarget.dataset.type;
    if (!type) return;
    this.setData({ healingBuddyType: type, healingPet: true });
  },

  async onSubmit() {
    const {
      name, species, breedName, gender, birthday, weight, color,
      isSterilized, microchip, personality, socialTagsText, remark, mode, petId, submitting,
      galleryPhotos, vaccineStatus, vaccineProofUrl, emergencyContactName, emergencyContactPhone,
      activityAreaName, activityAreaAddress, activityAreaLatitude, activityAreaLongitude,
      healingPet, healingBuddyType, healingIntro,
    } = this.data;

    if (submitting) return;

    const socialTags = (socialTagsText || '')
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);

    const draft = {
      name,
      species,
      breedName,
      gender,
      birthday,
      weight,
      color,
      isSterilized,
      personality,
      socialTags,
      socialTagsText,
      remark,
      avatarUrl: this.data.avatarUrl,
      galleryPhotos: galleryPhotos || [],
      vaccineStatus: vaccineStatus || 'none',
      vaccineProofUrl,
      emergencyContactName,
      emergencyContactPhone,
      healingPet: !!healingPet,
      healingBuddyType: healingPet ? (healingBuddyType || '').trim() : '',
      healingIntro: healingPet ? (healingIntro || '').trim() : '',
    };
    const check = validatePetProfile(draft);
    if (!check.ok) {
      wx.showToast({ title: check.message || '请完善必填项', icon: 'none' });
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
      personality,
      socialTags,
      remark,
      avatarUrl: this.data.avatarUrl || undefined,
      galleryPhotos: (galleryPhotos || []).slice(0, 6),
      vaccineStatus: vaccineStatus || 'none',
      vaccineProofUrl: vaccineProofUrl || '',
      emergencyContactName: (emergencyContactName || '').trim(),
      emergencyContactPhone: (emergencyContactPhone || '').trim(),
      verified: vaccineStatus === 'immune',
      activityAreaName: (activityAreaName || '').trim(),
      activityAreaAddress: (activityAreaAddress || '').trim(),
      activityAreaLatitude: activityAreaLatitude != null ? Number(activityAreaLatitude) : undefined,
      activityAreaLongitude: activityAreaLongitude != null ? Number(activityAreaLongitude) : undefined,
      healingPet: !!healingPet,
      healingBuddyType: healingPet ? (healingBuddyType || '').trim() : '',
      healingIntro: healingPet ? (healingIntro || '').trim() : '',
    };

    try {
      if (cloudApi.cloudEnabled()) {
        await savePetToCloud(payload, mode === 'edit' ? petId : null);
      } else if (mode === 'add') {
        store.addPet(payload);
      } else if (petId) {
        store.updatePet(petId, payload);
      }
      wx.showToast({
        title: mode === 'add' ? '档案已保存' : '档案已更新',
        icon: 'success',
      });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (err) {
      wx.showToast({
        title: (err && err.message) || '保存失败，请重试',
        icon: 'none',
      });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
