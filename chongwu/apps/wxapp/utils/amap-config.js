/**
 * 高德地图 · Web 服务 Key
 * 1. 登录 https://console.amap.com 创建应用
 * 2. 添加 Key（Web 服务）并绑定小程序 AppID
 * 3. 在微信公众平台 → 开发 → 开发管理 → 服务器域名，添加 request 合法域名：
 *    https://restapi.amap.com
 */

const AMAP_WEB_KEY = 'YOUR_AMAP_WEB_SERVICE_KEY';

function isAmapConfigured() {
  return AMAP_WEB_KEY && AMAP_WEB_KEY !== 'YOUR_AMAP_WEB_SERVICE_KEY';
}

module.exports = {
  AMAP_WEB_KEY,
  isAmapConfigured,
};
