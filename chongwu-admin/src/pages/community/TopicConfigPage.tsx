import { Button, Switch, Table } from 'antd';
import { PageIntro } from '../../components/PageIntro';
import { mockHotTopics } from '../../mock/data';
import { useState } from 'react';

export function TopicConfigPage() {
  const [rows, setRows] = useState(mockHotTopics);

  return (
    <>
      <PageIntro title="话题配置" description="对应社区顶栏 HOT_TOPICS 与发帖页话题 pill。" extra={<Button type="primary">新增话题</Button>} />
      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: '话题', dataIndex: 'name' },
          { title: '关联帖数', dataIndex: 'posts' },
          {
            title: '热门',
            dataIndex: 'hot',
            render: (v, r) => (
              <Switch
                checked={v}
                onChange={(hot) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, hot } : x)))}
              />
            ),
          },
          { title: '操作', render: () => <Button type="link">编辑</Button> },
        ]}
      />
    </>
  );
}
