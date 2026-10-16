import type { BuddyPostRow } from '../types';
import { callApi } from './cloud-api';

type ListData = { list: BuddyPostRow[] };

/** 运营列表：含 pending/rejected，走 admin_feed.listBuddyPosts */
export async function listBuddyPostsForAdmin(params?: {
  auditStatus?: string;
  limit?: number;
  skip?: number;
}) {
  const data = await callApi<ListData>('admin_feed', 'listBuddyPosts', {
    auditStatus: params?.auditStatus || 'all',
    limit: params?.limit ?? 50,
    skip: params?.skip ?? 0,
  });
  return data;
}

export async function moderateBuddyPost(
  id: string,
  decision: 'approve' | 'reject' | 'hide',
  rejectReason?: string,
) {
  return callApi('admin', 'moderatePost', {
    kind: 'buddy',
    id,
    decision,
    rejectReason,
  });
}
