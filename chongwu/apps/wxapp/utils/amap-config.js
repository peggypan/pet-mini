/**
 * 腾讯位置服务 · WebService Key
 * 1. 登录 https://lbs.qq.com 控制台创建应用
 * 2. 启用 WebServiceAPI，创建 Key 并绑定小程序 AppID
 * 3. 微信公众平台 → 开发 → 开发管理 → 服务器域名，request 合法域名添加：
 *    https://apis.map.qq.com
 *
 * 小程序内 <map>、wx.chooseLocation、wx.openLocation 均为腾讯地图能力。
 */

const PLACEHOLDER_KEY = 'YOUR_TENCENT_MAP_KEY';

/** 只改这一行的值为控制台复制的 Key；不要改 isTencentMapConfigured 的判断逻辑 */
const TENCENT_MAP_KEY = '32YBZ-3MSEQ-6OA55-26ZZZ-NOUGJ-WEFNQ';

function isTencentMapConfigured() {
  const key = (TENCENT_MAP_KEY || '').trim();
  return key.length >= 10 && key !== PLACEHOLDER_KEY && !key.startsWith('YOUR_');
}

/** @deprecated 请使用 isTencentMapConfigured */
function isAmapConfigured() {
  return isTencentMapConfigured();
}

module.exports = {
  TENCENT_MAP_KEY,
  isTencentMapConfigured,
  isAmapConfigured,
};
