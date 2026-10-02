const { getDefaultPet } = require('../../utils/catalog');
const store = require('../../utils/store');
const {
  isPetProfileComplete,
  getPetAuditStatus,
  petProfileGateMessage,
  hasPetProfile,
  requirePetProfile,
} = require('../../utils/pet-profile-guard');
const { drawQrCanvas } = require('../../utils/qrcode');
const {
  buildPetCertQrContent,
  parsePetCertScanPayload,
} = require('../../utils/pet-cert-qrcode');
const { publishPetCertToCloud } = require('../../utils/pet-cert-cloud-sync');

Page({
  data: {
    pet: {},
    profileComplete: false,
    auditStatus: '',
    auditBannerText: '',
    qrDrawing: false,
  },

  onShow() {
    const pet = getDefaultPet();
    const profileComplete = isPetProfileComplete();
    const auditStatus = getPetAuditStatus(pet) || '';
    const auditBannerText = profileComplete ? (petProfileGateMessage(pet) || '') : '';
    const certReady = profileComplete && auditStatus !== 'rejected' && auditStatus !== 'hidden';
    this.setData({ pet, profileComplete, auditStatus, auditBannerText }, () => {
      if (certReady) this.refreshCertQr(pet);
    });
  },

  async refreshCertQr(pet) {
    if (this.data.qrDrawing) return;
    const row = pet.id ? store.getPet(pet.id) || pet : store.listPets()[0] || pet;
    if (row && row.id) {
      store.registerPublicPetCert(row);
      await publishPetCertToCloud(row.id).catch(() => {});
    }
    this.setData({ qrDrawing: true });
    try {
      await wx.nextTick();
      const content = buildPetCertQrContent(row);
      await drawQrCanvas(this, 'petCertQr', content);
    } catch (e) {
      console.warn('pet cert qr', e);
    } finally {
      this.setData({ qrDrawing: false });
    }
  },

  onScanVerify() {
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode', 'barCode'],
      success: (res) => {
        const pet = parsePetCertScanPayload(res.result);
        if (!pet || !pet.name) {
          wx.showToast({ title: '无法识别的宠证码', icon: 'none' });
          return;
        }
        wx.setStorageSync('_scan_pet_cert', pet);
        wx.navigateTo({ url: '/pages/pet-cert-verify/pet-cert-verify?from=scan' });
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return;
        wx.showToast({ title: '扫码失败', icon: 'none' });
      },
    });
  },

  onEdit() {
    const pet = this.data.pet || {};
    const q = pet.id ? `?petId=${pet.id}` : '';
    wx.navigateTo({ url: `/pages/pet-form/pet-form${q}` });
  },

  onOpenActivityArea() {
    const pet = this.data.pet || {};
    const lat = Number(pet.activityAreaLatitude);
    const lng = Number(pet.activityAreaLongitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    wx.openLocation({
      latitude: lat,
      longitude: lng,
      name: pet.activityAreaName || '常活动区域',
      address: pet.activityAreaAddress || '',
      scale: 16,
    });
  },

  onShare() {
    if (!hasPetProfile()) {
      requirePetProfile();
      return;
    }
    const pet = this.data.pet || {};
    const q = pet.id ? `?petId=${pet.id}` : '';
    wx.navigateTo({ url: `/pages/pet-cert-poster/pet-cert-poster${q}` });
  },
});
