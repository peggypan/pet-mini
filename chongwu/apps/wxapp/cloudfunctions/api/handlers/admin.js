const { ok, fail } = require('../common/response');
const { adminUsers, now } = require('../common/db');
const { hashPassword, verifyPassword } = require('../common/admin-password');
const { publicAdmin } = require('../common/admin-user-fields');
const { signAdminToken, requireAdmin } = require('../common/auth-admin');

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

const BOOTSTRAP_USERNAME = 'admin';
const BOOTSTRAP_PASSWORD = 'demo';

async function countAdmins() {
  try {
    const res = await adminUsers().count();
    return (res && res.total) || 0;
  } catch (e) {
    const res = await adminUsers().limit(1).get();
    return (res.data && res.data.length) || 0;
  }
}

async function bootstrapFirstAdmin(username, password) {
  const total = await countAdmins();
  if (total > 0) return null;
  if (username !== BOOTSTRAP_USERNAME || password !== BOOTSTRAP_PASSWORD) {
    return fail(401, '账号或密码错误');
  }
  const ts = now();
  const addRes = await adminUsers().add({
    data: {
      username: BOOTSTRAP_USERNAME,
      passwordHash: hashPassword(BOOTSTRAP_PASSWORD),
      nickname: '超级管理员',
      name: '超级管理员',
      role: 'super',
      status: 1,
      createdAt: ts,
      updatedAt: ts,
      lastLoginAt: ts,
    },
  });
  const got = await adminUsers().doc(addRes._id).get();
  return got.data;
}

async function login(payload, _wxContext) {
  const username = trim(payload && payload.username);
  const password = payload && payload.password;
  if (!username || !password) return fail(400, '请输入账号和密码');

  let doc = null;
  const res = await adminUsers().where({ username }).limit(1).get();
  doc = (res.data && res.data[0]) || null;

  if (!doc) {
    const boot = await bootstrapFirstAdmin(username, password);
    if (boot && boot.code != null) return boot;
    if (boot) doc = boot;
  }

  if (!doc || doc.status === 0) return fail(401, '账号或密码错误');
  if (!verifyPassword(password, doc.passwordHash)) return fail(401, '账号或密码错误');

  await adminUsers().doc(doc._id).update({
    data: {
      lastLoginAt: now(),
      updatedAt: now(),
    },
  });

  const token = signAdminToken(doc._id);
  return ok({
    token,
    adminToken: token,
    admin: publicAdmin(doc),
  });
}

async function me(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  return ok({ admin: publicAdmin(auth.admin) });
}

module.exports = {
  login,
  me,
};
