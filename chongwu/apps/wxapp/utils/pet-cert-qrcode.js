/**
 * 电子宠证二维码：编码查验快照（含免疫证明；不含紧急联系人电话）
 * 扫码打开 pages/pet-cert-verify；HTTPS 链接需在公众平台配置「扫普通链接二维码打开小程序」
 */

const store = require('./store');

/** 查验链接域名（示例，上线请替换并在公众平台配置） */
const PET_CERT_QR_HOST = 'https://pet.chetoutou.com';

function encodeBase64Utf8(str) {
  const bytes = unescape(encodeURIComponent(String(str || '')));
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) buf[i] = bytes.charCodeAt(i);
  return wx.arrayBufferToBase64(buf.buffer);
}

function decodeBase64Utf8(b64) {
  const ab = wx.base64ToArrayBuffer(String(b64 || ''));
  const u8 = new Uint8Array(ab);
  let raw = '';
  for (let i = 0; i < u8.length; i += 1) raw += String.fromCharCode(u8[i]);
  return decodeURIComponent(escape(raw));
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
  if (snap.v === 'immune' || snap.verified) return '已免疫 ✓';
  if (snap.v === 'vaccinating') return '免疫中';
  if (snap.v === 'none') return '未免疫';
  return '';
}

/** 公开查验快照（短字段名便于 QR 容量） */
function buildPublicPetCertSnapshot(pet) {
  const p = pet || {};
  return {
    id: p.id || '',
    n: p.name || '',
    b: p.breedName || p.breed || '',
    sp: speciesLabel(p.species),
    g: genderLabel(p.gender),
    bd: p.birthday || '',
    w: p.weight != null ? String(p.weight) : '',
    c: p.color || '',
    st: p.isSterilized ? 1 : 0,
    v: p.vaccineStatus || (p.verified ? 'immune' : 'none'),
    p: p.personality || '',
    t: Array.isArray(p.socialTags) ? p.socialTags.filter(Boolean).slice(0, 6) : [],
    a: p.avatarUrl || p.avatar || '',
    ar: p.activityAreaName || '',
    vp: p.vaccineProofUrl || '',
    ts: Date.now(),
  };
}

function mergeLocalProof(expanded) {
  if (!expanded) return expanded;
  if (expanded.vaccineProofUrl) return expanded;
  if (!expanded.id) return expanded;
  const local = store.getPet(expanded.id);
  if (local && local.vaccineProofUrl) {
    return { ...expanded, vaccineProofUrl: local.vaccineProofUrl };
  }
  return expanded;
}

function expandSnapshot(snap) {
  if (!snap) return null;
  return mergeLocalProof({
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
  });
}

function packSnapshotToParam(snap) {
  return encodeURIComponent(encodeBase64Utf8(JSON.stringify(snap)));
}

function unpackSnapshotFromParam(param) {
  if (!param) return null;
  try {
    const json = decodeBase64Utf8(decodeURIComponent(param));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

/** 生成二维码文本内容 */
function buildPetCertQrContent(pet) {
  const snap = buildPublicPetCertSnapshot(pet);
  if (pet && pet.id) store.registerPublicPetCert(pet);
  const d = encodeBase64Utf8(JSON.stringify(snap));
  const short = `${PET_CERT_QR_HOST}/cert?d=${encodeURIComponent(d)}`;
  if (short.length <= 900) return short;
  return `${PET_CERT_QR_HOST}/cert?petId=${encodeURIComponent(pet.id || snap.id || '')}`;
}

function extractQueryParam(text, key) {
  const m = String(text || '').match(new RegExp(`[?&]${key}=([^&#]+)`));
  return m ? decodeURIComponent(m[1]) : '';
}

/** 解析扫一扫 / 链接结果 */
function parsePetCertScanPayload(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;

  if (text.startsWith('PETCERT:')) {
    try {
      const snap = JSON.parse(decodeBase64Utf8(text.slice(8)));
      return expandSnapshot(snap);
    } catch (e) {
      return null;
    }
  }

  const d = extractQueryParam(text, 'd');
  if (d) {
    const snap = unpackSnapshotFromParam(d);
    if (snap) return expandSnapshot(snap);
  }

  const petId = extractQueryParam(text, 'petId');
  if (petId) {
    const snap = store.getPublicPetCert(petId) || buildPublicPetCertSnapshot(store.getPet(petId));
    if (snap && (snap.n || snap.name)) return expandSnapshot(snap);
  }

  if (text.includes('/pages/pet-cert-verify')) {
    const d2 = extractQueryParam(text, 'd');
    const snap = unpackSnapshotFromParam(d2);
    if (snap) return expandSnapshot(snap);
  }

  return null;
}

function resolveVerifyPet(options) {
  const opts = options || {};
  if (opts.d) {
    const snap = unpackSnapshotFromParam(opts.d);
    if (snap) return expandSnapshot(snap);
  }
  if (opts.petId) {
    const fromReg = store.getPublicPetCert(opts.petId);
    if (fromReg) return expandSnapshot(fromReg);
    const local = store.getPet(opts.petId);
    if (local) return expandSnapshot(buildPublicPetCertSnapshot(local));
  }
  if (opts.from === 'scan') {
    const cached = wx.getStorageSync('_scan_pet_cert');
    if (cached) return cached;
  }
  return null;
}

module.exports = {
  PET_CERT_QR_HOST,
  buildPublicPetCertSnapshot,
  buildPetCertQrContent,
  parsePetCertScanPayload,
  resolveVerifyPet,
  expandSnapshot,
  packSnapshotToParam,
};
