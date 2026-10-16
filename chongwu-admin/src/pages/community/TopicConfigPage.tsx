import { Button, Form, Input, InputNumber, Modal, Popconfirm, Switch, Table, message } from 'antd';
import { PageIntro } from '../../components/PageIntro';
import { fetchCommunityConfig, saveCommunityConfig } from '../../services/admin-data';
import type { HotTopicRow, ZoneRow } from '../../types';
import { useCallback, useEffect, useState } from 'react';

type TopicForm = {
  name: string;
  posts: number;
  hot: boolean;
};

function nextTopicId(rows: HotTopicRow[]) {
  const n = rows.reduce((max, r) => {
    const m = /^t(\d+)$/.exec(r.id);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  return `t${n + 1}`;
}

export function TopicConfigPage() {
  const [rows, setRows] = useState<HotTopicRow[]>([]);
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HotTopicRow | null>(null);
  const [form] = Form.useForm<TopicForm>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await fetchCommunityConfig();
      setRows(cfg.hotTopics);
      setZones(cfg.zones);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (next: HotTopicRow[]) => {
    setSaving(true);
    try {
      await saveCommunityConfig(next, zones);
      setRows(next);
      message.success('已保存');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({ name: '#', posts: 0, hot: false });
    setModalOpen(true);
  };

  const openEdit = (row: HotTopicRow) => {
    setEditing(row);
    form.setFieldsValue({ name: row.name, posts: row.posts, hot: row.hot });
    setModalOpen(true);
  };

  const onSaveModal = async () => {
    const values = await form.validateFields();
    const name = values.name.trim();
    if (!name.startsWith('#')) {
      message.warning('话题建议以 # 开头');
    }
    let next: HotTopicRow[];
    if (editing) {
      next = rows.map((x) =>
        x.id === editing.id ? { ...x, name, posts: values.posts, hot: values.hot } : x,
      );
    } else {
      next = [
        ...rows,
        { id: nextTopicId(rows), name, posts: values.posts, hot: values.hot },
      ];
    }
    setModalOpen(false);
    await persist(next);
  };

  const removeTopic = async (id: string) => {
    await persist(rows.filter((x) => x.id !== id));
  };

  return (
    <>
      <PageIntro
        title="话题配置"
        description="对应社区顶栏 HOT_TOPICS 与发帖页话题 pill；数据存云库 app_settings.community。"
        extra={
          <Button type="primary" onClick={openCreate} loading={saving}>
            新增话题
          </Button>
        }
      />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={false}
        columns={[
          { title: '话题', dataIndex: 'name' },
          { title: '关联帖数', dataIndex: 'posts', width: 100 },
          {
            title: '热门',
            dataIndex: 'hot',
            width: 88,
            render: (v, r) => (
              <Switch
                checked={v}
                disabled={saving}
                onChange={(hot) => {
                  const next = rows.map((x) => (x.id === r.id ? { ...x, hot } : x));
                  void persist(next);
                }}
              />
            ),
          },
          {
            title: '操作',
            width: 140,
            render: (_, r) => (
              <>
                <Button type="link" size="small" onClick={() => openEdit(r)}>
                  编辑
                </Button>
                <Popconfirm title="确定删除该话题？" onConfirm={() => void removeTopic(r.id)}>
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? '编辑话题' : '新增话题'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void onSaveModal()}
        okText="保存"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="name" label="话题名" rules={[{ required: true, message: '请输入话题' }]}>
            <Input placeholder="#携宠露营" />
          </Form.Item>
          <Form.Item name="posts" label="展示帖数（运营参考）">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="hot" label="标为热门" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
