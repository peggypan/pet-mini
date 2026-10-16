import type { DashboardCounts } from '../services/admin-data';

/** 将 summaryCounts 映射为侧边栏 path → 待办数 */
export function mapCountsToMenuBadges(counts: DashboardCounts): Record<string, number> {
  const n = (v: number | undefined) => Math.max(0, v || 0);
  const rescue = n(counts.localPending) + n(counts.rescuePending);
  return {
    '/pets': n(counts.petsPending),
    '/community/posts': n(counts.socialPending),
    '/community/comments': n(counts.commentsPending),
    '/buddy': n(counts.buddyPending),
    '/host/applies': n(counts.hostPending),
    '/host/event-qualify': n(counts.qualifyPending),
    '/map-points': n(counts.mapPending),
    '/merchants/applies': n(counts.merchantApplyPending),
    '/rescue': rescue > 0 ? rescue : n(counts.localPending),
  };
}
