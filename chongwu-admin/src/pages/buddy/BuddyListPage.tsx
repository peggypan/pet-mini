import { Button, Descriptions, Drawer, Form, Input, Modal, Popconfirm, Space, Table, Tag, message } from 'antd';
import { useMemo, useState } from 'react';
import { nextAdminId, nowAdminTime } from '../../utils/admin-record';
import { PageIntro } from '../../components/PageIntro';
import { AuditStatusTag } from '../../components/AuditStatusTag';
import { StatusFilterBar, filterByAuditStatus, type StatusFilterValue } from '../../components/StatusFilterBar';
import { ListToolbar } from '../../components/ListToolbar';
import { useSyncMenuPendingBadge } from '../../context/PendingBadgeContext';
import { countPendingStatus } from '../../utils/audit-pending';

const MENU_PATH = '/buddy';
import {
  AdminImageThumbRow,
  DetailMediaSection,
  resolveMediaUrls,
} from '../../components/DetailMediaGallery';
import { buddyZoneLabel } from '../../config/miniapp-align';
import { mockBuddyPosts } from '../../mock/data';
import type { BuddyPlazaZone, BuddyPostRow } from '../../types';

type AddForm = {
  title: string;
  userName: string;
  city: string;
  timeSlot: string;
  buddyType?: string;
};

function buddyImages(row: BuddyPostRow): string[] {
  return resolveMediaUrls(row.images, row.mediaCount, `buddy-${row.id}`);
}

