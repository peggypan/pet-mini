const cloudApi = require('./cloud-api');
const store = require('./store');

function signupApi(action, payload = {}) {
  if (typeof cloudApi.callApi !== 'function') {
    throw new Error('云 API 未就绪，请重新编译小程序');
  }
  return cloudApi.callApi('event_signups', action, payload);
}

function isApiNotImplemented(err) {
  if (!err) return false;
  if (err.code === 501) return true;
  return /未实现|501/.test(String(err.message || ''));
}

const CLOUD_DEPLOY_HINT = '请上传部署最新 cloudfunctions/api 云函数';

async function ensureCloudLogin() {
  const { refreshPetsFromCloud } = require('./pet-cloud-sync');
  try {
    const loginData = await cloudApi.login();
    if (loginData && loginData.token) {
      const app = getApp();
      app.globalData.token = loginData.token;
      app.globalData.userInfo = loginData.user;
      wx.setStorageSync('token', loginData.token);
      wx.setStorageSync('userInfo', loginData.user);
    }
  } catch (e) {
    // ignore
  }
  await refreshPetsFromCloud().catch(() => {});
}

async function refreshMySignupsFromCloud() {
  if (!cloudApi.cloudEnabled()) return store.listEventSignups();
  await ensureCloudLogin();
  try {
    const data = await signupApi('listMine');
    const list = (data && data.list) || [];
    return store.replaceAllSignupsFromCloud(list);
  } catch (e) {
    console.warn('[event-signup-cloud-sync] listMine', e);
    return store.listEventSignups();
  }
}

async function fetchMySignupByEvent(eventId) {
  if (!cloudApi.cloudEnabled() || !eventId) return store.getEventSignupByEventId(eventId);
  await ensureCloudLogin();
  try {
    const data = await signupApi('getMyByEvent', { eventId: String(eventId) });
    const signup = data && data.signup;
    if (signup) store.upsertSignupFromCloud(signup);
    return signup || null;
  } catch (e) {
    return store.getEventSignupByEventId(eventId);
  }
}

async function saveSignupToCloud(event, form) {
  if (!cloudApi.cloudEnabled()) {
    return store.addEventSignup(event, form);
  }
  await ensureCloudLogin();
  const body = {
    eventId: String(event.id),
    contactName: (form && form.contactName) || '',
    phone: (form && form.phone) || '',
    petName: (form && form.petName) || '',
    petBreed: (form && form.petBreed) || '',
    ...(form && form.petExtras ? form.petExtras : {}),
  };
  let data;
  try {
    data = await signupApi('save', body);
  } catch (e) {
    if (isApiNotImplemented(e)) {
      throw new Error(`${CLOUD_DEPLOY_HINT}（需 event_signups.save）`);
    }
    throw e;
  }
  const signup = data && data.signup;
  if (!signup) throw new Error('报名失败');

  store.upsertSignupFromCloud(signup);
  if (data.event && event.id) {
    store.upsertEventFromCloud({
      ...store.getEventFromCache(event.id),
      id: event.id,
      remain: data.event.remain,
      signupCount: data.event.signupCount,
      maxPeople: data.event.maxPeople,
      seats: data.event.seats,
    });
  }

  if (!data.duplicated) {
    const notice = store.buildEventSignupNotice(signup);
    store.pushMessage(notice.title, notice.content, 'event', {
      eventId: event.id,
      url: `/pages/event-detail/event-detail?id=${event.id}&ticket=1`,
    });
  }

  return { duplicated: !!data.duplicated, signup };
}

async function removeSignupFromCloud(idOrEventId, byEventId) {
  if (!cloudApi.cloudEnabled()) {
    store.removeSignupFromCache(idOrEventId, byEventId);
    return true;
  }
  const payload = byEventId ? { eventId: idOrEventId } : { id: idOrEventId };
  await signupApi('remove', payload);
  store.removeSignupFromCache(idOrEventId, byEventId);
  return true;
}

async function listSignupsByEventForHost(eventId) {
  if (!eventId) return [];
  if (!cloudApi.cloudEnabled()) {
    return store.listSignupsForEvent(eventId);
  }
  await ensureCloudLogin();
  try {
    const data = await signupApi('listByEvent', { eventId: String(eventId) });
    return (data && data.list) || [];
  } catch (e) {
    if (isApiNotImplemented(e)) {
      return store.listSignupsForEvent(eventId);
    }
    throw e;
  }
}

async function checkInSignupForHost(eventId, ticketCode) {
  if (!cloudApi.cloudEnabled()) {
    return store.checkInEventSignup(eventId, ticketCode);
  }
  await ensureCloudLogin();
  try {
    const data = await signupApi('checkIn', {
      eventId: String(eventId),
      ticketCode: String(ticketCode || '').trim(),
    });
    const signup = data && data.signup;
    if (signup) store.upsertSignupFromCloud(signup);
    return {
      ok: true,
      alreadyCheckedIn: !!(data && data.alreadyCheckedIn),
      signup,
      participantPet: (data && data.participantPet) || null,
    };
  } catch (e) {
    if (isApiNotImplemented(e)) {
      return {
        ok: false,
        reason: `${CLOUD_DEPLOY_HINT}（需 event_signups.checkIn）`,
      };
    }
    const msg = (e && e.message) || '核销失败';
    return { ok: false, reason: msg };
  }
}

module.exports = {
  refreshMySignupsFromCloud,
  fetchMySignupByEvent,
  saveSignupToCloud,
  removeSignupFromCloud,
  listSignupsByEventForHost,
  checkInSignupForHost,
};
