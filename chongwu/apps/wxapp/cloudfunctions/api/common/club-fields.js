function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function pickClubPayload(raw) {
  const p = raw || {};
  return {
    name: trim(p.name),
    city: trim(p.city),
    intro: trim(p.intro),
    cover: trim(p.cover),
    memberCount: p.memberCount != null ? Number(p.memberCount) : undefined,
    eventCount: p.eventCount != null ? Number(p.eventCount) : undefined,
    onlineStatus: p.onlineStatus,
    sourceApplyId: trim(p.sourceApplyId),
  };
}

function validateClub(body, isUpdate) {
  if (!body.name) return '请填写俱乐部名称';
  if (!body.city) return '请填写城市';
  if (!body.intro) return '请填写俱乐部介绍';
  if (!isUpdate && !body.cover) return '请上传封面';
  if (isUpdate && body.cover === '') return '封面不能为空';
  return '';
}

function publicClub(doc, viewerOpenid) {
  if (!doc) return null;
  const { _id, _openid, ...rest } = doc;
  const isOwner = viewerOpenid && (doc.openid === viewerOpenid || doc._openid === viewerOpenid);
  const memberCount = rest.memberCount != null ? rest.memberCount : 0;
  const onlineStatus = rest.onlineStatus || 'pending';
  return {
    id: _id,
    ...rest,
    owner: rest.ownerNickname || '主理人',
    members: memberCount,
    memberCount,
    eventCount: rest.eventCount != null ? rest.eventCount : 0,
    onlineStatus,
    status: onlineStatus === 'online' ? 'approved' : onlineStatus,
    isMine: !!isOwner,
    isOwner: !!isOwner,
  };
}

module.exports = {
  pickClubPayload,
  validateClub,
  publicClub,
};
