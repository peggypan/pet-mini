const { fail } = require('./response');
const { users, now } = require('./db');

async function requireUser(wxContext) {
  const openid = wxContext.OPENID;
  if (!openid) return { err: fail(401, '未登录') };

  const res = await users().where({ openid }).limit(1).get();
  let user = res.data[0];

  if (!user) {
    const nickname = `宠友${String(openid).slice(-4)}`;
    const ts = now();
    const addRes = await users().add({
      data: {
        openid,
        _openid: openid,
        nickname,
        bio: '',
        avatarUrl: '',
        phone: '',
        phoneMasked: '',
        city: '',
        district: '',
        deviceModel: '',
        ipRegion: '',
        points: 0,
        petCount: 0,
        status: 1,
        loginType: 'wechat',
        createdAt: ts,
        updatedAt: ts,
        lastLoginAt: ts,
      },
    });
    const got = await users().doc(addRes._id).get();
    user = got.data;
  }

  if (!user) return { err: fail(500, '用户初始化失败') };
  return { openid, user };
}

module.exports = { requireUser };
