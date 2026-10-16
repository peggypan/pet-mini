import type { AuditStatus } from '../types';
import { callApi } from './cloud-api';

export type ModerateDecision = 'approve' | 'reject' | 'hide';

export function auditStatusToDecision(status: AuditStatus): ModerateDecision {
  if (status === 'approved') return 'approve';
  if (status === 'rejected') return 'reject';
  return 'hide';
}

export async function moderatePost(
  kind: 'social' | 'buddy' | 'local' | 'event' | 'comment',
  id: string,
  decision: ModerateDecision,
  rejectReason?: string,
  essence?: boolean,
) {
  return callApi('admin', 'moderatePost', {
    kind,
    id,
    decision,
    rejectReason,
    ...(typeof essence === 'boolean' ? { essence } : {}),
  });
}

export async function reviewMapPoint(id: string, decision: 'approve' | 'reject', rejectReason?: string) {
  return callApi('admin', 'reviewMapPoint', { id, decision, rejectReason });
}

export async function reviewHostApply(
  applyId: string,
  decision: 'approve' | 'reject',
  rejectReason?: string,
) {
  return callApi('admin', 'reviewHostApply', { applyId, decision, rejectReason });
}

export async function reviewMerchantApply(
  applyId: string,
  decision: 'approve' | 'reject',
  rejectReason?: string,
) {
  return callApi('admin', 'reviewMerchantApply', { applyId, decision, rejectReason });
}

export async function reviewEventQualify(
  id: string,
  decision: 'approve' | 'reject',
  rejectReason?: string,
) {
  return callApi('admin', 'reviewEventQualify', { id, decision, rejectReason });
}

export async function updatePetAudit(
  id: string,
  auditStatus: AuditStatus,
  rejectReason?: string,
) {
  return callApi('admin_feed', 'updatePetAudit', { id, auditStatus, rejectReason });
}

export async function updateClubOnlineStatus(
  id: string,
  onlineStatus: 'online' | 'offline' | 'pending',
) {
  return callApi('admin_feed', 'updateClubOnlineStatus', { id, onlineStatus });
}
