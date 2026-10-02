/**
 * 与小程序 wxapp 模块字段、文案对齐（运营台展示用）
 */

export const COMMUNITY_ZONE_LABELS: Record<string, string> = {
  cat: '猫猫',
  dog: '狗狗',
  other: '异宠',
  activity: '宠物活动',
  photo: '宠物摄影',
  social: '交友',
  expose: '爆料',
};

export const LOST_TYPE_LABELS: Record<string, string> = {
  lost: '寻宠',
  found: '招领',
  rescue: '救助',
  adopt: '领养',
};

export const HEALING_EVENT_CATEGORY = '疗愈活动';

export const BUDDY_ZONE_LABELS: Record<string, string> = {
  normal: '普通搭子',
  match: '相亲&借配',
  healing: '疗愈搭子',
};

export const HEALING_BUDDY_TYPES = [
  '疗愈散步搭子',
  '情绪陪伴交流',
  '老年宠照护',
  '康复遛弯同行',
] as const;

export const NORMAL_BUDDY_TYPES = [
  '遛狗搭子',
  '撸猫搭子',
  '携宠旅行搭子',
  '露营搭子',
  '宠物下午茶',
  '异宠交流',
] as const;

export const EVENT_CATEGORY_OPTIONS = [
  '遛狗社交',
  '撸猫社交',
  '宠物聚会',
  '萌宠摄影',
  '宠物科普',
  '爱心领养',
  '赛事举办',
  '疗愈活动',
  '其他',
] as const;

export const EVENT_ROLE_LABELS: Record<string, string> = {
  personal: '个人发布',
  merchant: '商家发布',
};

export const RESCUE_SOURCE_LABELS: Record<string, string> = {
  social: '社区帖（lost-publish）',
  local: '本地领养帖',
};

export function zoneLabel(zoneId?: string) {
  if (!zoneId) return '—';
  return COMMUNITY_ZONE_LABELS[zoneId] || zoneId;
}

export function lostTypeLabel(type?: string) {
  if (!type) return '';
  return LOST_TYPE_LABELS[type] || type;
}

export function buddyZoneLabel(zone?: string) {
  if (!zone) return '普通搭子';
  return BUDDY_ZONE_LABELS[zone] || zone;
}

export function isHealingEventCategory(category?: string) {
  return category === HEALING_EVENT_CATEGORY;
}
