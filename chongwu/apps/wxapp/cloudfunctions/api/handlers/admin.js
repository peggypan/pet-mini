const { ok, fail } = require('../common/response');
const { adminUsers, hostApplies, clubs, now } = require('../common/db');
const { upsertClubFromHostApply } = require('../common/club-from-apply');
const { publicHostApply } = require('../common/host-apply-fields');
const { publicClub } = require('../common/club-fields');
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

async function reviewHostApply(payload, _wxContext) {
  const auth = await requireAdmin(payload);
  if (auth.err) return auth.err;

  const applyId = trim(payload && payload.applyId);
  const decision = trim(payload && payload.decision);
  const rejectReason = trim(payload && payload.rejectReason);

  if (!applyId) return fail(400, '缺少 applyId');
  if (decision !== 'approve' && decision !== 'reject') {
    return fail(400, 'decision 须为 approve 或 reject');
  }

  let doc = null;
  try {
    const got = await hostApplies().doc(applyId).get();
    doc = got.data;
  } catch (e) {
    return fail(404, '申请不存在');
  }
  if (!doc || doc.userDeleted || doc.status === 0) return fail(404, '申请不存在');

  if (decision === 'reject') {
    await hostApplies().doc(applyId).update({
      data: {
        auditStatus: 'rejected',
        rejectReason: rejectReason || '未通过审核',
        updatedAt: now(),
      },
    });
    if (doc.clubId) {
      try {
        await clubs().doc(String(doc.clubId)).update({
          data: { onlineStatus: 'offline', updatedAt: now() },
        });
      } catch (e) {
        // ignore
      }
    }
    const after = await hostApplies().doc(applyId).get();
    return ok({ apply: publicHostApply(after.data, doc.openid) });
  }

  const pseudoAuth = {
    openid: doc.openid || doc._openid,
    user: { _id: doc.userId, nickname: doc.userName || '主理人' },
  };
  const synced = await upsertClubFromHostApply(doc, pseudoAuth, { makeOnline: true });
  if (!synced) return fail(500, '创建俱乐部失败');

  const afterApply = await hostApplies().doc(applyId).get();
  return ok({
    apply: publicHostApply(afterApply.data, doc.openid),
    club: publicClub(synced.clubDoc, doc.openid),
    clubId: synced.clubId,
  });
}

module.exports = {
  login,
  me,
  reviewHostApply,
};
