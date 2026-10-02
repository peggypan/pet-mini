const cloudApi = require('./cloud-api');

/**
 * 调用云函数检测集合是否已在控制台创建
 * @param {number|'all'} phase 1-6 或省略为全部 25 个
 */
async function checkCloudCollections(phase) {
  if (!cloudApi.cloudEnabled()) {
    return { ok: false, message: '未开启云开发（config/cloud-env.js useCloud）' };
  }
  const payload = phase && phase !== 'all' ? { phase: Number(phase) } : {};
  const data = await cloudApi.callApi('system', 'checkCollections', payload);
  return data;
}

module.exports = {
  checkCloudCollections,
};
