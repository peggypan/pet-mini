/** 宠物社区 · 分区定义（列表筛选 + 发帖） */
const COMMUNITY_ZONES = [
  { id: 'all', name: '全部', icon: '🏠', desc: '逛一逛', theme: 'all' },
  { id: 'cat', name: '猫猫', icon: '🐱', desc: '养猫日常', theme: 'cat' },
  { id: 'dog', name: '狗狗', icon: '🐶', desc: '遛狗交流', theme: 'dog' },
  { id: 'other', name: '异宠', icon: '🦔', desc: '小宠同好', theme: 'other' },
  { id: 'activity', name: '宠物活动', icon: '🎉', desc: '约玩局', theme: 'activity' },
  { id: 'photo', name: '宠物摄影', icon: '📷', desc: '晒片技巧', theme: 'photo' },
  { id: 'social', name: '交友', icon: '🤝', desc: '找宠友', theme: 'social' },
  { id: 'expose', name: '爆料', icon: '📢', desc: '避坑吐槽', theme: 'expose' },
];

const POST_ZONES = COMMUNITY_ZONES.filter((z) => z.id !== 'all');

const ZONE_LABEL_MAP = POST_ZONES.reduce((acc, z) => {
  acc[z.id] = z.name;
  return acc;
}, {});

function getZoneMeta(zoneId) {
  if (!zoneId || zoneId === 'all') return COMMUNITY_ZONES[0];
  return POST_ZONES.find((z) => z.id === zoneId) || { id: zoneId, name: '社区', icon: '🐾', desc: '', theme: 'all' };
}

function getZoneLabel(zoneId) {
  if (!zoneId || zoneId === 'all') return '全部';
  return ZONE_LABEL_MAP[zoneId] || '社区';
}

function filterPostsByZone(posts, zoneId) {
  const list = posts || [];
  if (!zoneId || zoneId === 'all') return list;
  return list.filter((p) => (p.zone || 'social') === zoneId);
}

function decoratePostZone(post) {
  const meta = getZoneMeta(post.zone || 'social');
  return {
    ...post,
    zoneLabel: meta.name,
    zoneIcon: meta.icon,
    zoneTheme: meta.theme,
  };
}

module.exports = {
  COMMUNITY_ZONES,
  POST_ZONES,
  ZONE_LABEL_MAP,
  getZoneMeta,
  getZoneLabel,
  filterPostsByZone,
  decoratePostZone,
};
