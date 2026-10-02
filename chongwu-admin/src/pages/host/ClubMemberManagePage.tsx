import { Select, Table, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageIntro } from '../../components/PageIntro';
import { ListToolbar } from '../../components/ListToolbar';
import { mockClubMembers, mockManagedClubs } from '../../mock/data';

export function ClubMemberManagePage() {
  const [searchParams] = useSearchParams();
  const clubFromQuery = searchParams.get('clubId') || '';
  const [keyword, setKeyword] = useState('');
  const [clubFilter, setClubFilter] = useState(clubFromQuery);

  const displayRows = useMemo(() => {
    let list = mockClubMembers;
    if (clubFilter) list = list.filter((r) => r.clubId === clubFilter);
    const q = keyword.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.userNickname.toLowerCase().includes(q)
          || r.clubName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [clubFilter, keyword]);

  return (
    <>
      <PageIntro
        title="俱乐部成员"
        description="对应「我的俱乐部」-「加入的俱乐部」：成员加入、退出与圈子消息入口（circle-community）。"
      />
      <ListToolbar
        searchPlaceholder="成员昵称 / 俱乐部名"
        onSearch={setKeyword}
        extra={
          <Select
            allowClear
            placeholder="筛选俱乐部"
            style={{ width: 220 }}
            value={clubFilter || undefined}
            onChange={(v) => setClubFilter(v || '')}
            options={[
              ...mockManagedClubs.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        }
      />
      <Table
        rowKey="id"
        dataSource={displayRows}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        columns={[
          { title: '俱乐部', dataIndex: 'clubName' },
          { title: '成员', dataIndex: 'userNickname' },
          {
            title: '身份',
            dataIndex: 'role',
            width: 100,
            render: (r: string) =>
              r === 'owner' ? <Tag color="blue">主理人</Tag> : <Tag>成员</Tag>,
          },
          { title: '加入时间', dataIndex: 'joinedAt', width: 120 },
        ]}
      />
    </>
  );
}
