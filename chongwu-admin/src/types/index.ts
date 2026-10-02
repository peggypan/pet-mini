/** 与小程序 store / 云库字段对齐的类型（管理端视图） */

export type AuditStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export interface AdminUser {
  id: string;
  name: string;
  role: 'super' | 'operator' | 'moderator';
}

export interface UserRow {
  id: string;
  openid: string;
  nickname: string;
  /** 授权手机号（展示可脱敏，云库存完整号） */
  phone?: string;
  city: string;
  /** 最近登录设备型号 · wx.getSystemInfoSync().model */
  deviceModel?: string;
  /** IP 归属地（云函数解析，Mock 示意） */
  ipRegion?: string;
  petCount: number;
  points: number;
  status: 0 | 1;
  lastLoginAt: string;
  createdAt: string;
  avatarUrl?: string;
}

export type PetVaccineStatus = 'immune' | 'vaccinating' | 'none';

export interface PetRow {
  id: string;
  userId: string;
  userNickname: string;
  /** 用户授权登录手机 · users.phone */
  ownerPhone?: string;
  /** pet-form 紧急联系人 */
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  name: string;
  species: string;
  breedName?: string;
  avatarUrl?: string;
  /** 多角度照片 · pet-form galleryPhotos */
  galleryPhotos?: string[];
  vaccineStatus?: PetVaccineStatus | string;
  /** 免疫证明照片 · vaccineProofUrl */
  vaccineProofUrl?: string;
  activityArea?: string;
  /** 运营侧状态（小程序保存默认 approved，不再走待审门禁） */
  auditStatus: AuditStatus;
  rejectReason?: string;
  submittedAt?: string;
  certPublished: boolean;
  /** 用户开启宠物疗愈 · 展示在疗愈搭子 */
  healingPet?: boolean;
  healingBuddyType?: string;
  healingIntro?: string;
  updatedAt: string;
}

export type SocialLostType = 'lost' | 'found' | 'adopt' | 'rescue';

export interface SocialPostRow {
  id: string;
  userName: string;
  petName: string;
  zone: string;
  topic?: string;
  content: string;
  /** lost-publish 同步到社区的寻宠救助帖 */
  lostType?: SocialLostType;
  mediaCount?: number;
  /** social-post mediaList 图片 */
  images?: string[];
  likes: number;
  comments: number;
  status: AuditStatus;
  essence: boolean;
  /** 用户自行删除后运营台仍可见快照 */
  userDeleted?: boolean;
  createdAt: string;
}

export interface CommentRow {
  id: string;
  postId: string;
  userName: string;
  content: string;
  parentId?: string;
  replyToUserName?: string;
  status: AuditStatus;
  createdAt: string;
}

/** 搭子广场分区 · buddy zoneTab */
export type BuddyPlazaZone = 'normal' | 'match' | 'healing';

export interface BuddyPostRow {
  id: string;
  userName: string;
  title: string;
  city: string;
  timeSlot: string;
  buddyType?: string;
  /** 普通搭子 / 相亲&借配 / 疗愈搭子 */
  zone?: BuddyPlazaZone;
  petName?: string;
  desc?: string;
  /** 档案开启宠物疗愈自动生成的卡片 · id 前缀 hp_ */
  healingPetProfile?: boolean;
  mediaCount?: number;
  /** buddy-publish · images 相册 */
  images?: string[];
  status: AuditStatus;
  userDeleted?: boolean;
  createdAt: string;
}

export type EventListStatus = 'draft' | 'published' | 'ended' | 'cancelled' | 'user_deleted';

export interface EventRow {
  id: string;
  title: string;
  hostName: string;
  city: string;
  category?: string;
  role?: EventPublishRole;
  place?: string;
  startAt: string;
  maxPeople?: number;
  seatsText?: string;
  signupCount: number;
  /** 头图轮播张数 · 最多 6 */
  coverImageCount?: number;
  /** event-publish mediaList / images 头图 URL */
  coverImages?: string[];
  /** 详情区配图 · detailMediaList */
  detailImageCount?: number;
  /** 详情配图 URL */
  detailImages?: string[];
  hasDetailContent?: boolean;
  auditStatus?: AuditStatus;
  source?: 'official' | 'user' | 'merchant';
  status: EventListStatus;
}

