import { Table } from 'antd';
import { PageIntro } from '../../components/PageIntro';
import { mockPointsLedger } from '../../mock/data';

export function PointsLedgerPage() {
  return (
    <>
      <PageIntro title="积分流水" description="对应 getUserPointsBalance / addUserPoints 与地图标记奖励。" />
      <Table
        rowKey="id"
        dataSource={mockPointsLedger}
        columns={[
          { title: '用户', dataIndex: 'nickname' },
          { title: '用户 ID', dataIndex: 'userId' },
          {
            title: '变动',
            dataIndex: 'amount',
            render: (n: number) => <span style={{ color: n > 0 ? '#2E7D32' : '#C62828' }}>{n > 0 ? `+${n}` : n}</span>,
          },
          { title: '原因', dataIndex: 'reason' },
          { title: '时间', dataIndex: 'createdAt' },
        ]}
      />
    </>
  );
}
