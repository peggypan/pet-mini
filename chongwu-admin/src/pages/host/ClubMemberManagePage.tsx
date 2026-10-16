import { Select, Table, Tag } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageIntro } from '../../components/PageIntro';
import { ListToolbar } from '../../components/ListToolbar';
import { useCloudList } from '../../hooks/useCloudList';
import { fetchClubMembers, fetchClubs } from '../../services/admin-data';

export function ClubMemberManagePage() {
  const [searchParams] = useSearchParams();
  const clubFromQuery = searchParams.get('clubId') || '';
  const [keyword, setKeyword] = useState('');
  const [clubFilter, setClubFilter] = useState(clubFromQuery);

  useEffect(() => {
    if (clubFromQuery) setClubFilter(clubFromQuery);
  }, [clubFromQuery]);
  const { rows, loading } = useCloudList(() => fetchClubMembers(), []);
  const { rows: clubs } = useCloudList(() => fetchClubs(), []);

  const displayRows = useMemo(() => {
    let list = rows;
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
  }, [clubFilter, keyword, rows]);

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
            options={clubs.map((c) => ({ value: c.id, label: c.name }))}
          />
        }
      />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={displayRows}
        pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 条` }}
        columns={[
          { title: '俱乐部', dataIndex: 'clubName' },
          { title: '成员', dataIndex: 'userNickname', width: 120 },
          {
            title: '角色',
            dataIndex: 'role',
            width: 88,
            render: (r: string) => (r === 'owner' ? <Tag color="gold">主理</Tag> : <Tag>成员</Tag>),
          },
          { title: '加入时间', dataIndex: 'joinedAt', width: 168 },
        ]}
      />
    </>
  );
}
