import {
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import {
  EVENT_CATEGORY_OPTIONS,
  EVENT_ROLE_LABELS,
  HEALING_EVENT_CATEGORY,
  isHealingEventCategory,
} from '../../config/miniapp-align';
import { nextAdminId } from '../../utils/admin-record';
import { useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { ListToolbar } from '../../components/ListToolbar';
import {
  AdminImageThumbRow,
  DetailMediaSection,
  resolveMediaUrls,
} from '../../components/DetailMediaGallery';
import { mockEvents } from '../../mock/data';
import type { EventListStatus, EventRow } from '../../types';

function eventCoverImages(row: EventRow): string[] {
  return resolveMediaUrls(row.coverImages, row.coverImageCount, `event-cover-${row.id}`);
}

function eventDetailImages(row: EventRow): string[] {
  return resolveMediaUrls(row.detailImages, row.detailImageCount, `event-detail-${row.id}`);
}

const statusMap: Record<EventListStatus, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  published: { color: 'green', label: '进行中' },
  ended: { color: 'blue', label: '已结束' },
  cancelled: { color: 'red', label: '已取消' },
  user_deleted: { color: 'default', label: '用户已删' },
};

export function EventListPage() {
  const [rows, setRows] = useState(mockEvents);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventListStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'healing'>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<EventRow | null>(null);
  const [form] = Form.useForm<{
    title: string;
    hostName: string;
    city: string;
    category: string;
    role: EventRow['role'];
    place: string;
    startAt: string;
    maxPeople: number;
  }>();

  const displayRows = useMemo(() => {
    let list = rows;
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (categoryFilter === 'healing') {
      list = list.filter((r) => isHealingEventCategory(r.category));
    }
    const q = keyword.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q)
          || r.hostName.toLowerCase().includes(q)
          || (r.place || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, statusFilter, categoryFilter, keyword]);

  const setStatus = (id: string, status: EventListStatus) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (detail?.id === id) setDetail((d) => (d ? { ...d, status } : d));
    message.success('已更新（Mock）');
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (detail?.id === id) setDetail(null);
    message.success('已删除（Mock）');
  };

  const openAdd = () => {
    form.resetFields();
    form.setFieldsValue({
      hostName: '遛搭搭官方',
      city: '北京',
      category: EVENT_CATEGORY_OPTIONS[0],
      role: 'personal',
      maxPeople: 20,
    });
    setAddOpen(true);
  };

  const submitAdd = async () => {
    const values = await form.validateFields();
    const maxPeople = Number(values.maxPeople) || 20;
    const row: EventRow = {
      id: nextAdminId('e'),
      title: values.title.trim(),
      hostName: values.hostName.trim(),
      city: values.city.trim(),
      category: values.category,
      role: values.role,
      place: values.place.trim(),
      startAt: values.startAt.trim(),
      maxPeople,
      seatsText: `0/${maxPeople}`,
      coverImageCount: 0,
      detailImageCount: 0,
      hasDetailContent: false,
      auditStatus: 'approved',
      source: 'official',
      signupCount: 0,
      status: 'published',
    };
    setRows((prev) => [row, ...prev]);
    setAddOpen(false);
    message.success('已新增（Mock）');
  };

  return (
    <>
      <PageIntro
        title="活动列表"
        description="对齐 event-publish / event-detail：头图轮播（≤6）、详情图文 detailContent + detailMediaList、免费报名与核销码；用户可在详情页删除自建活动。"
      />
      <ListToolbar
        searchPlaceholder="活动名 / 主理人 / 地点"
        onSearch={setKeyword}
        onAdd={openAdd}
        addLabel="新增活动"
        extra={
          <Space wrap>
            <Button
              size="small"
              type={categoryFilter === 'all' ? 'primary' : 'default'}
              onClick={() => setCategoryFilter('all')}
            >
              全部活动
            </Button>
            <Button
              size="small"
              type={categoryFilter === 'healing' ? 'primary' : 'default'}
              onClick={() => setCategoryFilter('healing')}
            >
              {HEALING_EVENT_CATEGORY}
            </Button>
            {(['all', 'published', 'user_deleted', 'ended'] as const).map((key) => (
              <Button
                key={key}
                size="small"
                type={statusFilter === key ? 'primary' : 'default'}
                onClick={() => setStatusFilter(key)}
              >
                {key === 'all' ? '全部状态' : statusMap[key].label}
              </Button>
            ))}
          </Space>
        }
      />
      <Table
        rowKey="id"
        dataSource={displayRows}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 1420 }}
        columns={[
          {
            title: '头图',
            width: 200,
            fixed: 'left',
            render: (_, r) => <AdminImageThumbRow urls={eventCoverImages(r)} maxThumb={4} thumbSize={48} />,
          },
          { title: '活动名称', dataIndex: 'title', width: 180, ellipsis: true },
          {
            title: '分类',
            dataIndex: 'category',
            width: 100,
            render: (v) =>
              isHealingEventCategory(v) ? <Tag color="green">{v}</Tag> : v || '—',
          },
          {
            title: '发布方',
            width: 120,
            render: (_, r) => (
              <>
                {r.hostName}
                {r.role && (
                  <Tag style={{ marginLeft: 4 }}>{EVENT_ROLE_LABELS[r.role] || r.role}</Tag>
                )}
              </>
            ),
          },
          { title: '城市', dataIndex: 'city', width: 72 },
          { title: '地点', dataIndex: 'place', width: 140, ellipsis: true },
          { title: '开始时间', dataIndex: 'startAt', width: 150 },
          {
            title: '名额',
            width: 88,
            render: (_, r) => r.seatsText || (r.maxPeople ? `—/${r.maxPeople}` : '—'),
          },
          { title: '报名', dataIndex: 'signupCount', width: 64 },
          {
            title: '详情图',
            width: 160,
            render: (_, r: EventRow) => (
              <Space direction="vertical" size={4}>
                <AdminImageThumbRow urls={eventDetailImages(r)} maxThumb={3} thumbSize={48} />
                {r.hasDetailContent ? <Tag color="cyan">含详情文</Tag> : null}
              </Space>
            ),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 96,
            render: (s: EventListStatus) => {
              const m = statusMap[s] || statusMap.draft;
              return <Tag color={m.color}>{m.label}</Tag>;
            },
          },
          {
            title: '操作',
            width: 320,
            fixed: 'right',
            render: (_, r) => (
              <Space wrap size={0}>
                <Button type="link" size="small" onClick={() => setDetail(r)}>
                  查看资料
                </Button>
                {r.status === 'published' && (
                  <>
                    <Button type="link" size="small">
                      推荐首页
                    </Button>
                    <Button type="link" size="small" danger onClick={() => setStatus(r.id, 'cancelled')}>
                      平台下架
                    </Button>
                  </>
                )}
                {r.status === 'user_deleted' && (
                  <Tag color="default">小程序端已不可见</Tag>
                )}
                <Popconfirm title="确定删除该活动记录？" onConfirm={() => removeRow(r.id)}>
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Drawer title="活动资料" width={560} open={!!detail} onClose={() => setDetail(null)}>
        {detail ? (
          <>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="活动 ID">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="名称">{detail.title}</Descriptions.Item>
            <Descriptions.Item label="主理人">{detail.hostName}</Descriptions.Item>
            <Descriptions.Item label="发布方">
              {detail.role ? EVENT_ROLE_LABELS[detail.role] || detail.role : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="分类">{detail.category || '—'}</Descriptions.Item>
            <Descriptions.Item label="城市">{detail.city}</Descriptions.Item>
            <Descriptions.Item label="地点">{detail.place || '—'}</Descriptions.Item>
            <Descriptions.Item label="开始时间">{detail.startAt}</Descriptions.Item>
            <Descriptions.Item label="名额">
              {detail.seatsText || (detail.maxPeople ? `—/${detail.maxPeople}` : '—')}
            </Descriptions.Item>
            <Descriptions.Item label="报名数">{detail.signupCount}</Descriptions.Item>
            <Descriptions.Item label="头图张数">
              {eventCoverImages(detail).length} / 6
            </Descriptions.Item>
            <Descriptions.Item label="详情配图">
              {eventDetailImages(detail).length} 张
            </Descriptions.Item>
            <Descriptions.Item label="详情图文">{detail.hasDetailContent ? '有' : '无'}</Descriptions.Item>
            <Descriptions.Item label="来源">{detail.source || '—'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[detail.status]?.color}>{statusMap[detail.status]?.label}</Tag>
            </Descriptions.Item>
          </Descriptions>
          <DetailMediaSection title="头图轮播" urls={eventCoverImages(detail)} />
          <DetailMediaSection title="详情配图" urls={eventDetailImages(detail)} />
          </>
        ) : null}
      </Drawer>

      <Modal
        title="新增活动"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={() => void submitAdd()}
        okText="保存"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="title" label="活动名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="hostName" label="主理人" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={EVENT_CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))} />
          </Form.Item>
          <Form.Item name="role" label="发布身份" rules={[{ required: true }]}>
            <Select
              options={Object.entries(EVENT_ROLE_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
          <Form.Item name="city" label="城市" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="place" label="地点" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="startAt" label="开始时间" rules={[{ required: true }]}>
            <Input placeholder="2026-04-05 09:00" />
          </Form.Item>
          <Form.Item name="maxPeople" label="人数上限" rules={[{ required: true }]}>
            <Input type="number" min={2} max={100} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
