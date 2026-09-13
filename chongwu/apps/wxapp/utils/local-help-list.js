const store = require('./store');
const { MOCK_HELP } = require('./mock');

function buildHelpPosts() {
  const items = [];
  const seen = new Set();

  try {
    store.listLocalPosts('help').forEach((p) => {
      const id = 'l_' + p.id;
      if (seen.has(id)) return;
      seen.add(id);
      items.push({
        id,
        refId: p.id,
        source: 'local',
        title: p.title || '互助需求',
        preview: (p.desc || '').slice(0, 72),
        contact: p.contact || '',
        desc: p.desc || '',
        time: p.time || '刚刚',
      });
    });
  } catch (e) {
    /* ignore */
  }

  (MOCK_HELP || []).forEach((p) => {
    if (seen.has(p.id)) return;
    seen.add(p.id);
    items.push({ ...p, source: p.source || 'mock' });
  });

  return items;
}

module.exports = {
  buildHelpPosts,
};
