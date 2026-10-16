import { Button, Form, Input, Modal, Switch, Table, message } from 'antd';
import { PageIntro } from '../../components/PageIntro';
import { fetchCommunityConfig, saveCommunityConfig } from '../../services/admin-data';
import type { ZoneRow } from '../../types';
import { useCallback, useEffect, useState } from 'react';

type ZoneForm = {
  name: string;
  icon: string;
  enabled: boolean;
};

export function ZoneConfigPage() {
  const [rows, setRows] = useState<ZoneRow[]>([]);
  const [hotTopics, setHotTopics] = useState<Awaited<ReturnType<typeof fetchCommunityConfig>>['hotTopics']>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ZoneRow | null>(null);
  const [form] = Form.useForm<ZoneForm>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await fetchCommunityConfig();
      setRows(cfg.zones);
      setHotTopics(cfg.hotTopics);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persistZones = async (next: ZoneRow[]) => {
    setSaving(true);
    try {
      await saveCommunityConfig(hotTopics, next);
      setRows(next);
      message.success('已保存');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row: ZoneRow) => {
    setEditing(row);
    form.setFieldsValue({ name: row.name, icon: row.icon, enabled: row.enabled });
    setModalOpen(true);
  };

  const onSaveModal = async () => {
    if (!editing) return;
    const values = await form.validateFields();
    const next = rows.map((x) =>
      x.id === editing.id
        ? { ...x, name: values.name.trim(), icon: values.icon.trim(), enabled: values.enabled }
        : x,
    );
    setModalOpen(false);
    await persistZones(next);
  };

  return (
    <>
      <PageIntro
        title="社区分区"
        description="对应 community-zones · POST_ZONES；启用状态与展示文案同步至 app_settings.community。"
      />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={false}
        columns={[
          { title: 'ID', dataIndex: 'id' },
          { title: '图标', dataIndex: 'icon', width: 60 },
          { title: '名称', dataIndex: 'name' },
          {
            title: '启用',
            dataIndex: 'enabled',
            render: (v, r) => (
              <Switch
                checked={v}
                disabled={saving}
                onChange={(enabled) => {
                  const next = rows.map((x) => (x.id === r.id ? { ...x, enabled } : x));
                  void persistZones(next);
                }}
              />
            ),
          },
          {
            title: '操作',
            width: 88,
            render: (_, r) => (
              <Button type="link" size="small" onClick={() => openEdit(r)}>
                编辑
              </Button>
            ),
          },
        ]}
      />

      <Modal
        title={`编辑分区 · ${editing?.id || ''}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => void onSaveModal()}
        okText="保存"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="icon" label="图标" rules={[{ required: true }]}>
            <Input placeholder="🐶" maxLength={4} />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
