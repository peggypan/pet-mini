const crypto = require('crypto');
const { fail } = require('./response');
const { adminUsers } = require('./db');

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function adminTokenSecret() {
  return process.env.ADMIN_TOKEN_SECRET || 'chongwu-dev-admin-secret-change-me';
}

function signAdminToken(adminId) {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${adminId}:${expiresAt}`;
  const sig = crypto.createHmac('sha256', adminTokenSecret()).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

function verifyAdminToken(token) {
  const raw = typeof token === 'string' ? token.trim() : '';
  if (!raw) return { err: '缺少 adminToken' };
  let decoded;
  try {
    decoded = Buffer.from(raw, 'base64url').toString('utf8');
  } catch (e) {
    return { err: 'adminToken 无效' };
  }
  const parts = decoded.split(':');
  if (parts.length !== 3) return { err: 'adminToken 无效' };
  const [adminId, expStr, sig] = parts;
  const expiresAt = Number(expStr);
  if (!adminId || !expiresAt || !sig) return { err: 'adminToken 无效' };
  const payload = `${adminId}:${expiresAt}`;
  const expected = crypto.createHmac('sha256', adminTokenSecret()).update(payload).digest('hex');
  if (expected !== sig) return { err: 'adminToken 无效' };
  if (Date.now() > expiresAt) return { err: 'adminToken 已过期' };
  return { adminId, expiresAt };
}

function extractAdminToken(payload) {
  const p = payload || {};
  return trimToken(p.adminToken || p.token);
}

function trimToken(t) {
  return typeof t === 'string' ? t.trim() : '';
}

async function requireAdmin(payload) {
  const token = extractAdminToken(payload);
  const verified = verifyAdminToken(token);
  if (verified.err) return { err: fail(401, verified.err) };

  try {
    const got = await adminUsers().doc(verified.adminId).get();
    const admin = got.data;
    if (!admin || admin.status === 0) {
      return { err: fail(401, '管理员不存在或已禁用') };
    }
    return { admin, adminId: verified.adminId, adminToken: token };
  } catch (e) {
    return { err: fail(401, '管理员不存在或已禁用') };
  }
}

function requireSuperAdmin(auth) {
  if (!auth || !auth.admin) return fail(403, '需要超级管理员权限');
  if (auth.admin.role !== 'super') return fail(403, '需要超级管理员权限');
  return null;
}

module.exports = {
  TOKEN_TTL_MS,
  signAdminToken,
  verifyAdminToken,
  extractAdminToken,
  requireAdmin,
  requireSuperAdmin,
};
