const cloudApi = require('./cloud-api');

function miniProgramEnvVersion() {
  try {
    const info = wx.getAccountInfoSync();
    return (info.miniProgram && info.miniProgram.envVersion) || 'release';
  } catch (e) {
    return 'release';
  }
}

function writeBase64Image(base64, prefix) {
  const path = `${wx.env.USER_DATA_PATH}/${prefix}_${Date.now()}.png`;
  wx.getFileSystemManager().writeFileSync(path, base64, 'base64');
  return path;
}

/**
 * 活动详情小程序码（scene = 活动 id，详情页 onLoad 解析 options.scene）
 */
async function fetchEventWxacodePath(eventId) {
  if (!cloudApi.cloudEnabled()) {
    throw new Error('云开发未启用');
  }
  const id = String(eventId || '').trim();
  if (!id) throw new Error('无效活动 id');
  if (id.length > 32) throw new Error('活动 id 过长，无法生成小程序码');

  const data = await cloudApi.callApi('system', 'getWxacode', {
    id,
    page: 'pages/event-detail/event-detail',
    envVersion: miniProgramEnvVersion(),
  });
  if (!data || !data.base64) throw new Error('小程序码生成失败');
  return writeBase64Image(data.base64, `wxa_event_${id.slice(0, 8)}`);
}

module.exports = {
  fetchEventWxacodePath,
  miniProgramEnvVersion,
};
