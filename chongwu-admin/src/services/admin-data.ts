import { callApi } from './cloud-api';
import {
  mapBanner,
  mapClub,
  mapClubMember,
  mapComment,
  mapEvent,
  mapHostApply,
  mapLocalToRescue,
  mapMapPoint,
  mapMerchant,
  mapMerchantApply,
  mapPet,
  mapPointsLedger,
  mapQualify,
  mapSignup,
  mapSocialPost,
  mapSocialToRescue,
  mapSplashAd,
  mapUser,
} from './mappers';
import type {
  BannerRow,
  BuddyPostRow,
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
  HotTopicRow,
  ZoneRow,
  UserRow,
} from '../types';
import { mapCloudBuddyToRow } from './buddy';

type ListPayload = { list?: Record<string, unknown>[] };

async function listRaw(module: string, action: string, payload: Record<string, unknown> = {}) {
  const data = await callApi<ListPayload>(module, action, payload);
  return data.list || [];
}

export async function fetchUsers(keyword?: string): Promise<UserRow[]> {
  const list = await listRaw('admin_feed', 'listUsers', {
    limit: 100,
    ...(keyword ? { keyword } : {}),
  });
  return list.map(mapUser);
}

export async function fetchPets(): Promise<PetRow[]> {
  return (await listRaw('admin_feed', 'listPets', { limit: 100 })).map(mapPet);
}

export async function fetchSocialPosts(params?: {
  auditStatus?: string;
  lostType?: string;
}): Promise<SocialPostRow[]> {
  return (
    await listRaw('admin_feed', 'listSocialPosts', {
      limit: 100,
      auditStatus: params?.auditStatus || 'all',
      ...(params?.lostType ? { lostType: params.lostType } : {}),
    })
  ).map(mapSocialPost);
}

export async function fetchSocialComments(postId?: string): Promise<CommentRow[]> {
  return (
    await listRaw('admin_feed', 'listSocialComments', {
      limit: 200,
      ...(postId ? { postId } : {}),
    })
  ).map(mapComment);
}

export async function fetchBuddyPosts(): Promise<BuddyPostRow[]> {
  const list = await listRaw('admin_feed', 'listBuddyPosts', { limit: 100 });
  return list.map((r) => mapCloudBuddyToRow(r));
}

export async function fetchEvents(): Promise<EventRow[]> {
  return (await listRaw('admin_feed', 'listEvents', { limit: 100 })).map(mapEvent);
}

export async function fetchEventSignups(): Promise<EventSignupRow[]> {
  return (await listRaw('admin_feed', 'listEventSignups', { limit: 200 })).map(mapSignup);
}

export async function fetchHostApplies(): Promise<HostApplyRow[]> {
  return (await listRaw('admin_feed', 'listHostApplies', { limit: 100 })).map(mapHostApply);
}

export async function fetchEventQualify(): Promise<EventQualifyRow[]> {
  return (await listRaw('admin_feed', 'listEventQualify', { limit: 100 })).map(mapQualify);
}

export async function fetchClubs(): Promise<ManagedClubRow[]> {
  return (await listRaw('admin_feed', 'listClubs', { limit: 100 })).map(mapClub);
}

export async function fetchClubMembers(clubId?: string): Promise<ClubMemberRow[]> {
  return (
    await listRaw('admin_feed', 'listClubMembers', {
      limit: 200,
      ...(clubId ? { clubId } : {}),
    })
  ).map(mapClubMember);
}

export async function fetchMapPoints(): Promise<MapPointRow[]> {
  return (await listRaw('admin_feed', 'listMapPoints', { limit: 100 })).map(mapMapPoint);
}

export async function fetchRescuePosts(): Promise<RescuePostRow[]> {
  const [social, local] = await Promise.all([
    listRaw('admin_feed', 'listSocialPosts', { limit: 100 }).then((rows) =>
      rows.filter((r) => r.lostType).map(mapSocialToRescue),
    ),
    listRaw('admin_feed', 'listLocalPosts', { limit: 100 }).then((rows) =>
      rows.map(mapLocalToRescue),
    ),
  ]);
  return [...social, ...local].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function fetchMerchants(): Promise<MerchantRow[]> {
  return (await listRaw('admin_feed', 'listMerchants', { limit: 100 })).map(mapMerchant);
}

export async function fetchMerchantApplies(): Promise<MerchantApplyRow[]> {
  return (await listRaw('admin_feed', 'listMerchantApplies', { limit: 100 })).map(
    mapMerchantApply,
  );
}

export async function fetchBanners(): Promise<BannerRow[]> {
  return (await listRaw('admin_feed', 'listBanners', { limit: 50 })).map(mapBanner);
}

export async function fetchSplashAds(): Promise<SplashAdRow[]> {
  return (await listRaw('admin_feed', 'listSplashAds', { limit: 50 })).map(mapSplashAd);
}

export async function fetchPointsLedger(): Promise<PointsLedgerRow[]> {
  return (await listRaw('admin_feed', 'listPointsLedger', { limit: 100 })).map(mapPointsLedger);
}

export type DashboardCounts = {
  users: number;
  petsPending: number;
  socialPending: number;
  commentsPending: number;
  buddyPending: number;
  hostPending: number;
  qualifyPending: number;
  mapPending: number;
  merchantApplyPending: number;
  localPending?: number;
  rescuePending?: number;
};

export async function fetchDashboardCounts(): Promise<DashboardCounts> {
  return callApi<DashboardCounts>('admin_feed', 'summaryCounts', {});
}

export async function fetchSensitiveWords(): Promise<{ id: string; word: string; status: number }[]> {
  const data = await callApi<{ list: { id: string; word: string; status: number }[] }>(
    'sensitive_words',
    'listFeed',
    { limit: 500 },
  );
  return data.list || [];
}

export async function saveSensitiveWord(word: string, status: 0 | 1, note?: string) {
  return callApi('admin_feed', 'saveSensitiveWord', { word, status, note });
}

export type SaveBannerPayload =
  | { remove: true; id: string }
  | {
      id?: string;
      title: string;
      type: string;
      cover: string;
      link: string;
      sortOrder: number;
      status: 0 | 1;
    };

export async function saveBanner(payload: SaveBannerPayload) {
  return callApi('admin_feed', 'saveBanner', payload);
}

export async function saveSplashAd(payload: Record<string, unknown> & { id?: string; remove?: boolean }) {
  return callApi('admin_feed', 'saveSplashAd', payload);
}

export async function checkInEventSignup(signupId: string) {
  return callApi<{ signup: EventSignupRow; alreadyCheckedIn?: boolean }>(
    'admin_feed',
    'checkInSignup',
    { signupId },
  );
}

export async function fetchCommunityConfig(): Promise<{ hotTopics: HotTopicRow[]; zones: ZoneRow[] }> {
  const data = await callApi<{ hotTopics: HotTopicRow[]; zones: ZoneRow[] }>(
    'admin_feed',
    'getCommunityConfig',
    {},
  );
  return { hotTopics: data.hotTopics || [], zones: data.zones || [] };
}

export async function saveCommunityConfig(hotTopics: HotTopicRow[], zones: ZoneRow[]) {
  return callApi('admin_feed', 'saveCommunityConfig', { hotTopics, zones });
}

export async function setUserStatus(userId: string, status: 0 | 1) {
  return callApi('admin_feed', 'setUserStatus', { id: userId, status });
}
