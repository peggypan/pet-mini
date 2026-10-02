function vaccineLabel(status) {
  const v = String(status || '');
  if (v === 'immune' || status === true) return '已免疫';
  if (v === 'vaccinating') return '免疫中';
  if (v === 'none') return '未免疫';
  return '';
}

function speciesLabel(species) {
  const n = Number(species);
  if (n === 1) return '猫';
  if (n === 2) return '狗';
  if (typeof species === 'string' && species) return species;
  return '';
}

function genderLabel(gender) {
  const n = Number(gender);
  if (n === 1) return '公';
  if (n === 2) return '母';
  return '';
}

/** 报名记录上的快照字段 → 展示用宠物信息 */
function petFromSignup(signup) {
  const s = signup || {};
  if (!s.petName && !s.petBreed && !s.petPersonality) return null;
  return {
    id: s.petId || '',
    name: s.petName || '宠物',
    breed: s.petBreed || '',
    speciesLabel: s.petSpecies || '',
    genderLabel: s.petGender || '',
    ageText: s.petAge || '',
    vaccineLabel: vaccineLabel(s.petVaccineStatus),
    personality: s.petPersonality || '',
    socialTags: Array.isArray(s.petTags) ? s.petTags : [],
    avatar: s.petAvatar || '',
    activityAreaName: s.petActivityArea || '',
  };
}

/**
 * 发起人查看：报名 + 宠物档案摘要
 * @param {object} signup
 * @param {object|null} participantPet 云核销返回的公开宠证快照
 */
function buildHostSignupDetail(signup, participantPet) {
  const s = signup || {};
  const pet = participantPet || petFromSignup(s);
  const rows = [
    { label: '报名人', value: s.contactName || '宠友' },
    { label: '手机号', value: s.phone || '未填写' },
    { label: '核销码', value: s.ticketCode || '—' },
    { label: '核销状态', value: s.checkedIn ? '已核销' : '待核销' },
  ];
  if (pet) {
    rows.push({ label: '宠物', value: pet.name || s.petName || '—' });
    const breedLine = [pet.speciesLabel, pet.breed || s.petBreed].filter(Boolean).join(' · ');
    if (breedLine) rows.push({ label: '品种', value: breedLine });
    if (pet.genderLabel || pet.ageText) {
      rows.push({
        label: '性别 / 年龄',
        value: [pet.genderLabel, pet.ageText].filter(Boolean).join(' · ') || '—',
      });
    }
    if (pet.vaccineLabel) rows.push({ label: '免疫', value: pet.vaccineLabel });
    if (pet.personality) rows.push({ label: '性格', value: pet.personality });
    if (pet.activityAreaName) rows.push({ label: '常活动区域', value: pet.activityAreaName });
    if (pet.socialTags && pet.socialTags.length) {
      rows.push({ label: '标签', value: pet.socialTags.join('、') });
    }
  } else if (s.petName || s.petBreed) {
    rows.push({
      label: '宠物',
      value: `${s.petName || '宠物'}${s.petBreed ? ` · ${s.petBreed}` : ''}`,
    });
  }

  return {
    title: s.checkedIn ? '核销信息' : '报名信息',
    subtitle: s.contactName || '宠友',
    rows,
    petId: (pet && pet.id) || s.petId || '',
    petAvatar: (pet && pet.avatar) || s.petAvatar || '',
    signupId: s.id || s._id || '',
  };
}

function petExtrasFromProfile(pet) {
  const p = pet || {};
  const tags = Array.isArray(p.socialTags) ? p.socialTags.filter(Boolean).slice(0, 8) : [];
  return {
    petId: String(p.id || p._id || ''),
    petSpecies: speciesLabel(p.species) || String(p.speciesLabel || ''),
    petGender: genderLabel(p.gender),
    petAge: String(p.age || p.birthday || '').trim(),
    petVaccineStatus: p.vaccineStatus || (p.verified ? 'immune' : ''),
    petPersonality: String(p.personality || '').trim(),
    petTags: tags,
    petAvatar: String(p.avatarUrl || p.avatar || '').trim(),
    petActivityArea: String(p.activityAreaName || '').trim(),
  };
}

module.exports = {
  buildHostSignupDetail,
  petExtrasFromProfile,
  petFromSignup,
};
