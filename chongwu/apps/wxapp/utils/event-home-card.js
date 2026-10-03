const { resolveEventQuota } = require('./event-quota');

const BASE = '/assets/mock';
const AVATAR_POOL = [
  `${BASE}/real_avatar.jpg`,
  `${BASE}/real_cat.jpg`,
  `${BASE}/real_pup.jpg`,
  `${BASE}/real_svc2.jpg`,
];

const CARD_META = {
  e1: { dateMD: '9/16', timeHint: '明天 10:00', distance: '3.2km', category: '遛狗社交' },
  e2: { dateMD: '9/17', timeHint: '后天 14:00', distance: '5.1km', category: '猫友聚会' },
  e3: { dateMD: '9/20', timeHint: '下周五 10:00', distance: '1.8km', category: '洗护体验' },
};

function formatDateMD(isoOrYmd) {
  if (!isoOrYmd) return '';
  const d = new Date(isoOrYmd);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  const m = String(isoOrYmd).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${Number(m[2])}/${Number(m[3])}`;
  return '';
}

function buildTimeHint(event) {
  const t = String(event.time || '').trim();
  if (t) return t.length > 28 ? `${t.slice(0, 28)}…` : t;
  const tag = event.tag || '';
  const timeMatch = tag.match(/(\d{1,2}:\d{2})/);
  return `${tag} ${timeMatch ? timeMatch[1] : ''}`.trim();
}

function buildEventHomeCard(event, index) {
  const meta = CARD_META[event.id] || {};
  const quota = resolveEventQuota(event);
  const cardJoined = quota.signupCount;
  const cardInterest = Math.max(0, Number(event.interestCount) || 0);
  const dateSrc = event.eventDate || event.publishedAt || event.createdAt;
  const timeHint = meta.timeHint || buildTimeHint(event);
  const signupAvatars = Array.isArray(event.signupAvatars)
    ? event.signupAvatars.filter(Boolean)
    : [];
  const cardAvatars = (signupAvatars.length
    ? signupAvatars
    : [event.hostAvatar, AVATAR_POOL[index % AVATAR_POOL.length]]
  ).slice(0, 4);

  return {
    ...event,
    ...quota,
    cardDateMD: meta.dateMD || formatDateMD(dateSrc) || formatDateMD(new Date()) || '今日',
    cardTimeHint: timeHint,
    cardDistance: meta.distance || `${(2 + index * 1.3).toFixed(1)}km`,
    cardLocationLine: event.place || '',
    cardAvatars,
    cardInterest,
    cardJoined,
    cardCategory: meta.category || event.category || event.sourceText || '活动',
  };
}

function buildEventHomeCards(events) {
  return (events || []).map((ev, i) => buildEventHomeCard(ev, i));
}

module.exports = {
  buildEventHomeCard,
  buildEventHomeCards,
};
