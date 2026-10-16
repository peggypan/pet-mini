import type {
  AuditStatus,
  ClubMemberRow,
  CommentRow,
  EventQualifyRow,
  EventRow,
  EventSignupRow,
  HostApplyRow,
  ManagedClubRow,
  MapPointRow,
  MerchantApplyRow,
  MerchantRow,
  PetRow,
  PointsLedgerRow,
  RescuePostRow,
  SocialPostRow,
  SplashAdRow,
  UserRow,
  VerifyStatus,
} from '../types';
import type { BannerRow } from '../types';

export function asAuditStatus(v: unknown): AuditStatus {
  const s = String(v || 'approved');
  if (s === 'pending' || s === 'approved' || s === 'rejected' || s === 'hidden') return s;
  return 'approved';
}

export function asVerifyStatus(v: unknown): VerifyStatus {
  const s = String(v || 'none');
  if (s === 'none' || s === 'pending' || s === 'approved' || s === 'rejected') return s;
  return 'none';
}

export function mapUser(raw: Record<string, unknown>): UserRow {
  return {
    id: String(raw.id),
    openid: String(raw.openid || ''),
    nickname: String(raw.nickname || '宠友'),
    phone: raw.phone ? String(raw.phone) : undefined,
    city: String(raw.city || ''),
    deviceModel: raw.deviceModel ? String(raw.deviceModel) : undefined,
    ipRegion: raw.ipRegion ? String(raw.ipRegion) : undefined,
    petCount: Number(raw.petCount) || 0,
    points: Number(raw.points) || 0,
    status: raw.status === 0 ? 0 : 1,
    lastLoginAt: String(raw.lastLoginAt || ''),
    createdAt: String(raw.createdAt || ''),
    avatarUrl: raw.avatarUrl ? String(raw.avatarUrl) : undefined,
  };
}

export function mapPet(raw: Record<string, unknown>): PetRow {
  const gallery = raw.galleryPhotos;
  return {
    id: String(raw.id),
    userId: String(raw.userId || raw._openid || ''),
    userNickname: String(raw.userNickname || raw.userName || ''),
    ownerPhone: raw.ownerPhone ? String(raw.ownerPhone) : undefined,
    emergencyContactName: raw.emergencyContactName ? String(raw.emergencyContactName) : undefined,
    emergencyContactPhone: raw.emergencyContactPhone
      ? String(raw.emergencyContactPhone)
      : undefined,
    name: String(raw.name || ''),
    species: String(raw.species || ''),
    breedName: raw.breedName ? String(raw.breedName) : undefined,
    avatarUrl: raw.avatarUrl ? String(raw.avatarUrl) : undefined,
    galleryPhotos: Array.isArray(gallery) ? gallery.map(String) : undefined,
    vaccineStatus: raw.vaccineStatus ? String(raw.vaccineStatus) : undefined,
    vaccineProofUrl: raw.vaccineProofUrl ? String(raw.vaccineProofUrl) : undefined,
    activityArea: raw.activityArea ? String(raw.activityArea) : undefined,
    auditStatus: asAuditStatus(raw.auditStatus),
    rejectReason: raw.rejectReason ? String(raw.rejectReason) : undefined,
    submittedAt: raw.submittedAt ? String(raw.submittedAt) : undefined,
    certPublished: !!raw.certPublished,
    healingPet: !!raw.healingPet,
    healingBuddyType: raw.healingBuddyType ? String(raw.healingBuddyType) : undefined,
    healingIntro: raw.healingIntro ? String(raw.healingIntro) : undefined,
    updatedAt: String(raw.updatedAt || raw.createdAt || ''),
  };
}

function mediaUrls(raw: Record<string, unknown>): string[] | undefined {
  const images = raw.images;
  if (Array.isArray(images)) return images.map(String);
  const mediaList = raw.mediaList;
  if (Array.isArray(mediaList)) {
    return mediaList
      .map((m) =>
        m && typeof m === 'object' && 'url' in m ? String((m as { url: string }).url) : '',
      )
      .filter(Boolean);
  }
  return undefined;
}

export function mapSocialPost(raw: Record<string, unknown>): SocialPostRow {
  const imgs = mediaUrls(raw);
  return {
    id: String(raw.id),
    userName: String(raw.userName || '宠友'),
    petName: String(raw.petName || ''),
    zone: String(raw.zone || ''),
    topic: raw.topic ? String(raw.topic) : undefined,
    content: String(raw.content || ''),
    lostType: raw.lostType as SocialPostRow['lostType'],
    mediaCount: imgs?.length,
    images: imgs,
    likes: Number(raw.likes) || 0,
    comments: Number(raw.comments) || 0,
    status: asAuditStatus(raw.status ?? raw.auditStatus),
    essence: !!raw.essence,
    userDeleted: !!raw.userDeleted,
    createdAt: String(raw.createdAt || ''),
  };
}

