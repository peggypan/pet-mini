const POINT_TYPES = [
  '宠物医院',
  '宠物门店',
  '宠物友好公园',
  '宠物友好酒店',
  '宠物友好商场',
  '宠物友好餐厅',
  '宠物友好景区',
  '宠物友好露营地',
  '其他',
  '宠物不友好',
  '宠物毒点',
];

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function normalizeImages(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((u) => trim(u)).filter(Boolean).slice(0, 6);
}

function pickMapPayload(raw) {
  const p = raw || {};
  let type = trim(p.type);
  if (!POINT_TYPES.includes(type)) type = '其他';
  const isUnfriendly = type === '宠物不友好';
  const isDanger = type === '宠物毒点';
  const lat = Number(p.latitude);
  const lng = Number(p.longitude);
  return {
    name: trim(p.name),
    type,
    category: trim(p.category) || type,
    address: trim(p.address),
    city: trim(p.city),
    latitude: Number.isFinite(lat) ? lat : 0,
    longitude: Number.isFinite(lng) ? lng : 0,
    allowPet: isUnfriendly || isDanger ? false : p.allowPet !== false,
    danger: isDanger || !!p.danger,
    dangerDesc: isDanger ? trim(p.dangerDesc) : trim(p.dangerDesc),
    distance: trim(p.distance) || '已选位置',
    images: normalizeImages(p.images),
    rating: p.rating != null ? Number(p.rating) : undefined,
  };
}

function validateMap(body) {
  if (!body.name || !body.address) return '请填写名称和地址';
  if (!body.latitude || !body.longitude) return '请选择地图位置';
  if (body.type === '宠物毒点' && !body.dangerDesc) return '请填写毒点说明';
  return '';
}

function publicMap(doc, viewerOpenid) {
  if (!doc) return null;
  const { _id, _openid, ...rest } = doc;
  const isMine = viewerOpenid && (doc.openid === viewerOpenid || doc._openid === viewerOpenid);
  return {
    id: _id,
    ...rest,
    type: rest.type || rest.category,
    category: rest.category || rest.type,
    isMine: !!isMine,
    status: rest.auditStatus === 'approved' ? 'approved' : rest.auditStatus,
  };
}

module.exports = {
  pickMapPayload,
  validateMap,
  publicMap,
  POINT_TYPES,
};
