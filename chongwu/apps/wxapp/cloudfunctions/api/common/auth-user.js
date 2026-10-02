const { fail } = require('./response');
const { users } = require('./db');

async function requireUser(wxContext) {
  const openid = wxContext.OPENID;
  if (!openid) return { err: fail(401, '未登录') };
  const res = await users().where({ openid }).limit(1).get();
  const user = res.data[0];
  if (!user) return { err: fail(404, '用户不存在，请先 auth.login') };
  return { openid, user };
}

module.exports = { requireUser };