export function BuddyListPage() {
  const [rows, setRows] = useState(mockBuddyPosts);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [keyword, setKeyword] = useState('');
  const [zoneFilter, setZoneFilter] = useState<BuddyPlazaZone | 'all'>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<BuddyPostRow | null>(null);
  const [form] = Form.useForm<AddForm>();

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<StatusFilterValue, number>> = { all: rows.length };
    rows.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [rows]);

  const displayRows = useMemo(() => {
    let list = filterByAuditStatus(rows, statusFilter);
    if (zoneFilter !== 'all') {
      list = list.filter((r) => (r.zone || 'normal') === zoneFilter);
    }
    const q = keyword.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) || r.userName.toLowerCase().includes(q) || r.city.includes(q),
      );
    }
    return list;
  }, [rows, statusFilter, zoneFilter, keyword]);

  const setStatus = (id: string, status: BuddyPostRow['status']) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (detail?.id === id) setDetail((d) => (d ? { ...d, status } : d));
    message.success('已更新（Mock）');
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    message.success('已删除（Mock）');
  };

  const openAdd = () => {
    form.resetFields();
    form.setFieldsValue({ userName: '运营录入', city: '北京', timeSlot: '周末' });
    setAddOpen(true);
  };

  const submitAdd = async () => {
    const values = await form.validateFields();
    const row: BuddyPostRow = {
      id: nextAdminId('b'),
      title: values.title.trim(),
      userName: values.userName.trim(),
      city: values.city.trim(),
      timeSlot: values.timeSlot.trim(),
      buddyType: values.buddyType?.trim(),
      status: 'approved',
      createdAt: nowAdminTime(),
    };
    setRows((prev) => [row, ...prev]);
    setAddOpen(false);
    message.success('已新增（Mock）');
  };

  const pendingCount = useMemo(() => countPendingStatus(rows, (r) => r.status), [rows]);
  useSyncMenuPendingBadge(MENU_PATH, pendingCount);

  const bulkApproveAll = () => {
    if (!pendingCount) return;
    setRows((prev) =>
      prev.map((r) => (r.status === 'pending' ? { ...r, status: 'approved' as const } : r)),
    );
    setDetail((d) => (d?.status === 'pending' ? { ...d, status: 'approved' } : d));
    message.success(`已通过 ${pendingCount} 条搭子帖`);
  };

  return (
    <>
      <PageIntro
        title="搭子广场"
        description="Tab「搭搭」· 分区：普通搭子 / 疗愈搭子 / 相亲&借配；档案开启宠物疗愈可生成 hp_ 疗愈名片。"
      />
      <StatusFilterBar value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
      <ListToolbar
        searchPlaceholder="标题 / 用户 / 城市"
        onSearch={setKeyword}
        onAdd={openAdd}
        bulkApprove={{ pendingCount, onConfirm: bulkApproveAll, unit: '条搭子帖' }}
        extra={
          <Space wrap>
            {(['all', 'normal', 'healing', 'match'] as const).map((k) => (
              <Button
                key={k}
                size="small"
                type={zoneFilter === k ? 'primary' : 'default'}
                onClick={() => setZoneFilter(k)}
              >
                {k === 'all' ? '全部分区' : buddyZoneLabel(k)}
              </Button>
            ))}
          </Space>
        }
      />
      <Table
        rowKey="id"
        dataSource={displayRows}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 1040 }}
        columns={[
          { title: '标题', dataIndex: 'title', ellipsis: true },
          { title: '发布者', dataIndex: 'userName', width: 100 },
          {
            title: '分区',
            width: 100,
            render: (_, r) => (
              <Space size={4}>
                <Tag color={r.zone === 'healing' ? 'green' : r.zone === 'match' ? 'orange' : 'blue'}>
                  {buddyZoneLabel(r.zone)}
                </Tag>
                {r.healingPetProfile ? <Tag color="cyan">档案疗愈</Tag> : null}
              </Space>
            ),
          },
          { title: '类型', dataIndex: 'buddyType', width: 120, render: (v) => v || '—' },
          { title: '城市', dataIndex: 'city', width: 80 },
          { title: '时段', dataIndex: 'timeSlot', width: 120 },
          {
            title: '相册',
            width: 220,
            render: (_, r) => <AdminImageThumbRow urls={buddyImages(r)} />,
          },
          {
            title: '用户删',
            width: 72,
            render: (_, r) => (r.userDeleted ? <Tag>已删</Tag> : '—'),
          },
          { title: '状态', dataIndex: 'status', width: 96, render: (s) => <AuditStatusTag status={s} /> },
          { title: '时间', dataIndex: 'createdAt', width: 120 },
          {
            title: '操作',
            width: 220,
            fixed: 'right',
            render: (_, r) => (
              <Space wrap size={0}>
                <Button type="link" size="small" onClick={() => setDetail(r)}>
                  查看资料
                </Button>
                {r.userDeleted ? (
                  <Tag color="default">端内已下架</Tag>
                ) : r.status === 'pending' ? (
                  <>
                    <Button type="link" size="small" onClick={() => setStatus(r.id, 'approved')}>
                      通过
                    </Button>
                    <Button type="link" size="small" danger onClick={() => setStatus(r.id, 'rejected')}>
                      拒绝
                    </Button>
                  </>
                ) : (
                  <Button type="link" size="small" danger onClick={() => setStatus(r.id, 'hidden')}>
                    下架
                  </Button>
                )}
                <Popconfirm title="确定删除该条记录？" onConfirm={() => removeRow(r.id)}>
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Drawer title="搭子帖资料" width={520} open={!!detail} onClose={() => setDetail(null)}>
        {detail ? (
          <>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="ID">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="标题">{detail.title}</Descriptions.Item>
            <Descriptions.Item label="发布者">{detail.userName}</Descriptions.Item>
            <Descriptions.Item label="分区">{buddyZoneLabel(detail.zone)}</Descriptions.Item>
            <Descriptions.Item label="档案疗愈名片">
              {detail.healingPetProfile ? '是（hp_）' : '否'}
            </Descriptions.Item>
            <Descriptions.Item label="宠物">{detail.petName || '—'}</Descriptions.Item>
            <Descriptions.Item label="类型">{detail.buddyType || '—'}</Descriptions.Item>
            <Descriptions.Item label="描述">{detail.desc || '—'}</Descriptions.Item>
            <Descriptions.Item label="城市">{detail.city}</Descriptions.Item>
            <Descriptions.Item label="时段">{detail.timeSlot}</Descriptions.Item>
            <Descriptions.Item label="相册张数">
              {buddyImages(detail).length ? `${buddyImages(detail).length} 张` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="用户删">{detail.userDeleted ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <AuditStatusTag status={detail.status} />
            </Descriptions.Item>
            <Descriptions.Item label="时间">{detail.createdAt}</Descriptions.Item>
          </Descriptions>
          <DetailMediaSection
            title="相册"
            urls={buddyImages(detail)}
            size={108}
            emptyLabel="无相册"
          />
          </>
        ) : null}
      </Drawer>

      <Modal
        title="新增搭子帖"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={() => void submitAdd()}
        okText="保存"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="邀约标题" />
          </Form.Item>
          <Form.Item name="userName" label="发布者" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="buddyType" label="类型">
            <Input placeholder="遛狗 / 撸猫 …" />
          </Form.Item>
          <Form.Item name="city" label="城市" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="timeSlot" label="时段" rules={[{ required: true }]}>
            <Input placeholder="本周六 17:00" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