export function mapComment(raw: Record<string, unknown>): CommentRow {
  return {
    id: String(raw.id),
    postId: String(raw.postId || ''),
    userName: String(raw.userName || ''),
    content: String(raw.content || ''),
    parentId: raw.parentId ? String(raw.parentId) : undefined,
    replyToUserName: raw.replyToUserName ? String(raw.replyToUserName) : undefined,
    status: asAuditStatus(raw.status ?? raw.auditStatus),
    createdAt: String(raw.createdAt || ''),
  };
}

export function mapEvent(raw: Record<string, unknown>): EventRow {
  const imgs = mediaUrls(raw);
  return {
    id: String(raw.id),
    title: String(raw.title || ''),
    hostName: String(raw.hostName || raw.publisherName || ''),
    city: String(raw.city || ''),
    category: raw.category ? String(raw.category) : undefined,
    role: raw.role as EventRow['role'],
    place: raw.place ? String(raw.place) : undefined,
    startAt: String(raw.startAt || raw.eventDate || raw.createdAt || ''),
    maxPeople: raw.maxPeople != null ? Number(raw.maxPeople) : undefined,
    signupCount: Number(raw.signupCount || raw.interestCount) || 0,
    coverImages: imgs,
    coverImageCount: imgs?.length,
    auditStatus: asAuditStatus(raw.auditStatus),
    status: (raw.status as EventRow['status']) || 'published',
  };
}

export function mapSignup(raw: Record<string, unknown>): EventSignupRow {
  return {
    id: String(raw.id),
    eventId: String(raw.eventId || ''),
    eventTitle: String(raw.eventTitle || raw.title || ''),
    userName: String(raw.userName || raw.contactName || ''),
    contactName: raw.contactName ? String(raw.contactName) : undefined,
    phone: String(raw.phone || raw.contactPhone || ''),
    petName: raw.petName ? String(raw.petName) : undefined,
    petBreed: raw.petBreed ? String(raw.petBreed) : undefined,
    ticketCode: String(raw.ticketCode || ''),
    checkedIn: !!raw.checkedIn,
    createdAt: String(raw.createdAt || ''),
  };
}

export function mapHostApply(raw: Record<string, unknown>): HostApplyRow {
  return {
    id: String(raw.id),
    applicantId: String(raw.applicantId || ''),
    applicantNickname: String(raw.applicantNickname || ''),
    clubName: String(raw.clubName || ''),
    city: String(raw.city || ''),
    intro: String(raw.intro || ''),
    contact: raw.contact ? String(raw.contact) : undefined,
    cover: String(raw.cover || ''),
    status: asAuditStatus(raw.status ?? raw.auditStatus),
    submittedAt: String(raw.submittedAt || ''),
  };
}

export function mapClub(raw: Record<string, unknown>): ManagedClubRow {
  return {
    id: String(raw.id),
    name: String(raw.name || ''),
    ownerId: String(raw.ownerId || raw.openid || ''),
    ownerNickname: String(raw.ownerNickname || raw.owner || ''),
    city: String(raw.city || ''),
    intro: String(raw.intro || ''),
    cover: String(raw.cover || ''),
    memberCount: Number(raw.memberCount ?? raw.members) || 0,
    eventCount: Number(raw.eventCount) || 0,
    onlineStatus: (raw.onlineStatus as ManagedClubRow['onlineStatus']) || 'pending',
    sourceApplyId: raw.sourceApplyId ? String(raw.sourceApplyId) : undefined,
    createdAt: String(raw.createdAt || ''),
  };
}

export function mapClubMember(raw: Record<string, unknown>): ClubMemberRow {
  return {
    id: String(raw.id),
    clubId: String(raw.clubId || ''),
    clubName: String(raw.clubName || ''),
    userId: String(raw.userId || raw.openid || ''),
    userNickname: String(raw.userNickname || raw.userName || ''),
    role: raw.role === 'owner' ? 'owner' : 'member',
    joinedAt: String(raw.joinedAt || raw.createdAt || ''),
  };
}

export function mapQualify(raw: Record<string, unknown>): EventQualifyRow {
  const verify = (raw.verify as Record<string, unknown>) || raw;
  return {
    id: String(raw.id),
    userId: String(verify.userId || raw.userId || ''),
    userName: String(raw.userName || verify.userName || ''),
    role: (raw.role as EventQualifyRow['role']) || 'personal',
    realName: verify.realName ? String(verify.realName) : undefined,
    phone: verify.phone ? String(verify.phone) : undefined,
    companyName: verify.companyName ? String(verify.companyName) : undefined,
    licenseNo: verify.licenseNo ? String(verify.licenseNo) : undefined,
    verifyStatus: asVerifyStatus(raw.verifyStatus),
    canPublish: raw.canPublish === true || raw.verifyStatus === 'approved',
    submittedAt: String(raw.submittedAt || ''),
  };
}

export function mapMapPoint(raw: Record<string, unknown>): MapPointRow {
  return {
    id: String(raw.id),
    name: String(raw.name || ''),
    category: String(raw.category || raw.type || ''),
    city: String(raw.city || ''),
    submitter: String(raw.userName || raw.submitter || ''),
    status: asAuditStatus(raw.status ?? raw.auditStatus),
    pointsReward: raw.pointsReward != null ? Number(raw.pointsReward) : undefined,
    images: Array.isArray(raw.images) ? raw.images.map(String) : undefined,
    createdAt: String(raw.createdAt || ''),
  };
}

