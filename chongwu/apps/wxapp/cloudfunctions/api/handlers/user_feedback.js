const { ok, fail } = require('../common/response');
const { userFeedback, now } = require('../common/db');
const { requireUser } = require('../common/auth-user');
const { pickFeedbackPayload, validateFeedback } = require('../common/feedback-fields');

async function save(payload, wxContext) {
  const auth = await requireUser(wxContext);
  if (auth.err) return auth.err;

  const body = pickFeedbackPayload(payload);
  const msg = validateFeedback(body);
  if (msg) return fail(400, msg);

  const ts = now();
  const doc = {
    openid: auth.openid,
    userName: (auth.user && auth.user.nickname) || '宠友',
    ...body,
    status: 'pending',
    createdAt: ts,
    updatedAt: ts,
  };

  try {
    const res = await userFeedback().add({ data: doc });
    return ok({ id: res._id });
  } catch (e) {
    console.error('[user_feedback.save]', e);
    return fail(500, '提交失败，请稍后重试');
  }
}

module.exports = {
  save,
};
