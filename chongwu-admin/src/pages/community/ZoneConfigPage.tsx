import { Switch, Table } from 'antd';
import { PageIntro } from '../../components/PageIntro';
import { mockZones } from '../../mock/data';
import { useState } from 'react';

export function ZoneConfigPage() {
  const [rows, setRows] = useState(mockZones);

  return (
    <>
      <PageIntro title="社区分区" description="对应 community-zones · POST_ZONES / COMMUNITY_ZONES。" />
      <Table
        rowKey="id"
        dataSource={rows}
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
                onChange={(enabled) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, enabled } : x)))}
              />
            ),
          },
        ]}
      />
    </>
  );
}