export function mapLocalToRescue(raw: Record<string, unknown>): RescuePostRow {
  const imgs = mediaUrls(raw);
  return {
    id: String(raw.id),
    type: (raw.type as RescuePostRow['type']) || 'adopt',
    title: String(raw.title || raw.content || '').slice(0, 40),
    city: String(raw.city || ''),
    contact: String(raw.contact || ''),
    source: 'local',
    userName: raw.userName ? String(raw.userName) : undefined,
    preview: String(raw.content || raw.desc || '').slice(0, 80),
    mediaCount: imgs?.length,
    images: imgs,
    status: asAuditStatus(raw.auditStatus),
    userDeleted: !!raw.userDeleted,
    createdAt: String(raw.createdAt || ''),
  };
}

export function mapSocialToRescue(raw: Record<string, unknown>): RescuePostRow {
  const lost = String(raw.lostType || 'lost') as RescuePostRow['type'];
  const imgs = mediaUrls(raw);
  return {
    id: String(raw.id),
    type: lost,
    title: String(raw.content || '').slice(0, 40) || '寻宠救助',
    city: String(raw.city || ''),
    contact: '',
    source: 'social',
    refId: String(raw.id),
    userName: String(raw.userName || ''),
    preview: String(raw.content || '').slice(0, 80),
    mediaCount: imgs?.length,
    images: imgs,
    status: asAuditStatus(raw.status ?? raw.auditStatus),
    userDeleted: !!raw.userDeleted,
    createdAt: String(raw.createdAt || ''),
  };
}

export function mapMerchant(raw: Record<string, unknown>): MerchantRow {
  return {
    id: String(raw.id),
    name: String(raw.name || ''),
    city: String(raw.city || ''),
    type: String(raw.type || raw.category || ''),
    rating: Number(raw.rating) || 0,
    status: (Number(raw.status ?? raw.bizStatus) || 1) as MerchantRow['status'],
    intro: raw.intro ? String(raw.intro) : undefined,
    address: raw.address ? String(raw.address) : undefined,
    contactPhone: raw.contactPhone ? String(raw.contactPhone) : undefined,
    cover: raw.cover ? String(raw.cover) : raw.logoUrl ? String(raw.logoUrl) : undefined,
  };
}

export function mapMerchantApply(raw: Record<string, unknown>): MerchantApplyRow {
  return {
    id: String(raw.id),
    shopName: String(raw.shopName || raw.companyName || ''),
    contact: String(raw.contact || raw.legalPerson || ''),
    phone: String(raw.phone || raw.contactPhone || ''),
    city: String(raw.city || ''),
    status: asAuditStatus(raw.status ?? raw.auditStatus),
    submittedAt: String(raw.submittedAt || ''),
    companyName: raw.companyName ? String(raw.companyName) : undefined,
    licenseImage: raw.licenseImage ? String(raw.licenseImage) : undefined,
    shopFrontImage: raw.shopFrontImage ? String(raw.shopFrontImage) : undefined,
  };
}

export function mapBanner(raw: Record<string, unknown>): BannerRow {
  return {
    id: String(raw.id),
    title: String(raw.title || ''),
    type: (raw.type as BannerRow['type']) || 'official',
    cover: String(raw.cover || ''),
    link: String(raw.link || raw.url || ''),
    sortOrder: Number(raw.sortOrder) || 0,
    startAt: raw.startAt ? String(raw.startAt) : undefined,
    endAt: raw.endAt ? String(raw.endAt) : undefined,
    status: raw.status === 0 ? 0 : 1,
  };
}

export function mapSplashAd(raw: Record<string, unknown>): SplashAdRow {
  return {
    id: String(raw.id),
    name: String(raw.name || raw.title || ''),
    imageUrl: String(raw.imageUrl || raw.cover || raw.image || ''),
    linkType: (raw.linkType as SplashAdRow['linkType']) || 'none',
    linkTarget: String(raw.linkTarget || ''),
    durationSec: Number(raw.durationSec) || 3,
    skippable: raw.skippable !== false,
    skipAfterSec: Number(raw.skipAfterSec) || 0,
    showRule: (raw.showRule as SplashAdRow['showRule']) || 'everyLaunch',
    sortOrder: Number(raw.sortOrder) || 0,
    status: (raw.status as SplashAdRow['status']) || 'draft',
    startAt: raw.startAt ? String(raw.startAt) : undefined,
    endAt: raw.endAt ? String(raw.endAt) : undefined,
    updatedAt: String(raw.updatedAt || raw.createdAt || ''),
  };
}

export function mapPointsLedger(raw: Record<string, unknown>): PointsLedgerRow {
  return {
    id: String(raw.id),
    userId: String(raw.userId || raw.openid || ''),
    nickname: String(raw.userNickname || raw.nickname || ''),
    amount: Number(raw.amount) || 0,
    reason: String(raw.reason || ''),
    createdAt: String(raw.createdAt || ''),
  };
}
