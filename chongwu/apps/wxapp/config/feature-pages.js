/**
 * 小程序页面开关与「未注册」清单。
 * app.json 不支持注释，暂不上线的页面从此处维护说明，并从 app.json 的 pages 数组移除。
 *
 * 恢复某页：1) 将路径加回 app.json；2) 打开对应 feature 开关；3) 检查入口 navigateTo。
 */

/** 已从 app.json 移除、代码仍保留在仓库中的页面路径 */
const DISABLED_APP_PAGES = [
  // 商家链路（详情 / 预约）— 体验版暂不做
  'pages/merchant-detail/merchant-detail',
  'pages/service-book/service-book',
  // 无入口的占位/演示页
  'pages/chat-call/chat-call',
  // 领养发布已走 lost-publish?mode=rescue-adopt
  'pages/adopt-publish/adopt-publish',
];

/**
 * 仅存在于 pages/ 目录、从未写入 app.json 的模块（商城/服务/闲置/健康等），
 * 需要上线时再注册并接入口。
 */
const OFFLINE_PAGE_DIRS = [
  'pages/mall',
  'pages/mall-product',
  'pages/mall-service',
  'pages/service',
  'pages/service-detail',
  'pages/service-order',
  'pages/orders',
  'pages/idle',
  'pages/idle-detail',
  'pages/idle-order',
  'pages/idle-publish',
  'pages/health',
  'pages/health-record',
  'pages/diet-record',
  'pages/pet-raise',
  'pages/discover',
  'pages/index',
];

module.exports = {
  DISABLED_APP_PAGES,
  OFFLINE_PAGE_DIRS,
  /** 搜索、首页文案中的「商家」能力 */
  merchantSearch: false,
};
