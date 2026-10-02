import { Card, Col, List, Row, Statistic, Tag } from 'antd';
import {
  UserOutlined,
  HeartOutlined,
  CommentOutlined,
  CalendarOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { PageIntro } from '../components/PageIntro';
import { dashboardStats, recentActivity } from '../mock/data';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { usePendingBadges } from '../context/PendingBadgeContext';

type WorkbenchItem = { title: string; path: string; pending?: number };

type WorkbenchGroup = { label: string; items: WorkbenchItem[] };

function buildWorkbenchGroups(badge: (path: string) => number): WorkbenchGroup[] {
  return [
    {
      label: '用户与宠物',
      items: [
        { title: '宠物档案', path: '/pets', pending: badge('/pets') },
        { title: '用户列表', path: '/users' },
      ],
    },
    {
      label: '社区与搭子',
      items: [
        { title: '社区动态', path: '/community/posts', pending: badge('/community/posts') },
        { title: '评论', path: '/community/comments', pending: badge('/community/comments') },
        { title: '搭子广场', path: '/buddy', pending: badge('/buddy') },
        { title: '寻宠救助', path: '/rescue', pending: badge('/rescue') },
      ],
    },
    {
      label: '活动与主理',
      items: [
        { title: '活动列表', path: '/events' },
        { title: '报名核销', path: '/events/signups' },
        { title: '活动发布资质', path: '/host/event-qualify', pending: badge('/host/event-qualify') },
        { title: '主理人入驻', path: '/host/applies', pending: badge('/host/applies') },
        { title: '俱乐部管理', path: '/host/clubs' },
      ],
    },
    {
      label: '地图与商家',
      items: [
        { title: '友好地图标点', path: '/map-points', pending: badge('/map-points') },
        { title: '商家入驻', path: '/merchants/applies', pending: badge('/merchants/applies') },
      ],
    },
  ];
}

const statCards = [
  {
    title: '注册用户',
    value: dashboardStats.users,
    icon: <UserOutlined />,
    path: '/users',
    accent: true,
  },
  {
    title: '宠物档案',
    value: dashboardStats.pets,
    icon: <HeartOutlined />,
    path: '/pets',
  },
  {
    title: '今日社区帖',
    value: dashboardStats.postsToday,
    icon: <CommentOutlined />,
    path: '/community/posts',
  },
  {
    title: '今日搭子帖',
    value: dashboardStats.buddyToday,
    icon: <CommentOutlined />,
    path: '/buddy',
  },
  {
    title: '在线活动',
    value: dashboardStats.eventsPublished,
    icon: <CalendarOutlined />,
    path: '/events',
  },
  {
    title: '本周报名',
    value: dashboardStats.eventSignupsWeek,
    icon: <CalendarOutlined />,
    path: '/events/signups',
  },
];

export function DashboardPage() {
  const { badges, pendingTotal } = usePendingBadges();
  const workbenchGroups = useMemo(
    () => buildWorkbenchGroups((path) => badges[path] || 0),
    [badges],
  );
  const activityFeed = recentActivity.slice(0, 6);

  return (
    <>
      <PageIntro
        title="工作台"
        description="数据概览与常用模块入口；有待办的模块会优先展示数量。"
        extra={
          pendingTotal > 0 ? (
            <Tag color="error" style={{ margin: 0, fontSize: 13, padding: '4px 10px' }}>
              待处理 {pendingTotal > 99 ? '99+' : pendingTotal} 项
            </Tag>
          ) : (
            <Tag color="success" style={{ margin: 0, fontSize: 13, padding: '4px 10px' }}>
              暂无待办
            </Tag>
          )
        }
      />
      <Row gutter={[16, 16]}>
        {statCards.map((item) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={item.path}>
            <Link to={item.path} className="stat-card-link">
              <Card
                className={`stat-card stat-card-clickable ${item.accent ? 'stat-card-accent' : ''}`}
                hoverable
              >
                <Statistic title={item.title} value={item.value} prefix={item.icon} />
                <span className="stat-card-more">
                  查看 <ArrowRightOutlined />
                </span>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={15}>
          <Card title="运营模块" className="panel-card workbench-panel">
            {workbenchGroups.map((group, gi) => (
              <div key={group.label} className={gi > 0 ? 'workbench-group' : undefined}>
                <div className="workbench-group-label">{group.label}</div>
                <List
                  size="small"
                  split={false}
                  dataSource={group.items}
                  renderItem={(item) => {
                    const n = item.pending || 0;
                    return (
                      <List.Item className="workbench-item">
                        <Link to={item.path} className="workbench-item-link">
                          <span className="workbench-item-title">{item.title}</span>
                          {n > 0 ? (
                            <Tag color="error" bordered={false} className="workbench-item-pending">
                              {n > 99 ? '99+' : n}
                            </Tag>
                          ) : null}
                          <span className="workbench-item-action">{n > 0 ? '去处理' : '进入'}</span>
                          <ArrowRightOutlined className="workbench-item-arrow" />
                        </Link>
                      </List.Item>
                    );
                  }}
                />
              </div>
            ))}
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card title="最近动态" className="panel-card workbench-activity-panel">
            <List
              size="small"
              split
              dataSource={activityFeed}
              locale={{ emptyText: '暂无动态' }}
              renderItem={(item) => (
                <List.Item className="workbench-activity-item">
                  <Link to={item.path} className="workbench-activity-link">
                    <span className="workbench-activity-time">{item.time}</span>
                    <span className="activity-text">{item.text}</span>
                  </Link>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
