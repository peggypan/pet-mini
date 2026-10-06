const store = require('../../utils/store');
const cloudApi = require('../../utils/cloud-api');
const {
  refreshHostApplyFromCloud,
  submitHostApplyToCloud,
  withdrawHostApplyFromCloud,
} = require('../../utils/host-apply-cloud-sync');
const { saveClubToCloud } = require('../../utils/club-cloud-sync');
const { chooseMedia } = require('../../utils/choose-media');
const { blockSubPageWithoutLogin } = require('../../utils/pet-profile-guard');
const { requireLogin } = require('../../utils/require-login');

function applyStatus(apply, remote) {
  const s = (remote && (remote.auditStatus || remote.status))
    || (apply && apply.status)
    || '';
  return s;
}

function isSubmittedApplyStatus(status) {
  return status === 'pending' || status === 'approved' || status === 'rejected';
}

function formPatchFromSources(remote, localApply, club) {
  const src = remote || {};
  const nested = (src.apply && typeof src.apply === 'object' ? src.apply : null) || localApply || null;
  const status = applyStatus(nested, src);
  const hasApply = nested && isSubmittedApplyStatus(status);
  const name = src.clubName || (nested && nested.name) || (nested && nested.clubName) || (club && club.name) || '';
  return {
    apply: hasApply
      ? {
        ...nested,
        status,
        name,
        clubName: name,
      }
      : null,
    name,
    city: src.city || (nested && nested.city) || (club && club.city) || '',
    intro: src.intro || (nested && nested.intro) || (club && club.intro) || '',
    contact: src.contact || (nested && nested.contact) || '',
    cover: src.cover || (nested && nested.cover) || (club && club.cover) || '',
    entityType: src.entityType || (nested && nested.entityType) || 'personal',
    realName: src.realName || '',
    idCard: src.idCard || '',
    idFrontImage: src.idFrontImage || '',
    idBackImage: src.idBackImage || '',
    companyName: src.companyName || '',
    licenseNo: src.licenseNo || '',
    legalPerson: src.legalPerson || '',
    licenseImage: src.licenseImage || '',
  };
}

