import {
  Button,
  DatePicker,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { ListToolbar } from '../../components/ListToolbar';
import { SplashImageUpload } from '../../components/SplashImageUpload';
import { mockSplashAds } from '../../mock/data';
import type { SplashAdRow, SplashAdStatus, SplashLinkType, SplashShowRule } from '../../types';

const LINK_TYPE_LABEL: Record<SplashLinkType, string> = {
  none: '无跳转',
  miniPage: '小程序页面',
  h5: 'H5 链接',
};

const SHOW_RULE_LABEL: Record<SplashShowRule, string> = {
  everyLaunch: '每次冷启动',
  oncePerDay: '每日首次',
  oncePerUser: '每用户一次',
};

const STATUS_TAG: Record<SplashAdStatus, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  online: { color: 'green', label: '投放中' },
  offline: { color: 'red', label: '已下线' },
};

type FormValues = {
  name: string;
  imageUrl: string;
  linkType: SplashLinkType;
  linkTarget: string;
  durationSec: number;
  skippable: boolean;
  skipAfterSec: number;
  showRule: SplashShowRule;
  sortOrder: number;
  status: SplashAdStatus;
  schedule?: [Dayjs, Dayjs];
};

function toFormValues(row: SplashAdRow): FormValues {
  return {
    name: row.name,
    imageUrl: row.imageUrl,
    linkType: row.linkType,
    linkTarget: row.linkTarget,
    durationSec: row.durationSec,
    skippable: row.skippable,
    skipAfterSec: row.skipAfterSec,
    showRule: row.showRule,
    sortOrder: row.sortOrder,
    status: row.status,
    schedule:
      row.startAt && row.endAt
        ? [dayjs(row.startAt), dayjs(row.endAt)]
        : undefined,
  };
}

function fromFormValues(values: FormValues, id?: string): SplashAdRow {
  const [start, end] = values.schedule || [];
  return {
    id: id || `splash_${Date.now()}`,
    name: values.name,
    imageUrl: values.imageUrl,
    linkType: values.linkType,
    linkTarget: values.linkTarget || '',
    durationSec: values.durationSec,
    skippable: values.skippable,
    skipAfterSec: values.skipAfterSec,
    showRule: values.showRule,
    sortOrder: values.sortOrder,
    status: values.status,
    startAt: start ? start.format('YYYY-MM-DD HH:mm') : undefined,
    endAt: end ? end.format('YYYY-MM-DD HH:mm') : undefined,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  };
}

