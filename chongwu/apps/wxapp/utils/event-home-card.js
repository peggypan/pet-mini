const { MOCK_EVENTS } = require('./mock');

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

function parseJoined(seats) {
  const [a, b] = String(seats || '8/20').split('/');
  return { joined: Number(a) || 8, cap: Number(b) || 20 };
}

function buildEventHomeCard(event, index) {
  const meta = CARD_META[event.id] || {};
  const { joined } = parseJoined(event.seats);
  const played = joined * 42 + 680 + index * 120;
  const timeMatch = String(event.time || '').match(/(\d{1,2}:\d{2})/);
  const timeHint = meta.timeHint
    || `${event.tag || ''} ${timeMatch ? timeMatch[1] : ''}`.trim();

  return {
    ...event,
    cardDateMD: meta.dateMD || '9/16',
    cardTimeHint: timeHint,
    cardDistance: meta.distance || `${(2 + index * 1.3).toFixed(1)}km`,
    cardLocationLine: event.place || '',
    cardAvatars: [
      event.hostAvatar,
      AVATAR_POOL[index % AVATAR_POOL.length],
      AVATAR_POOL[(index + 1) % AVATAR_POOL.length],
      AVATAR_POOL[(index + 2) % AVATAR_POOL.length],
    ].filter(Boolean).slice(0, 4),
    cardPlayed: played,
    cardJoined: joined,
    cardCategory: meta.category || event.sourceText || '活动',
  };
}

function buildEventHomeCards(events) {
  return (events || MOCK_EVENTS).map((ev, i) => buildEventHomeCard(ev, i));
}

module.exports = {
  buildEventHomeCard,
  buildEventHomeCards,
};
