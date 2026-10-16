import {
  Button,
  Form,
  Image,
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
import { useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { ListToolbar } from '../../components/ListToolbar';
import { SplashImageUpload } from '../../components/SplashImageUpload';
import { useCloudList } from '../../hooks/useCloudList';
import { fetchBanners, saveBanner } from '../../services/admin-data';
import { ensureCloudImageUrl } from '../../services/admin-write';
import type { BannerRow } from '../../types';

const BANNER_TYPES = [
  { value: 'mapPointsCampaign', label: '地图积分活动 (mapPointsCampaign)' },
  { value: 'official', label: '官方活动 (official)' },
  { value: 'platform', label: '平台推广 (platform)' },
  { value: 'event', label: '活动引流 (event)' },
  { value: 'custom', label: '自定义 (custom)' },
];

type FormValues = {
  title: string;
  type: string;
  cover: string;
  link: string;
  sortOrder: number;
  online: boolean;
};

function toForm(row: BannerRow): FormValues {
  return {
    title: row.title,
    type: row.type,
    cover: row.cover,
    link: row.link,
    sortOrder: row.sortOrder,
    online: row.status === 1,
  };
}

export function BannerListPage() {
  const { rows, loading, reload } = useCloudList(() => fetchBanners(), []);
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BannerRow | null>(null);
  const [form] = Form.useForm<FormValues>();

  const displayRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    let list = [...rows];
    if (q) {
      list = list.filter(
        (r) => r.title.toLowerCase().includes(q) || r.type.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [rows, keyword]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      title: '',
      type: 'official',
      cover: '',
      link: '/pages/home/home',
      sortOrder: rows.length,
      online: true,
    });
    setModalOpen(true);
  };

  const openEdit = (row: BannerRow) => {
    setEditing(row);
    form.setFieldsValue(toForm(row));
    setModalOpen(true);
  };

  const onSave = async () => {
    const values = await form.validateFields();
    try {
      const cover = await ensureCloudImageUrl(values.cover.trim(), 'admin/banners');
      await saveBanner({
        id: editing?.id,
        title: values.title.trim(),
        type: values.type,
        cover,
        link: values.link.trim(),
        sortOrder: values.sortOrder,
        status: values.online ? 1 : 0,
      });
      message.success(editing ? '已保存' : '已新增 Banner');
      setModalOpen(false);
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  const removeRow = async (id: string) => {
    try {
      await saveBanner({ id, remove: true });
      message.success('已删除');
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  const toggleOnline = async (row: BannerRow, online: boolean) => {
    try {
      await saveBanner({
        id: row.id,
        title: row.title,
        type: row.type,
        cover: row.cover,
        link: row.link,
        sortOrder: row.sortOrder,
        status: online ? 1 : 0,
      });
      message.success(online ? '已上线' : '已下线');
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '更新失败');
    }
  };

  return (
    <>
      <PageIntro
        title="首页 Banner"
        description="对应小程序 MOCK_HOME.banners · 首页轮播；封面建议 16:9 或 2:1，接云后同步至云库。"
      />
      <ListToolbar
        searchPlaceholder="标题 / 类型"
        onSearch={setKeyword}
        onAdd={openCreate}
        addLabel="新建 Banner"
      />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={displayRows}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 960 }}
        columns={[
          { title: '标题', dataIndex: 'title', ellipsis: true },
          { title: '类型', dataIndex: 'type', width: 160 },
          {
            title: '封面',
            dataIndex: 'cover',
            width: 120,
            render: (src: string) => (
              <Image
                width={96}
                height={54}
                style={{ objectFit: 'cover', borderRadius: 6, background: '#e8f4ff' }}
                src={src}
                fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='54'%3E%3Crect fill='%23E8F4FF' width='100%25' height='100%25'/%3E%3C/svg%3E"
              />
            ),
          },
          { title: '跳转', dataIndex: 'link', ellipsis: true },
          { title: '排序', dataIndex: 'sortOrder', width: 70 },
          {
            title: '上线',
            dataIndex: 'status',
            width: 80,
            render: (v, r) => (
              <Switch checked={v === 1} onChange={(checked) => void toggleOnline(r, checked)} />
            ),
          },
          {
            title: '操作',
            width: 140,
            fixed: 'right',
            render: (_, r) => (
              <Space size={0}>
                <Button type="link" size="small" onClick={() => openEdit(r)}>
                  编辑
                </Button>
                <Popconfirm title="确定删除该 Banner？" onConfirm={() => void removeRow(r.id)}>
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? '编辑 Banner' : '新建 Banner'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void onSave()}
        okText="保存"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="轮播主标题" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={BANNER_TYPES} />
          </Form.Item>
          <Form.Item
            name="cover"
            label="封面图"
            rules={[{ required: true, message: '请上传或填写封面 URL' }]}
          >
            <SplashImageUpload
              uploadFolder="admin/banners"
              previewMaxHeight={160}
              placeholder="或粘贴封面 URL（建议宽图 750×360 左右）"
              hint="首页轮播横图；本地上传写入云存储"
            />
          </Form.Item>
          <Form.Item
            name="link"
            label="跳转路径"
            rules={[{ required: true, message: '请输入小程序页面路径' }]}
          >
            <Input placeholder="/pages/event-detail/event-detail?id=e1" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序（越小越靠前）">
            <InputNumber min={0} max={999} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="online" label="立即上线" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
