const store = require('./store');
const { MOCK_SOCIAL, MOCK_RESCUE } = require('./mock');

const KIND_LABEL = { lost: '寻宠', found: '招领', adopt: '领养' };

function pickCover(post) {
  if (post.image) return post.image;
  const media = post.mediaList;
  if (Array.isArray(media) && media[0] && media[0].url) return media[0].url;
  return '';
}

function pickLocation(post) {
  if (post.location) return post.location;
  if (post.geoLocation && post.geoLocation.name) return post.geoLocation.name;
  return '';
}

function buildRescueList() {
  const seenSocial = new Set();
  const items = [];

  const pushSocial = (p) => {
    if (!p || !p.lostType || seenSocial.has(String(p.id))) return;
    seenSocial.add(String(p.id));
    items.push({
      id: 's_' + p.id,
      source: 'social',
      refId: p.id,
      kind: p.lostType,
      tag: KIND_LABEL[p.lostType] || '寻宠',
      title: (p.userName || '宠友') + (p.petName ? ' · ' + p.petName : ''),
      preview: (p.content || '').replace(/\n/g, ' ').slice(0, 72),
      time: p.time || '刚刚',
      location: pickLocation(p),
      cover: pickCover(p),
    });
  };

  try {
    store.listSocialPosts().forEach(pushSocial);
  } catch (e) {
    /* wx 未就绪时忽略 */
  }

  (MOCK_SOCIAL.posts || []).forEach(pushSocial);

  try {
    store.listLocalPosts('adopt').forEach((p) => {
      items.push({
        id: 'l_' + p.id,
        source: 'local',
        refId: p.id,
        kind: 'adopt',
        tag: '领养',
        title: p.title || '领养信息',
        preview: (p.desc || '').slice(0, 72),
        time: p.time || '刚刚',
        location: '',
        contact: p.contact || '',
        desc: p.desc || '',
      });
    });
  } catch (e) {
    /* ignore */
  }

  (MOCK_RESCUE || []).forEach((p) => {
    if (items.some((x) => x.id === p.id)) return;
    items.push({
      id: p.id,
      source: p.source || 'mock',
      refId: p.refId || '',
      kind: p.kind || 'adopt',
      tag: p.tag || KIND_LABEL[p.kind] || '领养',
      title: p.title || '',
      preview: p.preview || '',
      time: p.time || '刚刚',
      location: p.location || '',
      contact: p.contact || '',
      desc: p.desc || p.preview || '',
      cover: p.cover || '',
    });
  });

  return items;
}

function filterRescueList(list, filter) {
  if (filter === 'all') return list;
  return list.filter((x) => x.kind === filter);
}

module.exports = {
  buildRescueList,
  filterRescueList,
};
