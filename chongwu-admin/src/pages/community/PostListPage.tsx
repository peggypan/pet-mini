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
import { useCloudList } from '../../hooks/useCloudList';
import { fetchSocialPosts } from '../../services/admin-data';
import { auditStatusToDecision, moderatePost } from '../../services/moderation';
import { createOfficialContent, ensureCloudImageUrl } from '../../services/admin-write';
import { AdminImageUrlsField } from '../../components/AdminImageUrlsField';
import { SplashImageUpload } from '../../components/SplashImageUpload';
import type { SocialLostType, SocialPostRow } from '../../types';
type KindFilter = 'all' | 'community' | 'rescue';

type AddForm = {
  userName: string;
  petName: string;
  zone: string;
  topic?: string;
  content: string;
  lostType?: SocialLostType | '';
  coverImage?: string;
  images?: string[];
};

export function PostListPage() {
  const { rows, loading, reload } = useCloudList(() => fetchSocialPosts(), []);
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

  const setStatus = async (id: string, status: SocialPostRow['status']) => {
    try {
      await moderatePost('social', id, auditStatusToDecision(status));
      message.success('已更新');
      if (detail?.id === id) setDetail((d) => (d ? { ...d, status } : d));
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const removeRow = async (id: string) => {
    try {
      await moderatePost('social', id, 'hide', '运营下架');
      message.success('已下架');
      setDetail((d) => (d?.id === id ? null : d));
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const openAdd = () => {
    form.resetFields();
    form.setFieldsValue({ zone: 'dog', userName: '运营录入', petName: '官方', images: [] });
    setAddOpen(true);
  };

  const submitAdd = async () => {
    const values = await form.validateFields();
    try {
      let cover = values.coverImage?.trim() || '';
      if (cover) cover = await ensureCloudImageUrl(cover, 'admin/social');
      const extraImages = await Promise.all(
        (values.images || []).filter(Boolean).map((u) => ensureCloudImageUrl(u, 'admin/social')),
      );
      const images = [...new Set([...(cover ? [cover] : []), ...extraImages])].slice(0, 6);
      await createOfficialContent('social', {
        userName: values.userName.trim(),
        petName: values.petName.trim(),
        zone: values.zone,
        topic: values.topic?.trim() || '',
        content: values.content.trim(),
        lostType: values.lostType || '',
        title: values.lostType ? values.content.trim().slice(0, 40) : '',
        city: '北京',
        ...(images.length ? { image: images[0], images } : {}),
      });
      message.success('已发布官方动态');
      setAddOpen(false);
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '发布失败');
    }
  };

  const pendingCount = useMemo(() => countPendingStatus(rows, (r) => r.status), [rows]);
  useSyncMenuPendingBadge(MENU_PATH, pendingCount);

  const bulkApproveAll = async () => {
    if (!pendingCount) return;
    const pending = rows.filter((r) => r.status === 'pending');
    try {
      await Promise.all(pending.map((r) => moderatePost('social', r.id, 'approve')));
      message.success(`已通过 ${pending.length} 条动态`);
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '批量通过失败');
    }
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
        loading={loading}
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
                onChange={async (checked) => {
                  try {
                    await moderatePost('social', r.id, 'approve', undefined, checked);
                    await reload();
                  } catch (e) {
                    message.error(e instanceof Error ? e.message : '更新精华失败');
                  }
                }}
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
          <Form.Item name="coverImage" label="封面（可选）">
            <SplashImageUpload uploadFolder="admin/social" previewMaxHeight={140} />
          </Form.Item>
          <Form.Item name="images" label="多图（可选，≤6，不含封面重复）">
            <AdminImageUrlsField uploadFolder="admin/social" max={6} />
          </Form.Item>
          <Form.Item name="content" label="正文" rules={[{ required: true, message: '请输入正文' }]}>
            <Input.TextArea rows={4} placeholder="动态内容" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
