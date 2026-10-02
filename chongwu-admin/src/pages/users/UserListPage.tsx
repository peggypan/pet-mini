import { Button, Descriptions, Drawer, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { ListToolbar } from '../../components/ListToolbar';
import { DetailMediaSection } from '../../components/DetailMediaGallery';
import { mockUsers } from '../../mock/data';
import type { UserRow } from '../../types';

export function UserListPage() {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<UserRow | null>(null);

  const displayRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return mockUsers;
    return mockUsers.filter(
      (u) =>
        u.nickname.toLowerCase().includes(q)
        || u.openid.toLowerCase().includes(q)
        || (u.phone || '').includes(q)
        || (u.deviceModel || '').toLowerCase().includes(q)
        || (u.ipRegion || '').toLowerCase().includes(q),
    );
  }, [keyword]);

  return (
    <>
      <PageIntro
        title="用户列表"
        description="展示小程序用户昵称、授权手机号、登录设备型号与 IP 归属地（登录时由云函数写入 users 集合）。"
      />
      <ListToolbar searchPlaceholder="昵称 / openid / 手机号 / 机型" onSearch={setKeyword} />
      <Table
        rowKey="id"
        dataSource={displayRows}
        scroll={{ x: 1100 }}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 人` }}
        columns={[
          { title: '昵称', dataIndex: 'nickname', width: 110, fixed: 'left' },
          {
            title: '手机号',
            dataIndex: 'phone',
            width: 130,
            render: (v: string | undefined) =>
              v ? (
                <Typography.Text copyable={{ text: v }}>{v}</Typography.Text>
              ) : (
                <Tag>未授权</Tag>
              ),
          },
          {
            title: '手机型号',
            dataIndex: 'deviceModel',
            width: 168,
            ellipsis: true,
            render: (v: string | undefined) => v || '—',
          },
          {
            title: 'IP 归属地',
            dataIndex: 'ipRegion',
            width: 160,
            ellipsis: true,
            render: (v: string | undefined) => v || '—',
          },
          { title: '常居城市', dataIndex: 'city', width: 88 },
          { title: 'OpenID', dataIndex: 'openid', ellipsis: true, width: 120 },
          { title: '宠物', dataIndex: 'petCount', width: 64 },
          { title: '积分', dataIndex: 'points', width: 64 },
          {
            title: '状态',
            dataIndex: 'status',
            width: 80,
            render: (s: number) => (s === 1 ? <Tag color="green">正常</Tag> : <Tag>禁用</Tag>),
          },
          { title: '最近登录', dataIndex: 'lastLoginAt', width: 150 },
          {
            title: '操作',
            width: 100,
            fixed: 'right',
            render: (_, r) => (
              <Button type="link" size="small" onClick={() => setDetail(r)}>
                查看资料
              </Button>
            ),
          },
        ]}
      />

      <Drawer title="用户资料" width={480} open={!!detail} onClose={() => setDetail(null)}>
        {detail ? (
          <>
          <DetailMediaSection
            title="头像"
            urls={detail.avatarUrl ? [detail.avatarUrl] : []}
            size={120}
            emptyLabel="未设置"
          />
          <Descriptions column={1} size="small" bordered style={{ marginTop: 8 }}>
            <Descriptions.Item label="昵称">{detail.nickname}</Descriptions.Item>
            <Descriptions.Item label="OpenID">{detail.openid}</Descriptions.Item>
            <Descriptions.Item label="手机号">{detail.phone || '未授权'}</Descriptions.Item>
            <Descriptions.Item label="手机型号">{detail.deviceModel || '—'}</Descriptions.Item>
            <Descriptions.Item label="IP 归属地">{detail.ipRegion || '—'}</Descriptions.Item>
            <Descriptions.Item label="常居城市">{detail.city}</Descriptions.Item>
            <Descriptions.Item label="宠物数">{detail.petCount}</Descriptions.Item>
            <Descriptions.Item label="积分">{detail.points}</Descriptions.Item>
            <Descriptions.Item label="状态">
              {detail.status === 1 ? <Tag color="green">正常</Tag> : <Tag>禁用</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="注册时间">{detail.createdAt}</Descriptions.Item>
            <Descriptions.Item label="最近登录">{detail.lastLoginAt}</Descriptions.Item>
          </Descriptions>
          </>
        ) : null}
      </Drawer>
    </>
  );
}
