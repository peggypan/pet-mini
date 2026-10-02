function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function speciesLabel(species) {
  const n = Number(species);
  if (n === 1) return '猫';
  if (n === 2) return '狗';
  return '其他';
}

function genderLabel(gender) {
  const n = Number(gender);
  if (n === 1) return '公';
  if (n === 2) return '母';
  return '';
}

function vaccineLabelFromSnap(snap) {
  if (!snap) return '';
  if (snap.v === 'immune' || snap.verified) return '已免疫 ✓';
  if (snap.v === 'vaccinating') return '免疫中';
  if (snap.v === 'none') return '未免疫';
  return '';
}

function buildPublicPetCertSnapshot(pet) {
  const p = pet || {};
  const petId = p._id || p.id || '';
  return {
    id: String(petId),
    n: trim(p.name),
    b: trim(p.breedName || p.breed),
    sp: speciesLabel(p.species),
    g: genderLabel(p.gender),
    bd: trim(p.birthday),
    w: p.weight != null ? String(p.weight) : '',
    c: trim(p.color),
    st: p.isSterilized ? 1 : 0,
    v: p.vaccineStatus || (p.verified ? 'immune' : 'none'),
    p: trim(p.personality),
    t: Array.isArray(p.socialTags) ? p.socialTags.filter(Boolean).slice(0, 6) : [],
    a: trim(p.avatarUrl || p.avatar),
    ar: trim(p.activityAreaName),
    vp: trim(p.vaccineProofUrl),
    ts: Date.now(),
  };
}

function expandSnapshot(snap) {
  if (!snap) return null;
  return {
    id: snap.id,
    name: snap.n,
    breed: snap.b,
    speciesLabel: snap.sp,
    genderLabel: snap.g,
    birthday: snap.bd,
    weight: snap.w,
    color: snap.c,
    isSterilized: !!snap.st,
    vaccineStatus: snap.v,
    vaccineLabel: vaccineLabelFromSnap(snap),
    personality: snap.p,
    socialTags: snap.t || [],
    avatar: snap.a,
    activityAreaName: snap.ar,
    vaccineProofUrl: snap.vp || '',
    verifiedAt: snap.ts,
  };
}

function isPetCertPublishable(pet) {
  if (!pet || pet.status === 0) return false;
  const audit = pet.auditStatus || 'approved';
  if (audit === 'rejected' || audit === 'hidden') return false;
  if (!trim(pet.name)) return false;
  return true;
}

function publicPetCert(doc) {
  if (!doc) return null;
  const snap = doc.snapshot || {};
  const expanded = expandSnapshot(snap);
  return {
    id: doc._id,
    petId: doc.petId,
    petName: doc.petName || expanded.name,
    snapshot: snap,
    cert: expanded,
    publishedAt: doc.publishedAt,
  };
}

module.exports = {
  buildPublicPetCertSnapshot,
  expandSnapshot,
  isPetCertPublishable,
  publicPetCert,
};
