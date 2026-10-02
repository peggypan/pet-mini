import { Button, Input, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { BulkApproveButton, type BulkApproveButtonProps } from './BulkApproveButton';

interface ListToolbarProps {
  searchPlaceholder?: string;
  onSearch?: (keyword: string) => void;
  extra?: ReactNode;
  /** 右上角「新增」 */
  onAdd?: () => void;
  addLabel?: string;
  bulkApprove?: BulkApproveButtonProps;
}

export function ListToolbar({
  searchPlaceholder = '搜索…',
  onSearch,
  extra,
  onAdd,
  addLabel = '新增',
  bulkApprove,
}: ListToolbarProps) {
  return (
    <div className="list-toolbar list-toolbar-split">
      <Space wrap>
        <Input.Search
          allowClear
          placeholder={searchPlaceholder}
          style={{ width: 280 }}
          onSearch={(v) => onSearch?.(v.trim())}
        />
        {extra}
      </Space>
      <Space wrap>
        {bulkApprove ? <BulkApproveButton {...bulkApprove} /> : null}
        {onAdd ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
            {addLabel}
          </Button>
        ) : null}
      </Space>
    </div>
  );
}
