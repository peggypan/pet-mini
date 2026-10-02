const store = require('./store');

const PET_FORM_PATH = '/pages/pet-form/pet-form';

const VACCINE_STATUSES = ['immune', 'vaccinating', 'none'];

function trim(s) {
  return String(s == null ? '' : s).trim();
}

function getPrimaryPet() {
  const pets = store.listPets();
  return pets.length ? pets[0] : null;
}

function hasRealAvatar(pet) {
  const url = trim(pet.avatarUrl || pet.avatar);
  if (!url) return false;
  if (url.includes('/assets/mock/')) return false;
  return true;
}

function normalizeSocialTags(pet) {
  if (Array.isArray(pet.socialTags) && pet.socialTags.length) {
    return pet.socialTags.map((t) => trim(t)).filter(Boolean);
  }
  const text = trim(pet.socialTagsText);
  if (!text) return [];
  return text.split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean);
}

/**
 * 档案完整性（常活动区域为选填，其余必填）
 * @returns {{ ok: boolean, message?: string }}
 */
function validatePetProfile(pet) {
  if (!pet) {
    return { ok: false, message: '请先完善宠物档案' };
  }

  if (!hasRealAvatar(pet)) {
    return { ok: false, message: '请上传宠物主照片' };
  }

  const gallery = Array.isArray(pet.galleryPhotos) ? pet.galleryPhotos.filter(Boolean) : [];
  if (!gallery.length) {
    return { ok: false, message: '请上传至少一张多角度照片' };
  }

  const vaccineStatus = pet.vaccineStatus || (pet.verified ? 'immune' : 'none');
  if (!VACCINE_STATUSES.includes(vaccineStatus)) {
    return { ok: false, message: '请选择疫苗情况' };
  }
  if ((vaccineStatus === 'immune' || vaccineStatus === 'vaccinating') && !trim(pet.vaccineProofUrl)) {
    return { ok: false, message: '请上传免疫证明' };
  }

  if (!trim(pet.name)) {
    return { ok: false, message: '请输入宠物名字' };
  }

  const species = Number(pet.species);
  if (!species || species < 1 || species > 3) {
    return { ok: false, message: '请选择宠物种类' };
  }

  if (!trim(pet.breedName || pet.breed)) {
    return { ok: false, message: '请输入品种' };
  }

  const gender = Number(pet.gender);
  if (gender !== 1 && gender !== 2) {
    return { ok: false, message: '请选择性别（公或母）' };
  }

  if (!trim(pet.birthday)) {
    return { ok: false, message: '请选择生日' };
  }

  const weightRaw = pet.weight;
  if (weightRaw == null || weightRaw === '' || Number.isNaN(Number(weightRaw)) || Number(weightRaw) <= 0) {
    return { ok: false, message: '请输入有效体重' };
  }

  if (!trim(pet.color)) {
    return { ok: false, message: '请输入毛色' };
  }

  if (typeof pet.isSterilized !== 'boolean') {
    return { ok: false, message: '请设置绝育状态' };
  }

  if (!trim(pet.emergencyContactName)) {
    return { ok: false, message: '请输入紧急联系人' };
  }

  const phone = trim(pet.emergencyContactPhone);
  if (!/^1\d{10}$/.test(phone)) {
    return { ok: false, message: '请输入11位联系电话' };
  }

  if (!trim(pet.personality)) {
    return { ok: false, message: '请填写性格描述' };
  }

  const socialTags = normalizeSocialTags(pet);
  if (!socialTags.length) {
    return { ok: false, message: '请填写至少一个交友标签' };
  }

  if (pet.healingPet && !trim(pet.healingBuddyType)) {
    return { ok: false, message: '开启宠物疗愈请选择疗愈类型' };
  }

  return { ok: true };
}

function getPetAuditStatus(pet) {
  return store.normalizePetAuditStatus(pet);
}

/** 档案字段是否填全（不含平台审核） */
function isPetProfileComplete() {
  return validatePetProfile(getPrimaryPet()).ok;
}