export interface EventSignupRow {
  id: string;
  eventId: string;
  eventTitle: string;
  userName: string;
  contactName?: string;
  phone: string;
  petName?: string;
  petBreed?: string;
  ticketCode: string;
  checkedIn: boolean;
  createdAt: string;
}

export type EventPublishRole = 'personal' | 'merchant';
export type VerifyStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface EventQualifyRow {
  id: string;
  userId: string;
  userName: string;
  role: EventPublishRole;
  realName?: string;
  idCardMasked?: string;
  phone?: string;
  /** event-qualify 个人 · 身份证 */
  idFrontImage?: string;
  idBackImage?: string;
  /** 商家 · 营业执照等 */
  companyName?: string;
  licenseNo?: string;
  licenseImage?: string;
  shopFrontImage?: string;
  verifyStatus: VerifyStatus;
  /** @deprecated 已不再收取活动保证金，字段仅 Mock 兼容保留 */
  depositPaid?: boolean;
  depositAmount?: number;
  canPublish: boolean;
  submittedAt: string;
}

/** @deprecated 使用 EventQualifyRow */
export type QualifyRow = EventQualifyRow;

/** 成为主理人 · club-apply 入驻申请 */
export interface HostApplyRow {
  id: string;
  applicantId: string;
  applicantNickname: string;
  clubName: string;
  city: string;
  intro: string;
  contact?: string;
  cover: string;
  status: AuditStatus;
  submittedAt: string;
}

/** 我的俱乐部 · 平台侧俱乐部档案 */
export type ClubOnlineStatus = 'pending' | 'online' | 'offline';

export interface ManagedClubRow {
  id: string;
  name: string;
  ownerId: string;
  ownerNickname: string;
  city: string;
  intro: string;
  cover: string;
  memberCount: number;
  eventCount: number;
  onlineStatus: ClubOnlineStatus;
  sourceApplyId?: string;
  createdAt: string;
}

export interface ClubMemberRow {
  id: string;
  clubId: string;
  clubName: string;
  userId: string;
  userNickname: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface MapPointRow {
  id: string;
  name: string;
  category: string;
  city: string;
  submitter: string;
  status: AuditStatus;
  pointsReward?: number;
  /** map-submit 现场照片 */
  images?: string[];
  createdAt: string;
}

export interface RescuePostRow {
  id: string;
  type: 'lost' | 'found' | 'adopt' | 'rescue';
  title: string;
  city: string;
  contact: string;
  /** social 帖 refId 或 local_posts */
  source?: 'social' | 'local' | 'mock';
  refId?: string;
  userName?: string;
  preview?: string;
  mediaCount?: number;
  images?: string[];
  status: AuditStatus;
  userDeleted?: boolean;
  createdAt: string;
}

export interface MerchantRow {
  id: string;
  name: string;
  city: string;
  type: string;
  rating: number;
  status: 0 | 1 | 2; // 待审/正常/拒绝
}

export interface MerchantApplyRow {
  id: string;
  shopName: string;
  contact: string;
  phone: string;
  city: string;
  status: AuditStatus;
  submittedAt: string;
  /** 与 submitMerchantApply 对齐 */
  companyName?: string;
  licenseNo?: string;
  legalPerson?: string;
  contactPhone?: string;
  licenseImage?: string;
  idFrontImage?: string;
  idBackImage?: string;
  shopFrontImage?: string;
  address?: string;
  intro?: string;
}

export type SplashAdStatus = 'draft' | 'online' | 'offline';
export type SplashLinkType = 'none' | 'miniPage' | 'h5';
export type SplashShowRule = 'everyLaunch' | 'oncePerDay' | 'oncePerUser';

/** 小程序开机全屏广告（启动页 / 闪屏） */
export interface SplashAdRow {
  id: string;
  name: string;
  imageUrl: string;
  linkType: SplashLinkType;
  linkTarget: string;
  durationSec: number;
  skippable: boolean;
  skipAfterSec: number;
  showRule: SplashShowRule;
  sortOrder: number;
  status: SplashAdStatus;
  startAt?: string;
  endAt?: string;
  updatedAt: string;
}

export interface BannerRow {
  id: string;
  title: string;
  type: string;
  cover: string;
  link: string;
  sortOrder: number;
  status: 0 | 1;
  startAt?: string;
  endAt?: string;
}

export interface PointsLedgerRow {
  id: string;
  userId: string;
  nickname: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface HotTopicRow {
  id: string;
  name: string;
  posts: number;
  hot: boolean;
}

export interface ZoneRow {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}
