import {
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  message,
} from 'antd';
import type { MapPointRow } from '../../types';
import { useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { AuditStatusTag } from '../../components/AuditStatusTag';
import { StatusFilterBar, filterByAuditStatus, type StatusFilterValue } from '../../components/StatusFilterBar';
import { ListToolbar } from '../../components/ListToolbar';
import { useSyncMenuPendingBadge } from '../../context/PendingBadgeContext';
import { countPendingStatus } from '../../utils/audit-pending';

const MENU_PATH = '/map-points';
import { DetailMediaSection, resolveMediaUrls } from '../../components/DetailMediaGallery';
import { useCloudList } from '../../hooks/useCloudList';
import { fetchMapPoints } from '../../services/admin-data';
import { reviewMapPoint } from '../../services/moderation';
import { createOfficialMapPoint } from '../../services/admin-write';
import { MAP_POINT_TYPES } from '../../config/miniapp-align';
import { AdminImageUrlsField } from '../../components/AdminImageUrlsField';

export function MapPointReviewPage() {
  const { rows, loading, reload } = useCloudList(() => fetchMapPoints(), []);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('pending');
  const [keyword, setKeyword] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<MapPointRow | null>(null);
  const [form] = Form.useForm<{
    name: string;
    type: string;
    address: string;
    city: string;
    submitter: string;
    latitude: number;
    longitude: number;
    pointsReward: number;
    autoApprove: boolean;
    images: string[];
  }>();
  const defaultReward = 5;

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<StatusFilterValue, number>> = { all: rows.length };
    rows.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [rows]);

  const displayRows = useMemo(() => {
    let list = filterByAuditStatus(rows, statusFilter);
    const q = keyword.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q)
          || r.city.toLowerCase().includes(q)
          || r.submitter.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, statusFilter, keyword]);

  const removeRow = async (id: string) => {
    try {
      await reviewMapPoint(id, 'reject', '运营拒绝');
      if (detail?.id === id) setDetail(null);
      message.success('已拒绝');
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const openAdd = () => {
    form.resetFields();
    form.setFieldsValue({
      type: '宠物友好餐厅',
      city: '北京',
      submitter: '宠头头官方',
      latitude: 39.9042,
      longitude: 116.4074,
      pointsReward: defaultReward,
      autoApprove: true,
      images: [],
    });
    setAddOpen(true);
  };

  const submitAdd = async () => {
    const values = await form.validateFields();
    try {
      await createOfficialMapPoint({
        name: values.name.trim(),
        type: values.type,
        address: values.address.trim(),
        city: values.city.trim(),
        submitter: values.submitter.trim(),
        latitude: values.latitude,
        longitude: values.longitude,
        pointsReward: values.pointsReward,
        autoApprove: values.autoApprove,
        images: values.images || [],
      });
      message.success('已创建标点');
      setAddOpen(false);
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '创建失败');
    }
  };

  const approve = async (id: string) => {
    try {
      await reviewMapPoint(id, 'approve');
      message.success(`已通过，将发放积分（云函数按 pointsReward）`);
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const pendingCount = useMemo(() => countPendingStatus(rows, (r) => r.status), [rows]);
  useSyncMenuPendingBadge(MENU_PATH, pendingCount);

  const bulkApproveAll = async () => {
    if (!pendingCount) return;
    const pending = rows.filter((r) => r.status === 'pending');
    try {
      await Promise.all(pending.map((r) => reviewMapPoint(r.id, 'approve')));
      message.success(`已通过 ${pending.length} 个标点`);
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '批量通过失败');
    }
  };

  return (
    <>
      <PageIntro
        title="友好地图标点审核"
        description="对应 friendly-map / map-submit · isValidMapMark 与 MAP_MARK_POINTS_REWARD。"
        extra={
          <Space>
            <span>有效标记奖励</span>
            <InputNumber min={0} max={100} defaultValue={defaultReward} addonAfter="积分" />
          </Space>
        }
      />
      <StatusFilterBar value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
      <ListToolbar
        searchPlaceholder="点位 / 城市 / 提交人"
        onSearch={setKeyword}
        onAdd={openAdd}
        addLabel="新增标点"
        bulkApprove={{ pendingCount, onConfirm: bulkApproveAll, unit: '个标点' }}
      />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={displayRows}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        columns={[
          { title: '点位名称', dataIndex: 'name' },
          { title: '类别', dataIndex: 'category', width: 88 },
          { title: '城市', dataIndex: 'city', width: 88 },
          { title: '提交人', dataIndex: 'submitter', width: 110 },
          { title: '状态', dataIndex: 'status', width: 96, render: (s) => <AuditStatusTag status={s} /> },
          { title: '奖励积分', dataIndex: 'pointsReward', width: 96, render: (v) => v ?? '—' },
          { title: '提交时间', dataIndex: 'createdAt', width: 160 },
          {
            title: '操作',
            width: 280,
            render: (_, r) => (
              <Space wrap size={0}>
                <Button type="link" size="small" onClick={() => setDetail(r)}>
                  查看资料
                </Button>
                {r.status === 'pending' ? (
                  <>
                    <Button type="primary" size="small" onClick={() => approve(r.id)}>
                      有效标记
                    </Button>
                    <Button size="small" danger onClick={() => void removeRow(r.id)}>
                      无效
                    </Button>
                  </>
                ) : (
                  <Button type="link" size="small">
                    查看地图
                  </Button>
                )}
                <Popconfirm title="确定删除该标点？" onConfirm={() => removeRow(r.id)}>
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Drawer title="标点资料" width={440} open={!!detail} onClose={() => setDetail(null)}>
        {detail ? (
          <>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="ID">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="点位名称">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="类别">{detail.category}</Descriptions.Item>
            <Descriptions.Item label="城市">{detail.city}</Descriptions.Item>
            <Descriptions.Item label="提交人">{detail.submitter}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <AuditStatusTag status={detail.status} />
            </Descriptions.Item>
            <Descriptions.Item label="奖励积分">{detail.pointsReward ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="提交时间">{detail.createdAt}</Descriptions.Item>
          </Descriptions>
          <DetailMediaSection
            title="现场照片"
            urls={resolveMediaUrls(detail.images, detail.images?.length, `mappoint-${detail.id}`)}
            emptyLabel="未上传"
          />
          </>
        ) : null}
      </Drawer>

      <Modal
        title="新增友好地图标点"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={() => void submitAdd()}
        okText="保存"
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="name" label="点位名称" rules={[{ required: true }]}>
            <Input placeholder="如：某某宠物友好咖啡馆" />
          </Form.Item>
          <Form.Item name="type" label="类别" rules={[{ required: true }]}>
            <Select options={MAP_POINT_TYPES.map((t) => ({ value: t, label: t }))} />
          </Form.Item>
          <Form.Item name="address" label="详细地址" rules={[{ required: true }]}>
            <Input placeholder="街道门牌，与小程序 map-submit 一致" />
          </Form.Item>
          <Form.Item name="city" label="城市" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="latitude" label="纬度" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} step={0.0001} />
            </Form.Item>
            <Form.Item name="longitude" label="经度" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} step={0.0001} />
            </Form.Item>
          </Space>
          <Form.Item name="submitter" label="展示提交人" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="pointsReward" label="审核通过奖励积分">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="autoApprove" label="直接通过审核" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="images" label="现场照片">
            <AdminImageUrlsField uploadFolder="admin/map-points" max={6} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