Page({
  data: {
    apply: null,
    readonly: false,
    pageMode: 'edit',
    clubProfileEdit: false,
    name: '',
    city: '',
    intro: '',
    contact: '',
    cover: '',
    entityType: 'personal',
    realName: '',
    idCard: '',
    idFrontImage: '',
    idBackImage: '',
    companyName: '',
    licenseNo: '',
    legalPerson: '',
    licenseImage: '',
  },

  onLoad(options) {
    blockSubPageWithoutLogin(this);
    const mode = (options && options.mode) || 'edit';
    this._clubId = (options && options.clubId) || '';
    const readonly = mode === 'view';
    this._formDirty = false;
    this._hydratedOnce = false;
    this.setData({ readonly, pageMode: mode });
    wx.setNavigationBarTitle({
      title: readonly ? '查看入驻信息' : (mode === 'edit' && options.clubId ? '编辑入驻信息' : '成为主理人'),
    });
  },

  onShow() {
    const storeCity = store.getCity();
    this._lastStoreCity = storeCity;
    if (storeCity && storeCity !== this.data.city) {
      this.setData({ city: storeCity });
    }

    if (this.data.readonly) {
      this.loadFormFromCloud({ force: true });
      return;
    }
    if (this._formDirty) return;
    if (this._hydratedOnce) return;

    this.loadFormFromCloud({ force: false });
  },

  loadFormFromCloud({ force }) {
    const club = this._clubId ? store.getClubFromCache(this._clubId) : null;
    const localApply = store.getClubApply();

    const finishHydrate = (remote) => {
      if (!force && this._formDirty) return;
      const patch = formPatchFromSources(remote, localApply, club);
      const storeCity = store.getCity();
      if (storeCity) patch.city = storeCity;
      else if (this.data.city) patch.city = this.data.city;

      const st = applyStatus(patch.apply, remote);
      patch.clubProfileEdit = !this.data.readonly
        && (st === 'approved' || (club && club.onlineStatus === 'online'))
        && !!this._clubId;

      this.setData(patch);
      this._hydratedOnce = true;
    };

    if (cloudApi.cloudEnabled()) {
      refreshHostApplyFromCloud()
        .then(({ remote }) => finishHydrate(remote))
        .catch(() => finishHydrate(null));
    } else {
      finishHydrate(null);
    }
  },

  markFormDirty() {
    this._formDirty = true;
  },

  onInput(e) {
    if (this.data.readonly) return;
    this.markFormDirty();
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  onPickCity() {
    if (this.data.readonly) return;
    wx.navigateTo({ url: '/pages/city-picker/city-picker' });
  },

  onSwitchEntity(e) {
    if (this.data.readonly) return;
    const entityType = e.currentTarget.dataset.type;
    if (!entityType || entityType === this.data.entityType) return;
    this.markFormDirty();
    this.setData({ entityType });
  },

  onChooseCover() {
    if (this.data.readonly) return;
    chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (file) {
          this.markFormDirty();
          this.setData({ cover: file.tempFilePath });
        }
      },
    });
  },

  onPickIdImage(e) {
    if (this.data.readonly) return;
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (file) {
          this.markFormDirty();
          this.setData({ [field]: file.tempFilePath });
        }
      },
    });
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.previewImage({ urls: [url], current: url });
  },

  onReset() {
    if (this.data.readonly) return;
    wx.showModal({
      title: '撤回申请',
      content: '撤回后可重新填写入驻信息',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中', mask: true });
        try {
          await withdrawHostApplyFromCloud();
          this._formDirty = false;
          this._hydratedOnce = false;
          this.setData({ apply: null });
          wx.showToast({ title: '已撤回', icon: 'success' });
        } catch (e) {
          wx.showToast({ title: e.message || '撤回失败', icon: 'none' });
        } finally {
          wx.hideLoading();
        }
      },
    });
  },

  showSubmitFeedback(title, { error = false } = {}) {
    wx.hideLoading();
    setTimeout(() => {
      if (error) {
        wx.showModal({
          title: '提交未成功',
          content: title || '请稍后重试',
          showCancel: false,
        });
      } else {
        wx.showToast({ title: title || '已提交', icon: 'success', duration: 2500 });
      }
    }, 100);
  },

  async onSubmit() {
    if (this._submitLock) return;
    if (!requireLogin()) return;
    const { name, city, intro, contact, cover, apply, clubProfileEdit } = this.data;

    if (clubProfileEdit) {
      if (!name) return wx.showToast({ title: '请填写俱乐部名称', icon: 'none' });
      if (!city) return wx.showToast({ title: '请选择所在城市', icon: 'none' });
      if (!intro) return wx.showToast({ title: '请填写俱乐部介绍', icon: 'none' });
      if (!cover) return wx.showToast({ title: '请上传俱乐部封面', icon: 'none' });
      wx.showLoading({ title: '保存中', mask: true });
      try {
        await saveClubToCloud({ name, city, intro, cover }, this._clubId);
        wx.showToast({ title: '已保存', icon: 'success' });
      } catch (e) {
        wx.showToast({ title: e.message || '保存失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
      return;
    }

    if (!name) return wx.showToast({ title: '请填写俱乐部名称', icon: 'none' });
    if (!city) return wx.showToast({ title: '请选择所在城市', icon: 'none' });
    if (!intro) return wx.showToast({ title: '请填写俱乐部介绍', icon: 'none' });
    if (!cover) return wx.showToast({ title: '请上传俱乐部封面', icon: 'none' });
    if (!contact) return wx.showToast({ title: '请填写联系方式', icon: 'none' });

    const {
      entityType,
      realName,
      idCard,
      idFrontImage,
      idBackImage,
      companyName,
      licenseNo,
      legalPerson,
      licenseImage,
    } = this.data;

    const pending = apply && apply.status === 'pending';
    const idCardEditable = !idCard || !String(idCard).includes('*');

    if (entityType === 'personal') {
      if (!realName || (!pending && !idCard)) {
        wx.showToast({ title: '请填写对私身份信息', icon: 'none' });
        return;
      }
      if (idCardEditable && idCard && !/^\d{17}[\dXx]$/.test(idCard)) {
        wx.showToast({ title: '身份证号格式不正确', icon: 'none' });
        return;
      }
      if (!idFrontImage || !idBackImage) {
        wx.showToast({ title: '请上传身份证正反面', icon: 'none' });
        return;
      }
    } else {
      if (!companyName || !licenseNo || !legalPerson) {
        wx.showToast({ title: '请填写对公营业执照信息', icon: 'none' });
        return;
      }
      if (!licenseImage) {
        wx.showToast({ title: '请上传营业执照', icon: 'none' });
        return;
      }
    }

    this._submitLock = true;
    wx.showLoading({ title: pending ? '保存中' : '提交中', mask: true });
    try {
      if (!cloudApi.cloudEnabled()) {
        throw new Error('云开发未启用，无法提交到服务器');
      }
      const payload = {
        name,
        city,
        intro,
        contact,
        cover,
        entityType,
        realName,
        idCard: idCardEditable ? idCard : '',
        idFrontImage,
        idBackImage,
        companyName,
        licenseNo,
        legalPerson,
        licenseImage,
      };
      const row = await submitHostApplyToCloud(payload);
      if (!row) {
        throw new Error('服务器未返回申请状态，请稍后在「我的俱乐部」查看');
      }
      this._formDirty = false;
      this._hydratedOnce = true;
      const applyRecord = {
        ...row,
        status: row.status || 'pending',
        clubName: row.name || row.clubName,
      };
      this.setData({ apply: applyRecord });
      this.showSubmitFeedback(pending ? '已保存' : '已提交审核');
    } catch (e) {
      console.error('[club-apply] submit', e);
      this.showSubmitFeedback((e && e.message) || '提交失败', { error: true });
    } finally {
      this._submitLock = false;
    }
  },
});
