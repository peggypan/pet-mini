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
  Switch,
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

const MENU_PATH = '/community/posts';
import { DetailMediaSection, resolveMediaUrls } from '../../components/DetailMediaGallery';
import { COMMUNITY_ZONE_LABELS, lostTypeLabel, zoneLabel } from '../../config/miniapp-align';
import { mockSocialPosts } from '../../mock/data';
import type { SocialLostType, SocialPostRow } from '../../types';
import { nextAdminId, nowAdminTime } from '../../utils/admin-record';

type KindFilter = 'all' | 'community' | 'rescue';

type AddForm = {
  userName: string;
  petName: string;
  zone: string;
  topic?: string;
  content: string;
  lostType?: SocialLostType | '';
};

export function PostListPage() {
  const [rows, setRows] = useState(mockSocialPosts);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<SocialPostRow | null>(null);
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
    if (kindFilter === 'community') {
      list = list.filter((r) => !r.lostType);
    } else if (kindFilter === 'rescue') {
      list = list.filter((r) => !!r.lostType);
    }
    const q = keyword.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.content.toLowerCase().includes(q)
          || r.userName.toLowerCase().includes(q)
          || (r.topic || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, statusFilter, kindFilter, keyword]);

  const setStatus = (id: string, status: SocialPostRow['status']) => {
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
    form.setFieldsValue({ zone: 'dog', userName: '运营录入', petName: '官方' });
    setAddOpen(true);
  };

  const submitAdd = async () => {
    const values = await form.validateFields();
    const lostType = values.lostType || undefined;
    const row: SocialPostRow = {
      id: nextAdminId('sp'),
      userName: values.userName.trim(),
      petName: values.petName.trim(),
      zone: values.zone,
      topic: values.topic?.trim() || undefined,
      content: values.content.trim(),
      lostType,
      mediaCount: 0,
      likes: 0,
      comments: 0,
      status: 'approved',
      essence: false,
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
    message.success(`已通过 ${pendingCount} 条动态`);
  };

  return (
    <>
      <PageIntro
        title="社区动态审核"
        description="对齐 social / social-post / social-detail：分区、#话题、媒体评论；lost-publish 带 lostType 的帖同步出现在「寻宠·救助」列表，用户可自行删除 UGC。"
      />
      <Space style={{ marginBottom: 12 }} wrap>
        {(
          [
            ['all', '全部帖子'],
            ['community', '纯社区'],
            ['rescue', '寻宠救助帖'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="small"
            type={kindFilter === key ? 'primary' : 'default'}
            onClick={() => setKindFilter(key)}
          >
            {label}
          </Button>
        ))}
      </Space>
      <StatusFilterBar value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
      <ListToolbar
        searchPlaceholder="正文 / 用户 / 话题"
        onSearch={setKeyword}
        onAdd={openAdd}
        bulkApprove={{ pendingCount, onConfirm: bulkApproveAll, unit: '条动态' }}
      />
      <Table
        rowKey="id"
        dataSource={displayRows}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 1180 }}
        columns={[
          {
            title: '用户',
            render: (_, r) => `${r.userName} · ${r.petName}`,
            width: 140,
          },
          {
            title: '类型',
            width: 100,
            render: (_, r) =>
              r.lostType ? (
                <Tag color="volcano">{lostTypeLabel(r.lostType)}</Tag>
              ) : (
                <Tag>社区动态</Tag>
              ),
          },
          { title: '分区', width: 88, render: (_, r) => zoneLabel(r.zone) },
          { title: '话题', dataIndex: 'topic', width: 120, ellipsis: true },
          { title: '内容', dataIndex: 'content', ellipsis: true },
          {
            title: '媒体',
            width: 64,
            render: (_, r) => (r.mediaCount ? `${r.mediaCount} 张` : '—'),
          },
          { title: '赞/评', render: (_, r) => `${r.likes}/${r.comments}`, width: 72 },
          {
            title: '用户删',
            width: 72,
            render: (_, r) => (r.userDeleted ? <Tag>已删</Tag> : '—'),
          },
          { title: '状态', dataIndex: 'status', width: 96, render: (s) => <AuditStatusTag status={s} /> },
          {
            title: '精华',
            dataIndex: 'essence',
            width: 72,
            render: (v, r) => (
              <Switch
                size="small"
                checked={v}
                disabled={!!r.userDeleted}
                onChange={(checked) =>
                  setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, essence: checked } : x)))
                }
              />
            ),
          },
          { title: '时间', dataIndex: 'createdAt', width: 160 },
          {
            title: '操作',
            width: 280,
            fixed: 'right',
            render: (_, r) => (
              <Space wrap size={0}>
                <Button type="link" size="small" onClick={() => setDetail(r)}>
                  查看资料
                </Button>
                {r.status === 'pending' && (
                  <>
                    <Button type="link" size="small" onClick={() => setStatus(r.id, 'approved')}>
                      通过
                    </Button>
                    <Button type="link" size="small" danger onClick={() => setStatus(r.id, 'rejected')}>
                      拒绝
                    </Button>
                  </>
                )}
                {!r.userDeleted && (
                  <Button type="link" size="small" onClick={() => setStatus(r.id, 'hidden')}>
                    隐藏
                  </Button>
                )}
                <Popconfirm title="确定删除该条记录？删除后不可恢复。" onConfirm={() => removeRow(r.id)}>
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Drawer
        title="动态资料"
        width={520}
        open={!!detail}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="帖子 ID">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="用户">
              {detail.userName} · {detail.petName}
            </Descriptions.Item>
            <Descriptions.Item label="类型">
              {detail.lostType ? lostTypeLabel(detail.lostType) : '社区动态'}
            </Descriptions.Item>
            <Descriptions.Item label="分区">{zoneLabel(detail.zone)}</Descriptions.Item>
            <Descriptions.Item label="话题">{detail.topic || '—'}</Descriptions.Item>
            <Descriptions.Item label="正文">{detail.content}</Descriptions.Item>
            <Descriptions.Item label="媒体">{detail.mediaCount ? `${detail.mediaCount} 张` : '—'}</Descriptions.Item>
            <Descriptions.Item label="互动">
              赞 {detail.likes} · 评 {detail.comments}
            </Descriptions.Item>
            <Descriptions.Item label="精华">{detail.essence ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="用户自行删除">{detail.userDeleted ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <AuditStatusTag status={detail.status} />
            </Descriptions.Item>
            <Descriptions.Item label="时间">{detail.createdAt}</Descriptions.Item>
          </Descriptions>
          <DetailMediaSection
            title="配图相册"
            urls={resolveMediaUrls(detail.images, detail.mediaCount, `social-${detail.id}`)}
            emptyLabel="无配图"
          />
          </>
        ) : null}
      </Drawer>

      <Modal
        title="新增社区动态"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={() => void submitAdd()}
        okText="保存"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="userName" label="用户昵称" rules={[{ required: true, message: '请输入昵称' }]}>
            <Input placeholder="展示用昵称" />
          </Form.Item>
          <Form.Item name="petName" label="宠物名" rules={[{ required: true, message: '请输入宠物名' }]}>
            <Input placeholder="如：橘子" />
          </Form.Item>
          <Form.Item name="zone" label="分区" rules={[{ required: true }]}>
            <Select
              options={Object.entries(COMMUNITY_ZONE_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
          <Form.Item name="lostType" label="寻宠救助类型（选填）">
            <Select
              allowClear
              placeholder="留空则为纯社区帖"
              options={[
                { value: 'lost', label: '寻宠' },
                { value: 'found', label: '招领' },
                { value: 'rescue', label: '救助' },
                { value: 'adopt', label: '领养' },
              ]}
            />
          </Form.Item>
          <Form.Item name="topic" label="话题">
            <Input placeholder="#携宠露营" />
          </Form.Item>
          <Form.Item name="content" label="正文" rules={[{ required: true, message: '请输入正文' }]}>
            <Input.TextArea rows={4} placeholder="动态内容" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