export function SplashAdManagePage() {
  const [rows, setRows] = useState(mockSplashAds);
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SplashAdRow | null>(null);
  const [preview, setPreview] = useState<SplashAdRow | null>(null);
  const [form] = Form.useForm<FormValues>();

  const displayRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return [...rows].sort((a, b) => b.sortOrder - a.sortOrder);
    return rows
      .filter((r) => r.name.toLowerCase().includes(q))
      .sort((a, b) => b.sortOrder - a.sortOrder);
  }, [rows, keyword]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      name: '',
      imageUrl: '',
      linkType: 'miniPage',
      linkTarget: '',
      durationSec: 5,
      skippable: true,
      skipAfterSec: 3,
      showRule: 'oncePerDay',
      sortOrder: 0,
      status: 'draft',
    });
    setModalOpen(true);
  };

  const openEdit = (row: SplashAdRow) => {
    setEditing(row);
    form.setFieldsValue(toFormValues(row));
    setModalOpen(true);
  };

  const onSave = async () => {
    const values = await form.validateFields();
    const next = fromFormValues(values, editing?.id);
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? next : r)));
      message.success('已保存');
    } else {
      setRows((prev) => [next, ...prev]);
      message.success('已创建');
    }
    setModalOpen(false);
  };

  const toggleOnline = (row: SplashAdRow) => {
    const nextStatus: SplashAdStatus = row.status === 'online' ? 'offline' : 'online';
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, status: nextStatus, updatedAt: dayjs().format('YYYY-MM-DD HH:mm') }
          : r,
      ),
    );
    message.success(nextStatus === 'online' ? '已开启投放' : '已下线');
  };

  return (
    <>
      <PageIntro
        title="开机广告"
        description="小程序冷启动全屏闪屏（隐私页之后、首页之前）。接云库后由客户端拉取 status=online 且在投放期内的最高 sortOrder 一条。"
        extra={
          <Button type="primary" onClick={openCreate}>
            新建广告
          </Button>
        }
      />
      <ListToolbar searchPlaceholder="内部名称" onSearch={setKeyword} />
      <Table
        rowKey="id"
        dataSource={displayRows}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 1200 }}
        columns={[
          {
            title: '预览',
            dataIndex: 'imageUrl',
            width: 72,
            render: (src: string, r) => (
              <Image
                src={src}
                width={40}
                height={72}
                style={{ objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }}
                preview={false}
                onClick={() => setPreview(r)}
              />
            ),
          },
          { title: '名称', dataIndex: 'name', width: 160 },
          {
            title: '跳转',
            width: 200,
            ellipsis: true,
            render: (_, r) =>
              r.linkType === 'none' ? '—' : `${LINK_TYPE_LABEL[r.linkType]} · ${r.linkTarget || '—'}`,
          },
          {
            title: '展示',
            width: 120,
            render: (_, r) => (
              <>
                {r.durationSec}s
                {r.skippable ? ` · ${r.skipAfterSec}s 可跳过` : ' · 不可跳过'}
              </>
            ),
          },
          {
            title: '频次',
            dataIndex: 'showRule',
            width: 110,
            render: (v: SplashShowRule) => SHOW_RULE_LABEL[v],
          },
          { title: '优先级', dataIndex: 'sortOrder', width: 80 },
          {
            title: '投放期',
            width: 180,
            render: (_, r) =>
              r.startAt && r.endAt ? (
                <span style={{ fontSize: 12 }}>
                  {r.startAt}
                  <br />
                  至 {r.endAt}
                </span>
              ) : (
                '长期'
              ),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 96,
            render: (s: SplashAdStatus) => {
              const t = STATUS_TAG[s];
              return <Tag color={t.color}>{t.label}</Tag>;
            },
          },
          {
            title: '操作',
            width: 220,
            fixed: 'right',
            render: (_, r) => (
              <Space>
                <Button type="link" size="small" onClick={() => setPreview(r)}>
                  预览
                </Button>
                <Button type="link" size="small" onClick={() => openEdit(r)}>
                  编辑
                </Button>
                <Button type="link" size="small" onClick={() => toggleOnline(r)}>
                  {r.status === 'online' ? '下线' : '投放'}
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? '编辑开机广告' : '新建开机广告'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSave}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="内部名称" rules={[{ required: true }]}>
            <Input placeholder="如：春季露营开屏" />
          </Form.Item>
          <Form.Item
            name="imageUrl"
            label="全屏素材"
            rules={[{ required: true, message: '请上传图片或填写 URL' }]}
          >
            <SplashImageUpload />
          </Form.Item>
          <Form.Item name="linkType" label="点击跳转">
            <Select
              options={[
                { value: 'none', label: '无跳转' },
                { value: 'miniPage', label: '小程序页面路径' },
                { value: 'h5', label: 'H5（需 web-view 页）' },
              ]}
            />
          </Form.Item>
          <Form.Item name="linkTarget" label="跳转目标">
            <Input placeholder="/pages/event-detail/event-detail?id=e1" />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="durationSec" label="最长展示(秒)" rules={[{ required: true }]}>
              <InputNumber min={1} max={15} />
            </Form.Item>
            <Form.Item name="skippable" label="允许跳过" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="skipAfterSec" label="几秒后可跳过">
              <InputNumber min={0} max={15} />
            </Form.Item>
          </Space>
          <Form.Item name="showRule" label="展示频次">
            <Select
              options={[
                { value: 'everyLaunch', label: '每次冷启动' },
                { value: 'oncePerDay', label: '每日首次启动' },
                { value: 'oncePerUser', label: '每用户仅一次' },
              ]}
            />
          </Form.Item>
          <Form.Item name="sortOrder" label="优先级（越大越优先）">
            <InputNumber min={0} max={999} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={[
                { value: 'draft', label: '草稿' },
                { value: 'online', label: '投放中' },
                { value: 'offline', label: '已下线' },
              ]}
            />
          </Form.Item>
          <Form.Item name="schedule" label="投放时段（可选）">
            <DatePicker.RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="开机广告预览"
        open={!!preview}
        footer={null}
        onCancel={() => setPreview(null)}
        width={320}
        centered
      >
        {preview ? (
          <div className="splash-phone-preview">
            <div className="splash-phone-notch" />
            <Image src={preview.imageUrl} alt="" className="splash-phone-img" preview={false} />
            {preview.skippable ? (
              <span className="splash-phone-skip">
                跳过 {preview.skipAfterSec > 0 ? `${preview.skipAfterSec}s` : ''}
              </span>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
