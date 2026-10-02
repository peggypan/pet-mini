const cloud = require('wx-server-sdk');
const { ok, fail } = require('../common/response');

const VERSION = '0.1.0';

async function ping() {
  return ok({
    version: VERSION,
    time: new Date().toISOString(),
    message: '云开发 API 已连通',
  });
}

/**
 * 无数量限制小程序码（海报、分享）
 * scene 最多 32 字符；page 不含 query，参数放 scene
 */
async function getWxacode(payload) {
  const page = (payload && payload.page) || 'pages/event-detail/event-detail';
  let scene = trim(payload && payload.scene);
  if (!scene && payload && payload.id) {
    scene = trim(payload.id);
  }
  if (!scene) return fail(400, '缺少 scene 或 id');
  if (scene.length > 32) {
    return fail(400, 'scene 不能超过 32 字符');
  }

  const envVersion = (payload && payload.envVersion) || 'release';
  const allowed = ['develop', 'trial', 'release'];
  const ver = allowed.includes(envVersion) ? envVersion : 'release';

  try {
    const res = await cloud.openapi.wxacode.getUnlimited({
      scene,
      page,
      checkPath: false,
      envVersion: ver,
    });
    const buffer = res.buffer;
    if (!buffer) return fail(500, '小程序码生成失败');
    return ok({
      base64: buffer.toString('base64'),
      contentType: res.contentType || 'image/png',
      scene,
      page,
    });
  } catch (e) {
    console.error('[system.getWxacode]', e);
    return fail(500, e.message || '小程序码生成失败');
  }
}

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

module.exports = { ping, getWxacode };
