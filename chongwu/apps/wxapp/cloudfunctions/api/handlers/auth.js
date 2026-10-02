const cloud = require('wx-server-sdk');
const { ok, fail } = require('../common/response');
const { users, now } = require('../common/db');

function publicUser(doc) {
  if (!doc) return null;
  return {
    id: doc._id,
    openid: doc.openid || doc._openid || '',
    nickname: doc.nickname || '宠友',
    avatarUrl: doc.avatarUrl || '',
    phone: doc.phone || '',
    phoneMasked: doc.phoneMasked || doc.phone || '',
    city: doc.city || '',
    loginType: doc.loginType || 'wechat',
  };
}

async function login(_payload, wxContext) {
  const openid = wxContext.OPENID;
  if (!openid) {
    return fail(401, '无法获取 openid，请从小程序端调用云函数');
  }

  const col = users();
  const existing = await col.where({ openid }).limit(1).get();
  let doc = existing.data[0];

  if (!doc) {
    const nickname = `宠友${String(openid).slice(-4)}`;
    const addRes = await col.add({
      data: {
        openid,
        _openid: openid,
        nickname,
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
        createdAt: now(),
        updatedAt: now(),
        lastLoginAt: now(),
      },
    });
    const got = await col.doc(addRes._id).get();
    doc = got.data;
  } else {
    await col.doc(doc._id).update({
      data: {
        lastLoginAt: now(),
        updatedAt: now(),
      },
    });
  }

  const token = `cloud_${doc._id}`;
  return ok({
    token,
    user: publicUser(doc),
  });
}

async function me(_payload, wxContext) {
  const openid = wxContext.OPENID;
  if (!openid) return fail(401, '未登录');

  const res = await users().where({ openid }).limit(1).get();
  const doc = res.data[0];
  if (!doc) return fail(404, '用户不存在，请先 login');
  return ok({ user: publicUser(doc) });
}

/**
 * 手机号：小程序 getPhoneNumber 的 code，需云函数 openapi
 */
async function bindPhone(payload, wxContext) {
  const openid = wxContext.OPENID;
  if (!openid) return fail(401, '未登录');
  const phoneCode = payload && payload.phoneCode;
  if (!phoneCode) return fail(400, '缺少 phoneCode');

  let phone = '';
  try {
    const phoneRes = await cloud.openapi.phonenumber.getPhoneNumber({ code: phoneCode });
    phone = (phoneRes.phoneInfo && phoneRes.phoneInfo.phoneNumber) || '';
  } catch (e) {
    return fail(502, '获取手机号失败', String(e.message || e));
  }

  if (!phone) return fail(502, '微信未返回手机号');

  const masked = `${phone.slice(0, 3)}****${phone.slice(-4)}`;
  const res = await users().where({ openid }).limit(1).get();
  const doc = res.data[0];
  if (!doc) return fail(404, '用户不存在');

  await users().doc(doc._id).update({
    data: {
      phone,
      phoneMasked: masked,
      loginType: 'phone',
      updatedAt: now(),
    },
  });

  const got = await users().doc(doc._id).get();
  const token = `cloud_${doc._id}`;
  return ok({
    token,
    user: publicUser(got.data),
  });
}

module.exports = {
  login,
  me,
  bindPhone,
};
