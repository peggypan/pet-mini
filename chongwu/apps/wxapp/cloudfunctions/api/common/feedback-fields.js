function trim(s) {
  return String(s || '').trim();
}

function pickFeedbackPayload(body) {
  const p = body || {};
  const images = Array.isArray(p.images)
    ? p.images.map((u) => trim(u)).filter(Boolean).slice(0, 6)
    : [];
  return {
    content: trim(p.content),
    contact: trim(p.contact),
    category: trim(p.category) || 'general',
    source: trim(p.source) || 'profile',
    images,
    appVersion: trim(p.appVersion),
  };
}

function validateFeedback(body) {
  if (!body.content || body.content.length < 5) {
    return '请填写至少 5 个字的反馈内容';
  }
  if (body.content.length > 2000) {
    return '反馈内容不能超过 2000 字';
  }
  if (body.contact && body.contact.length > 40) {
    return '联系方式过长';
  }
  return '';
}

module.exports = {
  pickFeedbackPayload,
  validateFeedback,
};
