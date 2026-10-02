import { Button, Table, Tag } from 'antd';
import { PageIntro } from '../../components/PageIntro';
import { mockMerchants } from '../../mock/data';

export function MerchantListPage() {
  return (
    <>
      <PageIntro title="门店管理" description="对应 local / merchant-detail / service-book 与 Prisma Merchant。" />
      <Table
        rowKey="id"
        dataSource={mockMerchants}
        columns={[
          { title: '门店名', dataIndex: 'name' },
          { title: '城市', dataIndex: 'city' },
          { title: '类型', dataIndex: 'type' },
          { title: '评分', dataIndex: 'rating' },
          {
            title: '状态',
            dataIndex: 'status',
            render: (s: number) =>
              s === 1 ? <Tag color="green">营业</Tag> : s === 0 ? <Tag>待审</Tag> : <Tag color="red">拒绝</Tag>,
          },
          {
            title: '操作',
            render: () => (
              <>
                <Button type="link" size="small">
                  服务项
                </Button>
                <Button type="link" size="small">
                  下架
                </Button>
              </>
            ),
          },
        ]}
      />
    </>
  );
}
