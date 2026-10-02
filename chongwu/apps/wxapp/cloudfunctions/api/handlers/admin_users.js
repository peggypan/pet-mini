const { ok, fail } = require('../common/response');
const { adminUsers, now } = require('../common/db');
const { hashPassword } = require('../common/admin-password');
const { publicAdmin, pickAdminSavePayload, normalizeRole } = require('../common/admin-user-fields');
const { requireAdmin, requireSuperAdmin } = require('../common/auth-admin');

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

async function listFeed(payload, wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const limit = Math.min(100, Math.max(1, Number(payload && payload.limit) || 50));
  let rows = [];
  try {
    const res = await adminUsers().orderBy('createdAt', 'desc').limit(limit).get();
    rows = res.data || [];
  } catch (e) {
    const res = await adminUsers().limit(limit).get();
    rows = res.data || [];
  }

  return ok({ list: rows.map((d) => publicAdmin(d)).filter(Boolean) });
}

async function get(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const id = trim(payload && payload.id);
  if (!id) return fail(400, '缺少 id');
  if (auth.admin.role !== 'super' && id !== auth.adminId) {
    return fail(403, '无权查看该管理员');
  }

  try {
    const got = await adminUsers().doc(id).get();
    const doc = got.data;
    if (!doc || doc.status === 0) return fail(404, '管理员不存在');
    return ok({ admin: publicAdmin(doc) });
  } catch (e) {
    return fail(404, '管理员不存在');
  }
}

async function save(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const body = pickAdminSavePayload(payload);
  const isSuper = auth.admin.role === 'super';
  const targetId = body.id || auth.adminId;
  const editingSelf = targetId === auth.adminId;

  if (!isSuper && !editingSelf) {
    return fail(403, '仅超级管理员可维护其他账号');
  }
  if (!isSuper && (body.role || body.status != null)) {
    return fail(403, '无权修改角色或状态');
  }

  const ts = now();

  if (body.id) {
    let existing;
    try {
      const got = await adminUsers().doc(body.id).get();
      existing = got.data;
    } catch (e) {
      return fail(404, '管理员不存在');
    }
    if (!existing) return fail(404, '管理员不存在');

    const patch = {
      updatedAt: ts,
    };
    if (body.nickname) {
      patch.nickname = body.nickname;
      patch.name = body.nickname;
    }
    if (body.email) patch.email = body.email;
    if (body.phone) patch.phone = body.phone;
    if (body.avatarUrl) patch.avatarUrl = body.avatarUrl;
    if (isSuper && body.role) patch.role = normalizeRole(body.role);
    if (isSuper && (body.status === 0 || body.status === 1)) patch.status = body.status;
    if (body.password) patch.passwordHash = hashPassword(body.password);

    await adminUsers().doc(body.id).update({ data: patch });
    const got = await adminUsers().doc(body.id).get();
    return ok({ admin: publicAdmin(got.data) });
  }

  const superErr = requireSuperAdmin(auth);
  if (superErr) return superErr;

  if (!body.username) return fail(400, '缺少 username');
  if (!body.password) return fail(400, '新建管理员需设置 password');

  const dup = await adminUsers().where({ username: body.username }).limit(1).get();
  if (dup.data && dup.data.length) return fail(409, '用户名已存在');

  const addRes = await adminUsers().add({
    data: {
      username: body.username,
      passwordHash: hashPassword(body.password),
      nickname: body.nickname || body.username,
      name: body.nickname || body.username,
      email: body.email || '',
      phone: body.phone || '',
      avatarUrl: body.avatarUrl || '',
      role: body.role ? normalizeRole(body.role) : 'operator',
      status: body.status === 0 ? 0 : 1,
      createdAt: ts,
      updatedAt: ts,
    },
  });
  const got = await adminUsers().doc(addRes._id).get();
  return ok({ admin: publicAdmin(got.data) });
}

async function remove(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;
  const superErr = requireSuperAdmin(auth);
  if (superErr) return superErr;

  const id = trim(payload && payload.id);
  if (!id) return fail(400, '缺少 id');
  if (id === auth.adminId) return fail(400, '不能禁用当前登录账号');

  try {
    await adminUsers().doc(id).update({
      data: {
        status: 0,
        updatedAt: now(),
      },
    });
    return ok({ removed: true });
  } catch (e) {
    return fail(404, '管理员不存在');
  }
}

module.exports = {
  listFeed,
  get,
  save,
  remove,
};
