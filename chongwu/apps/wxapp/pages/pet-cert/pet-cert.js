const { getDefaultPet } = require('../../utils/catalog');
const store = require('../../utils/store');
const {
  isPetProfileComplete,
  getPetAuditStatus,
  petProfileGateMessage,
  hasPetProfile,
  requireInteract,
} = require('../../utils/pet-profile-guard');
const { drawQrToTempFile } = require('../../utils/qrcode');
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
    qrImageSrc: '',
    qrFailed: false,
  },

  onShow() {
    const pet = getDefaultPet();
    const profileComplete = isPetProfileComplete();
    const auditStatus = getPetAuditStatus(pet) || '';
    const auditBannerText = profileComplete ? (petProfileGateMessage(pet) || '') : '';
    const certReady = profileComplete && auditStatus !== 'rejected' && auditStatus !== 'hidden';
    const patch = { pet, profileComplete, auditStatus, auditBannerText };
    if (!certReady) {
      patch.qrImageSrc = '';
      patch.qrFailed = false;
    }
    this.setData(patch, () => {
      if (certReady) this.refreshCertQr(pet);
    });
  },

  onRetryQr() {
    this.refreshCertQr(this.data.pet || getDefaultPet());
  },

  async refreshCertQr(pet) {
    if (this._qrGenerating) return;
    this._qrGenerating = true;
    const row = pet.id ? store.getPet(pet.id) || pet : store.listPets()[0] || pet;
    if (row && row.id) {
      store.registerPublicPetCert(row);
      await publishPetCertToCloud(row.id).catch(() => {});
    }
    this.setData({ qrDrawing: true, qrImageSrc: '', qrFailed: false });
    try {
      await wx.nextTick();
      await new Promise((r) => setTimeout(r, 48));
      const content = buildPetCertQrContent(row);
      const path = await drawQrToTempFile(this, 'petCertQr', content);
      this.setData({ qrImageSrc: path, qrFailed: false });
    } catch (e) {
      console.warn('pet cert qr', e);
      this.setData({ qrFailed: true });
    } finally {
      this.setData({ qrDrawing: false });
      this._qrGenerating = false;
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
    const { requireLogin } = require('../../utils/require-login');
    if (!requireLogin()) return;
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
    if (!requireInteract()) return;
    const pet = this.data.pet || {};
    const q = pet.id ? `?petId=${pet.id}` : '';
    wx.navigateTo({ url: `/pages/pet-cert-poster/pet-cert-poster${q}` });
  },
});