/** 档案必填项已完善即可使用功能（无需平台审核） */
function hasPetProfile() {
  const pet = getPrimaryPet();
  if (!validatePetProfile(pet).ok) return false;
  const status = getPetAuditStatus(pet);
  if (status === 'rejected' || status === 'hidden') return false;
  return true;
}

function petProfileGateMessage(pet) {
  const check = validatePetProfile(pet);
  if (!check.ok) {
    return check.message || '请先完善宠物档案';
  }
  const status = getPetAuditStatus(pet);
  if (status === 'rejected') {
    const reason = trim(pet.rejectReason);
    return reason
      ? `档案未通过审核：${reason}。请修改后重新提交`
      : '档案未通过审核，请修改资料后重新提交';
  }
  if (status === 'hidden') {
    return '档案已被隐藏，请联系客服或重新编辑提交';
  }
  return '';
}

function syncPetProfileGate(pageCtx, dataKey = 'petProfileBlocked') {
  if (!pageCtx || typeof pageCtx.setData !== 'function') return hasPetProfile();
  const blocked = !hasPetProfile();
  const pet = getPrimaryPet();
  const auditStatus = pet ? getPetAuditStatus(pet) : '';
  pageCtx.setData({ [dataKey]: blocked, petAuditStatus: auditStatus });
  return !blocked;
}

function requirePetProfile(options = {}) {
  if (hasPetProfile()) return true;
  const pet = getPrimaryPet();
  const gateMsg = petProfileGateMessage(pet);
  const incomplete = pet ? validatePetProfile(pet) : { ok: false };
  const auditTitle = (() => {
    if (!incomplete.ok) return '请先完善宠物档案';
    const st = getPetAuditStatus(pet);
    if (st === 'rejected') return '档案未通过';
    if (st === 'hidden') return '档案已隐藏';
    return '请先完善宠物档案';
  })();
  const {
    title = auditTitle,
    content = gateMsg
      || (incomplete.message
        ? `${incomplete.message}（常活动区域可选）`
        : '请填写全部必填项后，才可使用搭子、活动与社区互动等功能。'),
    confirmText = '去填写',
    cancelText = '取消',
    onCancel,
  } = options;
  wx.showModal({
    title,
    content,
    confirmText,
    cancelText,
    success: (res) => {
      if (res.confirm) {
        wx.navigateTo({ url: PET_FORM_PATH });
        return;
      }
      if (typeof onCancel === 'function') onCancel();
    },
  });
  return false;
}

/** 发布/私聊等二级页：未建档则提示并返回 */
function blockSubPageWithoutProfile(pageCtx) {
  if (hasPetProfile()) return true;
  const pet = getPrimaryPet();
  const gateMsg = petProfileGateMessage(pet);
  const incomplete = pet ? validatePetProfile(pet) : { ok: false };
  wx.showModal({
    title: (() => {
      if (!incomplete.ok) return '请先完善宠物档案';
      const st = getPetAuditStatus(pet);
      if (st === 'rejected') return '档案未通过';
      if (st === 'hidden') return '档案已隐藏';
      return '请先完善宠物档案';
    })(),
    content: gateMsg
      || (incomplete.message
        ? `${incomplete.message}（常活动区域可选）`
        : '请填写全部必填项后，才可使用搭子、活动与社区互动等功能。'),
    confirmText: '去填写',
    cancelText: '返回',
    showCancel: true,
    success: (res) => {
      if (res.confirm) {
        wx.navigateTo({ url: PET_FORM_PATH });
        return;
      }
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.switchTab({ url: '/pages/home/home' });
      }
    },
  });
  if (pageCtx && typeof pageCtx.setData === 'function') {
    pageCtx.setData({ petProfileBlocked: true });
  }
  return false;
}

module.exports = {
  PET_FORM_PATH,
  getPrimaryPet,
  validatePetProfile,
  isPetProfileComplete,
  getPetAuditStatus,
  petProfileGateMessage,
  hasPetProfile,
  syncPetProfileGate,
  requirePetProfile,
  blockSubPageWithoutProfile,
};
