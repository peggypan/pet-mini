import { Button, Descriptions, Drawer, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, message } from 'antd';
import { nextAdminId, nowAdminTime } from '../../utils/admin-record';
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
import { mockMapPoints } from '../../mock/data';

export function MapPointReviewPage() {
  const [rows, setRows] = useState(mockMapPoints);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('pending');
  const [keyword, setKeyword] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<MapPointRow | null>(null);
  const [form] = Form.useForm<{ name: string; category: string; city: string; submitter: string }>();
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

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (detail?.id === id) setDetail(null);
    message.success('已删除（Mock）');
  };

  const openAdd = () => {
    form.resetFields();
    form.setFieldsValue({ category: '咖啡馆', city: '北京', submitter: '运营录入' });
    setAddOpen(true);
  };

  const submitAdd = async () => {
    const values = await form.validateFields();
    const row: MapPointRow = {
      id: nextAdminId('mp'),
      name: values.name.trim(),
      category: values.category.trim(),
      city: values.city.trim(),
      submitter: values.submitter.trim(),
      status: 'approved',
      pointsReward: defaultReward,
      createdAt: nowAdminTime(),
    };
    setRows((prev) => [row, ...prev]);
    setAddOpen(false);
    message.success('已新增（Mock）');
  };

  const approve = (id: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'approved' as const, pointsReward: defaultReward } : r,
      ),
    );
    if (detail?.id === id) {
      setDetail((d) => (d ? { ...d, status: 'approved', pointsReward: defaultReward } : d));
    }
    message.success(`已通过，将发放 ${defaultReward} 积分（Mock）`);
  };

  const pendingCount = useMemo(() => countPendingStatus(rows, (r) => r.status), [rows]);
  useSyncMenuPendingBadge(MENU_PATH, pendingCount);

  const bulkApproveAll = () => {
    if (!pendingCount) return;
    setRows((prev) =>
      prev.map((r) =>
        r.status === 'pending'
          ? { ...r, status: 'approved' as const, pointsReward: defaultReward }
          : r,
      ),
    );
    setDetail((d) =>
      d?.status === 'pending' ? { ...d, status: 'approved', pointsReward: defaultReward } : d,
    );
    message.success(`已通过 ${pendingCount} 个标点，将发放积分（Mock）`);
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
                    <Button size="small" danger>
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
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="name" label="点位名称" rules={[{ required: true }]}>
            <Input placeholder="如：某某宠物友好咖啡馆" />
          </Form.Item>
          <Form.Item name="category" label="类别" rules={[{ required: true }]}>
            <Input placeholder="咖啡馆 / 公园 …" />
          </Form.Item>
          <Form.Item name="city" label="城市" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="submitter" label="提交人" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
