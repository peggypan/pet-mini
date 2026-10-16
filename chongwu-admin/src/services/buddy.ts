import type { BuddyPlazaZone, BuddyPostRow } from '../types';
import { asAuditStatus } from './mappers';

export function mapCloudBuddyToRow(raw: Record<string, unknown>): BuddyPostRow {
  const images = raw.images;
  const mediaList = raw.mediaList;
  let imageList: string[] | undefined;
  if (Array.isArray(images)) imageList = images.map(String);
  else if (Array.isArray(mediaList)) {
    imageList = mediaList
      .map((m) => (m && typeof m === 'object' && 'url' in m ? String((m as { url: string }).url) : ''))
      .filter(Boolean);
  }
  const zone = (raw.zone as BuddyPlazaZone | undefined) || 'normal';
  return {
    id: String(raw.id),
    userName: String(raw.userName || '宠友'),
    title: String(raw.title || raw.buddyType || '找搭子'),
    city: String(raw.city || ''),
    timeSlot: String(raw.timeSlot || raw.time || ''),
    buddyType: raw.buddyType ? String(raw.buddyType) : undefined,
    zone,
    petName: raw.petName ? String(raw.petName) : undefined,
    desc: raw.desc ? String(raw.desc) : undefined,
    healingPetProfile: !!raw.healingPetProfile || String(raw.id || '').startsWith('hp_'),
    mediaCount: imageList?.length,
    images: imageList,
    status: asAuditStatus(raw.status ?? raw.auditStatus),
    userDeleted: !!raw.userDeleted,
    createdAt: String(raw.createdAt || raw.time || ''),
  };
}
