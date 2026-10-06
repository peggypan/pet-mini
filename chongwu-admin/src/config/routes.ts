/** 路由元信息：面包屑、标题、菜单待办角标 key */
export interface RouteMeta {
  path: string;
  title: string;
  breadcrumb: string[];
}

export const routeMetaList: RouteMeta[] = [
  { path: '/', title: '工作台', breadcrumb: ['工作台'] },
  { path: '/users', title: '用户列表', breadcrumb: ['用户与宠物', '用户列表'] },
  { path: '/pets', title: '宠物档案', breadcrumb: ['用户与宠物', '宠物档案'] },
  { path: '/community/posts', title: '动态审核', breadcrumb: ['社区', '动态审核'] },
  { path: '/community/comments', title: '评论管理', breadcrumb: ['社区', '评论管理'] },
  { path: '/community/topics', title: '话题配置', breadcrumb: ['社区', '话题配置'] },
  { path: '/community/zones', title: '分区配置', breadcrumb: ['社区', '分区配置'] },
  { path: '/buddy', title: '搭子广场（搭搭）', breadcrumb: ['搭子广场（搭搭）'] },
  { path: '/host/applies', title: '成为主理人审核', breadcrumb: ['主理人与俱乐部', '成为主理人审核'] },
  { path: '/host/event-qualify', title: '活动发布资质', breadcrumb: ['主理人与俱乐部', '活动发布资质'] },
  { path: '/host/clubs', title: '俱乐部管理', breadcrumb: ['主理人与俱乐部', '俱乐部管理'] },
  { path: '/host/members', title: '俱乐部成员', breadcrumb: ['主理人与俱乐部', '成员与加入'] },
  { path: '/events', title: '活动列表', breadcrumb: ['活动', '活动列表'] },
  { path: '/events/signups', title: '报名核销', breadcrumb: ['活动', '报名核销'] },
  { path: '/map-points', title: '友好地图标点', breadcrumb: ['友好地图标点'] },
  { path: '/rescue', title: '寻宠·救助', breadcrumb: ['寻宠·救助'] },
  { path: '/merchants', title: '门店管理', breadcrumb: ['商家', '门店管理'] },
  { path: '/merchants/applies', title: '入驻审核', breadcrumb: ['商家', '入驻审核'] },
  { path: '/banners', title: '首页 Banner', breadcrumb: ['内容运营', '首页 Banner'] },
  { path: '/content/splash-ads', title: '开机广告', breadcrumb: ['内容运营', '开机广告'] },
  { path: '/points', title: '积分流水', breadcrumb: ['积分流水'] },
  { path: '/settings/sensitive', title: '敏感词', breadcrumb: ['系统', '敏感词'] },
];

export function getRouteMeta(pathname: string): RouteMeta {
  const exact = routeMetaList.find((r) => r.path === pathname);
  if (exact) return exact;
  return { path: pathname, title: '宠头头运营台', breadcrumb: ['工作台'] };
}

/** 侧边栏菜单项待办数量（Mock，接云后由接口填充） */
export const menuPendingBadges: Record<string, number> = {
  '/community/posts': 1,
  '/community/comments': 1,
  '/map-points': 23,
  '/merchants/applies': 5,
  '/rescue': 8,
  '/buddy': 1,
  '/host/applies': 1,
  '/host/event-qualify': 1,
  '/pets': 1,
};
