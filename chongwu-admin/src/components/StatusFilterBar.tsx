import { Segmented } from 'antd';
import type { AuditStatus } from '../types';

export type StatusFilterValue = 'all' | AuditStatus;

const options: { label: string; value: StatusFilterValue }[] = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已隐藏', value: 'hidden' },
];

interface StatusFilterBarProps {
  value: StatusFilterValue;
  onChange: (v: StatusFilterValue) => void;
  counts?: Partial<Record<StatusFilterValue, number>>;
}

export function StatusFilterBar({ value, onChange, counts }: StatusFilterBarProps) {
  const segmentedOptions = options.map((opt) => {
    const n = counts?.[opt.value];
    const suffix = n !== undefined && n > 0 && opt.value !== 'all' ? ` (${n})` : '';
    return { label: `${opt.label}${suffix}`, value: opt.value };
  });

  return (
    <div className="filter-bar">
      <Segmented options={segmentedOptions} value={value} onChange={(v) => onChange(v as StatusFilterValue)} />
    </div>
  );
}

export function filterByAuditStatus<T extends { status: AuditStatus }>(
  rows: T[],
  filter: StatusFilterValue,
): T[] {
  if (filter === 'all') return rows;
  return rows.filter((r) => r.status === filter);
}

/** 字段名为 auditStatus 的实体（如宠物档案） */
export function filterByAuditField<T extends { auditStatus: AuditStatus }>(
  rows: T[],
  filter: StatusFilterValue,
): T[] {
  if (filter === 'all') return rows;
  return rows.filter((r) => r.auditStatus === filter);
}
