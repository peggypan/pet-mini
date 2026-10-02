const ROLES = ['super', 'operator', 'moderator'];

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function normalizeRole(role) {
  const r = trim(role);
  return ROLES.includes(r) ? r : 'operator';
}

function publicAdmin(doc) {
  if (!doc) return null;
  const name = trim(doc.nickname) || trim(doc.name) || trim(doc.username);
  return {
    id: doc._id,
    username: trim(doc.username),
    name,
    nickname: trim(doc.nickname) || name,
    role: normalizeRole(doc.role),
    email: trim(doc.email),
    phone: trim(doc.phone),
    avatarUrl: trim(doc.avatarUrl),
    status: doc.status != null ? doc.status : 1,
    lastLoginAt: doc.lastLoginAt,
    createdAt: doc.createdAt,
  };
}

function pickAdminSavePayload(raw) {
  const p = raw || {};
  return {
    id: trim(p.id),
    username: trim(p.username),
    password: typeof p.password === 'string' ? p.password : '',
    nickname: trim(p.nickname) || trim(p.name),
    name: trim(p.name) || trim(p.nickname),
    email: trim(p.email),
    phone: trim(p.phone),
    avatarUrl: trim(p.avatarUrl),
    role: p.role != null ? normalizeRole(p.role) : '',
    status: p.status != null ? Number(p.status) : undefined,
  };
}

module.exports = {
  ROLES,
  publicAdmin,
  pickAdminSavePayload,
  normalizeRole,
};
