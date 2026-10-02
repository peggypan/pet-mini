import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  CommentOutlined,
  TeamOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  AlertOutlined,
  ShopOutlined,
  CrownOutlined,
  PictureOutlined,
  GiftOutlined,
  SettingOutlined,
} from '@ant-design/icons';

function menuLabel(text: string, path: string | undefined, badges: Record<string, number>) {
  const count = path ? badges[path] || 0 : 0;
  if (!count) return text;
  return (
    <span className="menu-label-with-badge">
      <span className="menu-label-text">{text}</span>
      <span className="menu-pending-count">{count > 99 ? '99+' : count}</span>
    </span>
  );
}

export function buildAdminMenuItems(badges: Record<string, number>): MenuProps['items'] {
  return [
    { key: '/', icon: <DashboardOutlined />, label: '工作台' },
    {
      key: 'user-group',
      icon: <UserOutlined />,
      label: '用户与宠物',
      children: [
        { key: '/users', label: '用户列表' },
        { key: '/pets', label: menuLabel('宠物档案', '/pets', badges) },
      ],
    },
    {
      key: 'community-group',
      icon: <CommentOutlined />,
      label: '社区',
      children: [
        { key: '/community/posts', label: menuLabel('动态审核', '/community/posts', badges) },
        { key: '/community/comments', label: menuLabel('评论管理', '/community/comments', badges) },
        { key: '/community/topics', label: '话题配置' },
        { key: '/community/zones', label: '分区配置' },
      ],
    },
    { key: '/buddy', icon: <TeamOutlined />, label: menuLabel('搭子广场（搭搭）', '/buddy', badges) },
    {
      key: 'host-group',
      icon: <CrownOutlined />,
      label: '主理人与俱乐部',
      children: [
        { key: '/host/applies', label: menuLabel('成为主理人审核', '/host/applies', badges) },
        { key: '/host/event-qualify', label: menuLabel('活动发布资质', '/host/event-qualify', badges) },
        { key: '/host/clubs', label: '俱乐部管理' },
        { key: '/host/members', label: '成员与加入' },
      ],
    },
    {
      key: 'event-group',
      icon: <CalendarOutlined />,
      label: '活动',
      children: [
        { key: '/events', label: '活动列表' },
        { key: '/events/signups', label: '报名核销' },
      ],
    },
    {
      key: '/map-points',
      icon: <EnvironmentOutlined />,
      label: menuLabel('友好地图标点', '/map-points', badges),
    },
    { key: '/rescue', icon: <AlertOutlined />, label: menuLabel('寻宠·救助', '/rescue', badges) },
    {
      key: 'merchant-group',
      icon: <ShopOutlined />,
      label: '商家',
      children: [
        { key: '/merchants', label: '门店管理' },
        { key: '/merchants/applies', label: menuLabel('入驻审核', '/merchants/applies', badges) },
      ],
    },
    {
      key: 'content-group',
      icon: <PictureOutlined />,
      label: '内容运营',
      children: [
        { key: '/banners', label: '首页 Banner' },
        { key: '/content/splash-ads', label: '开机广告' },
      ],
    },
    { key: '/points', icon: <GiftOutlined />, label: '积分流水' },
    {
      key: 'settings-group',
      icon: <SettingOutlined />,
      label: '系统',
      children: [{ key: '/settings/sensitive', label: '敏感词' }],
    },
  ];
}
