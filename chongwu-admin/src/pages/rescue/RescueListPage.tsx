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
import { useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { AuditStatusTag } from '../../components/AuditStatusTag';
import { StatusFilterBar, filterByAuditStatus, type StatusFilterValue } from '../../components/StatusFilterBar';
import { ListToolbar } from '../../components/ListToolbar';
import { useSyncMenuPendingBadge } from '../../context/PendingBadgeContext';
import { countPendingStatus } from '../../utils/audit-pending';

const MENU_PATH = '/rescue';
import { DetailMediaSection, resolveMediaUrls } from '../../components/DetailMediaGallery';
import { RESCUE_SOURCE_LABELS, lostTypeLabel } from '../../config/miniapp-align';
import { mockRescuePosts } from '../../mock/data';
import type { RescuePostRow } from '../../types';
import { nextAdminId, nowAdminTime } from '../../utils/admin-record';

type TypeFilter = 'all' | RescuePostRow['type'];

type AddForm = {
  type: RescuePostRow['type'];
  title: string;
  preview: string;
  city: string;
  contact: string;
  userName?: string;
  source: 'social' | 'local';
};

export function RescueListPage() {
  const [rows, setRows] = useState(mockRescuePosts);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<RescuePostRow | null>(null);
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
    if (typeFilter !== 'all') {
      list = list.filter((r) => r.type === typeFilter);
    }
    const q = keyword.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q)
          || (r.preview || '').toLowerCase().includes(q)
          || (r.userName || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, statusFilter, typeFilter, keyword]);

  const setStatus = (id: string, status: RescuePostRow['status']) => {
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
    form.setFieldsValue({ type: 'lost', source: 'local', city: '北京' });
    setAddOpen(true);
  };

  const submitAdd = async () => {
    const values = await form.validateFields();
    const refId = nextAdminId(values.source === 'social' ? 'sp' : 'lp');
    const row: RescuePostRow = {
      id: nextAdminId('r'),
      type: values.type,
      title: values.title.trim(),
      preview: values.preview.trim(),
      city: values.city.trim(),
      contact: values.contact.trim(),
      userName: values.userName?.trim() || '运营录入',
      source: values.source,
      refId,
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
    message.success(`已通过 ${pendingCount} 条救助信息`);
  };

  return (
    <>
      <PageIntro
        title="寻宠 · 救助"
        description="对齐 pet-rescue / lost-publish：寻宠、招领、救助、领养；数据来自 social_posts（lostType）与 local_posts，用户可在列表自行删除。"
      />
      <Space style={{ marginBottom: 12 }} wrap>
        {(['all', 'lost', 'found', 'rescue', 'adopt'] as TypeFilter[]).map((key) => (
          <Button
            key={key}
            size="small"
            type={typeFilter === key ? 'primary' : 'default'}
            onClick={() => setTypeFilter(key)}
          >
            {key === 'all' ? '全部' : lostTypeLabel(key)}
          </Button>
        ))}
      </Space>
      <StatusFilterBar value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
      <ListToolbar
        searchPlaceholder="标题 / 摘要 / 用户"
        onSearch={setKeyword}
        onAdd={openAdd}
        bulkApprove={{ pendingCount, onConfirm: bulkApproveAll, unit: '条' }}
      />
      <Table
        rowKey="id"
        dataSource={displayRows}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 1180 }}
        columns={[
          {
            title: '类型',
            dataIndex: 'type',
            width: 72,
            render: (t: string) => <Tag>{lostTypeLabel(t)}</Tag>,
          },
          { title: '标题', dataIndex: 'title', width: 140, ellipsis: true },
          { title: '摘要', dataIndex: 'preview', ellipsis: true },
          { title: '发布者', dataIndex: 'userName', width: 100, render: (v) => v || '—' },
          { title: '城市', dataIndex: 'city', width: 80 },
          { title: '联系', dataIndex: 'contact', width: 120 },
          {
            title: '来源',
            width: 140,
            render: (_, r) => (
              <>
                <div>{RESCUE_SOURCE_LABELS[r.source || 'mock'] || r.source}</div>
                {r.refId && <span style={{ fontSize: 12, color: '#999' }}>ref: {r.refId}</span>}
              </>
            ),
          },
          {
            title: '用户删',
            width: 72,
            render: (_, r) => (r.userDeleted ? <Tag>已删</Tag> : '—'),
          },
          { title: '状态', dataIndex: 'status', width: 96, render: (s) => <AuditStatusTag status={s} /> },
          { title: '时间', dataIndex: 'createdAt', width: 150 },
          {
            title: '操作',
            width: 280,
            fixed: 'right',
            render: (_, r) => (
              <Space wrap size={0}>
                <Button type="link" size="small" onClick={() => setDetail(r)}>
                  查看资料
                </Button>
                {r.status === 'pending' ? (
                  <>
                    <Button type="link" size="small" onClick={() => setStatus(r.id, 'approved')}>
                      通过
                    </Button>
                    <Button type="link" size="small" danger onClick={() => setStatus(r.id, 'rejected')}>
                      拒绝
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="link" size="small">
                      置顶
                    </Button>
                    <Button type="link" size="small" onClick={() => setStatus(r.id, 'hidden')}>
                      隐藏
                    </Button>
                  </>
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

      <Drawer title="寻宠救助资料" width={520} open={!!detail} onClose={() => setDetail(null)}>
        {detail ? (
          <>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="ID">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="类型">{lostTypeLabel(detail.type)}</Descriptions.Item>
            <Descriptions.Item label="标题">{detail.title}</Descriptions.Item>
            <Descriptions.Item label="摘要">{detail.preview}</Descriptions.Item>
            <Descriptions.Item label="发布者">{detail.userName || '—'}</Descriptions.Item>
            <Descriptions.Item label="城市">{detail.city}</Descriptions.Item>
            <Descriptions.Item label="联系">{detail.contact}</Descriptions.Item>
            <Descriptions.Item label="来源">
              {RESCUE_SOURCE_LABELS[detail.source || 'mock'] || detail.source}
              {detail.refId ? ` · ref ${detail.refId}` : ''}
            </Descriptions.Item>
            <Descriptions.Item label="用户删">{detail.userDeleted ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <AuditStatusTag status={detail.status} />
            </Descriptions.Item>
            <Descriptions.Item label="时间">{detail.createdAt}</Descriptions.Item>
          </Descriptions>
          <DetailMediaSection
            title="现场照片"
            urls={resolveMediaUrls(detail.images, detail.mediaCount, `rescue-${detail.id}`)}
            emptyLabel="无照片"
          />
          </>
        ) : null}
      </Drawer>

      <Modal
        title="新增寻宠救助信息"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={() => void submitAdd()}
        okText="保存"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'lost', label: '寻宠' },
                { value: 'found', label: '招领' },
                { value: 'rescue', label: '救助' },
                { value: 'adopt', label: '领养' },
              ]}
            />
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="列表标题" />
          </Form.Item>
          <Form.Item name="preview" label="摘要" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="简要描述" />
          </Form.Item>
          <Form.Item name="userName" label="发布者">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="city" label="城市" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contact" label="联系方式" rules={[{ required: true }]}>
            <Input placeholder="手机或微信" />
          </Form.Item>
          <Form.Item name="source" label="数据来源" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'social', label: '社区帖（social）' },
                { value: 'local', label: '本地领养（local）' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
