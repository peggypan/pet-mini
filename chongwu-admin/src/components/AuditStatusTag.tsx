import { Tag } from 'antd';
import type { AuditStatus } from '../types';

const map: Record<AuditStatus, { color: string; label: string }> = {
  pending: { color: 'gold', label: '待审核' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已拒绝' },
  hidden: { color: 'default', label: '已隐藏' },
};

export function AuditStatusTag({ status }: { status: AuditStatus }) {
  const item = map[status];
  return <Tag color={item.color}>{item.label}</Tag>;
}
