/** 腾讯位置服务 WebService Key（与小程序 utils/amap-config 保持一致，上线建议改云函数环境变量） */
const TENCENT_MAP_KEY = process.env.TENCENT_MAP_KEY || '32YBZ-3MSEQ-6OA55-26ZZZ-NOUGJ-WEFNQ';

function isConfigured() {
  const key = (TENCENT_MAP_KEY || '').trim();
  return key.length >= 10 && !key.startsWith('YOUR_');
}

module.exports = {
  TENCENT_MAP_KEY,
  isConfigured,
};
