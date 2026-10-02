function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function pickSignupPayload(raw) {
  const p = raw || {};
  return {
    eventId: trim(p.eventId),
    contactName: trim(p.contactName),
    phone: trim(p.phone),
    petName: trim(p.petName),
    petBreed: trim(p.petBreed),
  };
}

function validateSignup(body) {
  if (!body.eventId) return '缺少活动 id';
  if (body.phone && !/^1\d{10}$/.test(body.phone)) return '手机号格式不正确';
  return '';
}

function makeTicketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function publicSignup(doc, viewerOpenid) {
  if (!doc) return null;
  const { _id, _openid, ...rest } = doc;
  const isMine = viewerOpenid && (doc.openid === viewerOpenid || doc._openid === viewerOpenid);
  const title = rest.title || rest.eventTitle || '';
  return {
    id: _id,
    ...rest,
    title,
    eventTitle: rest.eventTitle || title,
    isMine: !!isMine,
    checkedIn: !!rest.checkedIn,
  };
}

function snapshotFromEvent(event, body) {
  const loc = event.location || {};
  return {
    title: event.title || '',
    eventTitle: event.title || '',
    place: event.place || '',
    placeAddress: event.placeAddress || '',
    location: event.location || null,
    locationLat: loc.latitude != null ? loc.latitude : '',
    locationLng: loc.longitude != null ? loc.longitude : '',
    time: event.time || '',
    fee: event.fee || '',
    cover: event.cover || '',
    contactName: body.contactName || '',
    phone: body.phone || '',
    petName: body.petName || '',
    petBreed: body.petBreed || '',
  };
}

module.exports = {
  pickSignupPayload,
  validateSignup,
  makeTicketCode,
  publicSignup,
  snapshotFromEvent,
};
