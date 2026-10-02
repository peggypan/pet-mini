import { Button, Table, Tag, message } from 'antd';
import { useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { mockSignups } from '../../mock/data';

export function SignupListPage() {
  const [rows, setRows] = useState(mockSignups);

  return (
    <>
      <PageIntro
        title="报名与核销"
        description="对齐 event-detail 核销码弹窗：二维码含报名人、手机号、宠物名与品种；主理人扫码或此处手动核销。"
      />
      <Table
        rowKey="id"
        dataSource={rows}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 1100 }}
        columns={[
          { title: '活动', dataIndex: 'eventTitle', width: 180, ellipsis: true },
          { title: '用户', dataIndex: 'userName', width: 100 },
          { title: '报名人', dataIndex: 'contactName', width: 100, render: (v) => v || '—' },
          { title: '手机', dataIndex: 'phone', width: 120 },
          {
            title: '携带宠物',
            width: 140,
            render: (_, r) =>
              r.petName ? `${r.petName}${r.petBreed ? ` · ${r.petBreed}` : ''}` : '—',
          },
          { title: '核销码', dataIndex: 'ticketCode', width: 150 },
          {
            title: '核销状态',
            dataIndex: 'checkedIn',
            width: 96,
            render: (v: boolean) => (v ? <Tag color="green">已核销</Tag> : <Tag>未核销</Tag>),
          },
          { title: '报名时间', dataIndex: 'createdAt', width: 120 },
          {
            title: '操作',
            width: 100,
            fixed: 'right',
            render: (_, r) =>
              !r.checkedIn ? (
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, checkedIn: true } : x)));
                    message.success('已核销（Mock）');
                  }}
                >
                  手动核销
                </Button>
              ) : (
                '—'
              ),
          },
        ]}
      />
    </>
  );
}
