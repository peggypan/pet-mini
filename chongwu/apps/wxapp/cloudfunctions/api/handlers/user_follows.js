const { ok, fail } = require('../common/response');
const { userFollows, now } = require('../common/db');
const { requireUser } = require('../common/auth-user');

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

async function loadRelation(authOpenid, targetOpenid) {
  const [mine, theirs] = await Promise.all([
    userFollows()
      .where({ followerOpenid: authOpenid, targetOpenid, status: 1 })
      .limit(1)
      .get(),
    userFollows()
      .where({ followerOpenid: targetOpenid, targetOpenid: authOpenid, status: 1 })
      .limit(1)
      .get(),
  ]);
  const following = !!(mine.data && mine.data.length);
  const follower = !!(theirs.data && theirs.data.length);
  return {
    following,
    follower,
    mutual: following && follower,
  };
}

async function relation(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const targetOpenid = trim(payload && payload.targetOpenid);
  if (!targetOpenid) return fail(400, '缺少 targetOpenid');
  if (targetOpenid === auth.openid) {
    return ok({ following: false, follower: false, mutual: false });
  }

  return ok(await loadRelation(auth.openid, targetOpenid));
}

async function toggle(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const targetOpenid = trim(payload && payload.targetOpenid);
  if (!targetOpenid) return fail(400, '缺少 targetOpenid');
  if (targetOpenid === auth.openid) return fail(400, '不能关注自己');

  const profile = (payload && payload.profile) || {};
  const ts = now();
  const col = userFollows();
  const existing = await col
    .where({ followerOpenid: auth.openid, targetOpenid, status: 1 })
    .limit(1)
    .get();
  const row = existing.data && existing.data[0];

  if (row) {
    await col.doc(row._id).update({ data: { status: 0, updatedAt: ts } });
  } else {
    await col.add({
      data: {
        followerOpenid: auth.openid,
        _openid: auth.openid,
        targetOpenid,
        peerName: trim(profile.peerName) || trim(profile.userName) || '宠友',
        petName: trim(profile.petName) || '宠物',
        avatar: trim(profile.avatar),
        status: 1,
        createdAt: ts,
        updatedAt: ts,
      },
    });
  }

  const rel = await loadRelation(auth.openid, targetOpenid);
  return ok(rel);
}

module.exports = {
  relation,
  toggle,
};
