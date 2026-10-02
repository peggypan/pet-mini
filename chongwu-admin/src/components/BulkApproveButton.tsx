import { Button, Popconfirm } from 'antd';
import { CheckOutlined } from '@ant-design/icons';

export interface BulkApproveButtonProps {
  pendingCount: number;
  onConfirm: () => void;
  label?: string;
  /** 如：条评论、条标点 */
  unit?: string;
}

export function BulkApproveButton({
  pendingCount,
  onConfirm,
  label = '一键通过',
  unit = '条',
}: BulkApproveButtonProps) {
  if (pendingCount <= 0) return null;

  return (
    <Popconfirm
      title={`确认${label}？`}
      description={`将 ${pendingCount} ${unit}待审内容全部标记为已通过（Mock）。`}
      onConfirm={onConfirm}
      okText="确认通过"
      cancelText="取消"
    >
      <Button icon={<CheckOutlined />}>
        {label}（{pendingCount > 99 ? '99+' : pendingCount}）
      </Button>
    </Popconfirm>
  );
}
