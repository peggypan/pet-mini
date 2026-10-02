const { listAllBuddies, listAllMapPoints, listAllEvents } = require('./catalog');
const { MOCK_MERCHANTS } = require('./mock');

function norm(text) {
  return String(text || '').toLowerCase().trim();
}

function haystack(item, fields) {
  return fields
    .map((f) => item[f])
    .concat(Array.isArray(item.tags) ? item.tags : [])
    .map(norm)
    .join(' ');
}

function filterByKeyword(list, fields, keyword) {
  const k = norm(keyword);
  if (!k) return [];
  return list.filter((item) => haystack(item, fields).includes(k));
}

function searchAll(keyword) {
  const k = norm(keyword);
  if (!k) {
    return { buddies: [], events: [], points: [], merchants: [] };
  }

  const buddies = filterByKeyword(
    listAllBuddies(),
    ['userName', 'petName', 'buddyType', 'breed', 'desc', 'expectPlace', 'personality', 'distance'],
    k,
  ).slice(0, 30);

  const events = filterByKeyword(
    listAllEvents(),
    ['title', 'place', 'desc', 'host', 'tag', 'fee', 'require', 'category', 'publisherName'],
    k,
  ).slice(0, 30);

  const points = filterByKeyword(
    listAllMapPoints(),
    ['name', 'type', 'address', 'city', 'distance'],
    k,
  ).slice(0, 30);

  const merchants = filterByKeyword(
    MOCK_MERCHANTS,
    ['name', 'category', 'price'],
    k,
  ).slice(0, 30);

  return { buddies, events, points, merchants };
}

module.exports = {
  searchAll,
};
