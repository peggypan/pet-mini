const VACCINE = ['immune', 'vaccinating', 'none'];
const AUDIT = ['pending', 'approved', 'rejected', 'hidden'];
const { isBrokenMediaUrl } = require('./media-urls');

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function pickPetPayload(raw) {
  const p = raw || {};
  const species = Number(p.species);
  const gender = Number(p.gender);
  const vaccineStatus = VACCINE.includes(p.vaccineStatus) ? p.vaccineStatus : 'none';
  const galleryPhotos = Array.isArray(p.galleryPhotos)
    ? p.galleryPhotos.filter(Boolean).slice(0, 6)
    : [];
  const socialTags = Array.isArray(p.socialTags)
    ? p.socialTags.map((t) => trim(t)).filter(Boolean).slice(0, 6)
    : (trim(p.socialTagsText || '')
        .split(/[,，、\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 6));

  const activityAreaName = trim(p.activityAreaName);
  const activityAreaAddress = trim(p.activityAreaAddress);

  return {
    name: trim(p.name),
    species: species >= 1 && species <= 3 ? species : 2,
    breedName: trim(p.breedName),
    gender: gender >= 0 && gender <= 2 ? gender : 0,
    birthday: trim(p.birthday),
    weight: p.weight != null && p.weight !== '' ? Number(p.weight) : undefined,
    color: trim(p.color),
    isSterilized: !!p.isSterilized,
    microchip: trim(p.microchip),
    personality: trim(p.personality),
    socialTags,
    remark: trim(p.remark),
    avatarUrl: trim(p.avatarUrl),
    galleryPhotos,
    vaccineStatus,
    vaccineProofUrl: trim(p.vaccineProofUrl),
    verified: vaccineStatus === 'immune' || !!p.verified,
    emergencyContactName: trim(p.emergencyContactName),
    emergencyContactPhone: trim(p.emergencyContactPhone),
    activityAreaName,
    activityAreaAddress,
    activityAreaLatitude:
      p.activityAreaLatitude != null && p.activityAreaLatitude !== ''
        ? Number(p.activityAreaLatitude)
        : undefined,
    activityAreaLongitude:
      p.activityAreaLongitude != null && p.activityAreaLongitude !== ''
        ? Number(p.activityAreaLongitude)
        : undefined,
    activityArea: activityAreaName || activityAreaAddress || trim(p.activityArea),
    healingPet: !!p.healingPet,
    healingBuddyType: p.healingPet ? trim(p.healingBuddyType) : '',
    healingIntro: p.healingPet ? trim(p.healingIntro) : '',
  };
}

function validatePetMedia(body) {
  const urls = [
    body.avatarUrl,
    body.vaccineProofUrl,
    ...(Array.isArray(body.galleryPhotos) ? body.galleryPhotos : []),
  ].filter(Boolean);
  const bad = urls.find((u) => isBrokenMediaUrl(u));
  if (bad) return '图片尚未上传到云存储，请重新选择后再保存';
  return '';
}

function validatePet(body) {
  if (!body.name) return '请填写宠物名字';
  if (!body.breedName) return '请填写品种';
  if (!body.avatarUrl || body.avatarUrl.includes('/assets/mock/')) return '请上传宠物主照片';
  const gallery = Array.isArray(body.galleryPhotos) ? body.galleryPhotos.filter(Boolean) : [];
  if (!gallery.length) return '请上传至少一张多角度照片';
  const vs = body.vaccineStatus || 'none';
  if ((vs === 'immune' || vs === 'vaccinating') && !body.vaccineProofUrl) return '请上传免疫证明';
  if (!body.emergencyContactName || !body.emergencyContactPhone) return '请填写紧急联系人';
  const mediaMsg = validatePetMedia(body);
  if (mediaMsg) return mediaMsg;
  return '';
}

function publicPet(doc) {
  if (!doc) return null;
  const { _id, _openid, ...rest } = doc;
  return {
    id: _id,
    ...rest,
  };
}

module.exports = {
  pickPetPayload,
  validatePet,
  validatePetMedia,
  publicPet,
  VACCINE,
  AUDIT,
};
