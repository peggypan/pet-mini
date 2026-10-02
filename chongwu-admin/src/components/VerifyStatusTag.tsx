import { Tag } from 'antd';
import type { VerifyStatus } from '../types';

const map: Record<VerifyStatus, { color: string; label: string }> = {
  none: { color: 'default', label: '未提交' },
  pending: { color: 'gold', label: '审核中' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '未通过' },
};

export function VerifyStatusTag({ status }: { status: VerifyStatus }) {
  const item = map[status] || map.none;
  return <Tag color={item.color}>{item.label}</Tag>;
}
