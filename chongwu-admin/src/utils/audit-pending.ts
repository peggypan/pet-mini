/** 统计待审条数（status / auditStatus / verifyStatus === pending） */
export function countPendingStatus<T>(
  rows: T[],
  getStatus: (row: T) => string | undefined,
  pendingValue = 'pending',
): number {
  return rows.filter((r) => getStatus(r) === pendingValue).length;
}
