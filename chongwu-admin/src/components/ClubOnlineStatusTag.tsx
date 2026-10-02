import { Tag } from 'antd';
import type { ClubOnlineStatus } from '../types';

const map: Record<ClubOnlineStatus, { color: string; label: string }> = {
  online: { color: 'green', label: '已上线' },
  pending: { color: 'gold', label: '审核中' },
  offline: { color: 'default', label: '已下线' },
};

export function ClubOnlineStatusTag({ status }: { status: ClubOnlineStatus }) {
  const item = map[status];
  return <Tag color={item.color}>{item.label}</Tag>;
}
