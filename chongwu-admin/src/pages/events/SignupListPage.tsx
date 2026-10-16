import { Button, Table, Tag, message } from 'antd';
import { useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { ListToolbar } from '../../components/ListToolbar';
import { useCloudList } from '../../hooks/useCloudList';
import { checkInEventSignup, fetchEventSignups } from '../../services/admin-data';

export function SignupListPage() {
  const { rows, loading, reload } = useCloudList(() => fetchEventSignups(), []);
  const [keyword, setKeyword] = useState('');

  const displayRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.eventTitle.toLowerCase().includes(q)
        || r.userName.toLowerCase().includes(q)
        || (r.ticketCode || '').toLowerCase().includes(q)
        || (r.phone || '').includes(q),
    );
  }, [rows, keyword]);

  return (
    <>
      <PageIntro
        title="报名与核销"
        description="对齐 event-detail 核销码弹窗：二维码含报名人、手机号、宠物名与品种；主理人扫码或此处手动核销。"
      />
      <ListToolbar searchPlaceholder="活动 / 用户 / 核销码 / 手机" onSearch={setKeyword} />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={displayRows}
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
                    void (async () => {
                      try {
                        const res = await checkInEventSignup(r.id);
                        message.success(res.alreadyCheckedIn ? '该报名此前已核销' : '已核销');
                        await reload();
                      } catch (e) {
                        message.error(e instanceof Error ? e.message : '核销失败');
                      }
                    })();
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
