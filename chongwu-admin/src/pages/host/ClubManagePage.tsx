import { Button, Descriptions, Drawer, Image, Space, Table, message } from 'antd';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageIntro } from '../../components/PageIntro';
import { ClubOnlineStatusTag } from '../../components/ClubOnlineStatusTag';
import { ListToolbar } from '../../components/ListToolbar';
import { DetailMediaSection } from '../../components/DetailMediaGallery';
import { mockManagedClubs } from '../../mock/data';
import type { ClubOnlineStatus, ManagedClubRow } from '../../types';

export function ClubManagePage() {
  const [rows, setRows] = useState(mockManagedClubs);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClubOnlineStatus | 'all'>('all');
  const [detail, setDetail] = useState<ManagedClubRow | null>(null);

  const displayRows = useMemo(() => {
    let list = rows;
    if (statusFilter !== 'all') list = list.filter((r) => r.onlineStatus === statusFilter);
    const q = keyword.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q)
          || r.ownerNickname.toLowerCase().includes(q)
          || r.city.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, statusFilter, keyword]);

  const setOnline = (id: string, onlineStatus: ClubOnlineStatus) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, onlineStatus } : r)));
    if (detail?.id === id) setDetail((d) => (d ? { ...d, onlineStatus } : d));
    message.success(onlineStatus === 'online' ? '已上线，小程序「我的俱乐部」可见' : '状态已更新');
  };

  return (
    <>
      <PageIntro
        title="俱乐部管理"
        description="对应小程序「我的俱乐部」主理人视角：审核通过后展示俱乐部卡片，可管理成员与圈子动态。"
        extra={
          <Link to="/host/members">
            <Button type="primary">成员与加入记录</Button>
          </Link>
        }
      />
      <ListToolbar
        searchPlaceholder="俱乐部 / 主理人 / 城市"
        onSearch={setKeyword}
        extra={
          <Space>
            {(
              [
                ['all', '全部'],
                ['online', '已上线'],
                ['pending', '审核中'],
                ['offline', '已下线'],
              ] as const
            ).map(([k, label]) => (
              <Button
                key={k}
                size="small"
                type={statusFilter === k ? 'primary' : 'default'}
                onClick={() => setStatusFilter(k)}
              >
                {label}
              </Button>
            ))}
          </Space>
        }
      />
      <Table
        rowKey="id"
        dataSource={displayRows}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        columns={[
          {
            title: '封面',
            dataIndex: 'cover',
            width: 72,
            render: (src: string) => (
              <Image src={src} width={48} height={36} style={{ borderRadius: 6, objectFit: 'cover' }} />
            ),
          },
          { title: '俱乐部', dataIndex: 'name' },
          { title: '主理人', dataIndex: 'ownerNickname', width: 110 },
          { title: '城市', dataIndex: 'city', width: 88 },
          { title: '成员', dataIndex: 'memberCount', width: 72 },
          { title: '活动', dataIndex: 'eventCount', width: 72 },
          {
            title: '状态',
            dataIndex: 'onlineStatus',
            width: 96,
            render: (s) => <ClubOnlineStatusTag status={s} />,
          },
          {
            title: '操作',
            width: 240,
            render: (_, r) => (
              <Space wrap>
                <Button type="link" size="small" onClick={() => setDetail(r)}>
                  查看资料
                </Button>
                {r.onlineStatus !== 'online' && (
                  <Button type="link" size="small" onClick={() => setOnline(r.id, 'online')}>
                    上线
                  </Button>
                )}
                {r.onlineStatus === 'online' && (
                  <Button type="link" size="small" onClick={() => setOnline(r.id, 'offline')}>
                    下线
                  </Button>
                )}
                <Link to={`/host/members?clubId=${r.id}`}>成员</Link>
              </Space>
            ),
          },
        ]}
      />

      <Drawer title="俱乐部资料" width={520} open={!!detail} onClose={() => setDetail(null)}>
        {detail ? (
          <>
            <DetailMediaSection title="俱乐部封面" urls={[detail.cover]} size={160} />
            <Descriptions column={1} bordered size="small" style={{ marginTop: 8 }}>
              <Descriptions.Item label="名称">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="主理人">{detail.ownerNickname}</Descriptions.Item>
              <Descriptions.Item label="城市">{detail.city}</Descriptions.Item>
              <Descriptions.Item label="成员 / 活动">
                {detail.memberCount} 人 · {detail.eventCount} 场活动
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <ClubOnlineStatusTag status={detail.onlineStatus} />
              </Descriptions.Item>
              <Descriptions.Item label="介绍">{detail.intro}</Descriptions.Item>
              <Descriptions.Item label="入驻申请 ID">{detail.sourceApplyId || '—'}</Descriptions.Item>
            </Descriptions>
          </>
        ) : null}
      </Drawer>
    </>
  );
}
