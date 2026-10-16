import { Button, Form, Input, InputNumber, Modal, Popconfirm, Table, Tag, message } from 'antd';
import { ListToolbar } from '../../components/ListToolbar';
import { useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { SplashImageUpload } from '../../components/SplashImageUpload';
import { useCloudList } from '../../hooks/useCloudList';
import { fetchMerchants } from '../../services/admin-data';
import { ensureCloudImageUrl, saveMerchantAdmin, setMerchantBizStatus } from '../../services/admin-write';
import type { MerchantRow } from '../../types';

type MerchantForm = {
  name: string;
  city: string;
  type: string;
  rating: number;
  intro?: string;
  address?: string;
  contactPhone?: string;
  cover?: string;
};

export function MerchantListPage() {
  const { rows, loading, reload } = useCloudList(() => fetchMerchants(), []);
  const [keyword, setKeyword] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<MerchantRow | null>(null);
  const [form] = Form.useForm<MerchantForm>();

  const displayRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.city.toLowerCase().includes(q) || r.type.toLowerCase().includes(q),
    );
  }, [rows, keyword]);

  const setBiz = async (row: MerchantRow, bizStatus: 0 | 1 | 2) => {
    try {
      await setMerchantBizStatus(row.id, bizStatus);
      message.success(bizStatus === 1 ? '已恢复营业' : '已下架');
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      name: '',
      city: '北京',
      type: '宠物美容',
      rating: 5,
      intro: '',
      address: '',
      contactPhone: '',
      cover: '',
    });
    setEditOpen(true);
  };

  const openEdit = (row: MerchantRow) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      city: row.city,
      type: row.type,
      rating: row.rating,
      intro: row.intro || '',
      address: row.address || '',
      contactPhone: row.contactPhone || '',
      cover: row.cover || '',
    });
    setEditOpen(true);
  };

  const onSave = async () => {
    const values = await form.validateFields();
    try {
      const cover = values.cover ? await ensureCloudImageUrl(values.cover.trim(), 'admin/merchants') : '';
      await saveMerchantAdmin({
        ...(editing ? { id: editing.id } : { bizStatus: 1 }),
        name: values.name.trim(),
        city: values.city.trim(),
        type: values.type.trim(),
        category: values.type.trim(),
        rating: values.rating,
        intro: values.intro?.trim() || '',
        address: values.address?.trim() || '',
        contactPhone: values.contactPhone?.trim() || '',
        cover,
        logoUrl: cover,
      });
      message.success(editing ? '已保存门店资料' : '已创建门店');
      setEditOpen(false);
      await reload();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  return (
    <>
      <PageIntro title="门店管理" description="对应 merchants 集合；可新建/编辑资料并控制 bizStatus 营业状态。" />
      <ListToolbar
        searchPlaceholder="门店名 / 城市 / 类型"
        onSearch={setKeyword}
        onAdd={openCreate}
        addLabel="新建门店"
      />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={displayRows}
        pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 条` }}
        columns={[
          { title: '门店名', dataIndex: 'name' },
          { title: '城市', dataIndex: 'city' },
          { title: '类型', dataIndex: 'type' },
          { title: '评分', dataIndex: 'rating', width: 72 },
          {
            title: '状态',
            dataIndex: 'status',
            width: 110,
            render: (s: number) =>
              s === 1 ? <Tag color="green">营业</Tag> : s === 0 ? <Tag>待营业/下架</Tag> : <Tag color="red">拒绝</Tag>,
          },
          {
            title: '操作',
            width: 220,
            render: (_, r) => (
              <>
                <Button type="link" size="small" onClick={() => openEdit(r)}>
                  编辑
                </Button>
                {r.status === 1 ? (
                  <Popconfirm title="下架后小程序侧不可见，确定？" onConfirm={() => void setBiz(r, 0)}>
                    <Button type="link" size="small" danger>
                      下架
                    </Button>
                  </Popconfirm>
                ) : (
                  <Button type="link" size="small" onClick={() => void setBiz(r, 1)}>
                    恢复营业
                  </Button>
                )}
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? `编辑门店 · ${editing.name}` : '新建门店'}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => void onSave()}
        okText="保存"
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="name" label="门店名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="city" label="城市" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Input placeholder="美容 / 寄养 / 医院 …" />
          </Form.Item>
          <Form.Item name="rating" label="评分">
            <InputNumber min={0} max={5} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input />
          </Form.Item>
          <Form.Item name="contactPhone" label="联系电话">
            <Input />
          </Form.Item>
          <Form.Item name="intro" label="简介">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="cover" label="封面图">
            <SplashImageUpload uploadFolder="admin/merchants" previewMaxHeight={120} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
