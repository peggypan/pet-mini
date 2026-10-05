const store = require('./store');
const { displayPublishTime, pickPublishInstant } = require('./relative-time');
const { displayUserNickName } = require('./display-user-nick');
const cloudApi = require('./cloud-api');
const { MOCK_SOCIAL, MOCK_RESCUE } = require('./mock');

const KIND_LABEL = { lost: '寻宠', found: '招领', rescue: '救助', adopt: '领养' };

const KIND_DEFAULT_COVER = {
  lost: '/assets/mock/real_pup.jpg',
  found: '/assets/mock/real_tall_dog.jpg',
  rescue: '/assets/mock/helper1.png',
  adopt: '/assets/mock/real_cat.jpg',
};

function isDisplayableCoverUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('cloud://')) return false;
  return true;
}

function pickCover(post) {
  if (isDisplayableCoverUrl(post.image)) return post.image;
  const media = post.mediaList;
  if (Array.isArray(media)) {
    for (let i = 0; i < media.length; i += 1) {
      const m = media[i];
      if (m && isDisplayableCoverUrl(m.poster)) return m.poster;
      if (m && isDisplayableCoverUrl(m.url)) return m.url;
    }
  }
  if (Array.isArray(post.images)) {
    const hit = post.images.find(isDisplayableCoverUrl);
    if (hit) return hit;
  }
  return '';
}

function resolveCover(kind, post) {
  return pickCover(post) || KIND_DEFAULT_COVER[kind] || KIND_DEFAULT_COVER.lost;
}

function pickLocation(post) {
  if (post.geoLocation && post.geoLocation.name) return post.geoLocation.name;
  if (post.location) return post.location;
  return '';
}

function pickGeo(post) {
  const g = post.geoLocation || {};
  return {
    location: pickLocation(post),
    locationName: g.name || post.location || '',
    locationAddress: g.address || '',
    locationLat: g.latitude || '',
    locationLng: g.longitude || '',
  };
}

function postSortTime(post) {
  const d = pickPublishInstant(post);
  return d ? d.getTime() : 0;
}

function buildRescueList() {
  const seenSocial = new Set();
  const items = [];

  const pushSocial = (p) => {
    if (!p || !p.lostType || seenSocial.has(String(p.id))) return;
    if (cloudApi.cloudEnabled() && p.lostType === 'adopt') return;
    seenSocial.add(String(p.id));
    items.push({
      id: 's_' + p.id,
      source: 'social',
      refId: p.id,
      kind: p.lostType,
      tag: KIND_LABEL[p.lostType] || '寻宠',
      authorLine: displayUserNickName({ ...p, isMine: store.isMyUserContent(p) }),
      preview: (p.title || (p.content || '').replace(/\n/g, ' ')).trim().slice(0, 72),
      time: displayPublishTime(p) || p.time || '',
      sortAt: postSortTime(p),
      ...pickGeo(p),
      cover: resolveCover(p.lostType, p),
    });
  };

  try {
    store.listSocialPosts().forEach(pushSocial);
  } catch (e) {
    /* wx 未就绪时忽略 */
  }

  if (!cloudApi.cloudEnabled()) {
    (MOCK_SOCIAL.posts || []).forEach(pushSocial);
  }

  try {
    store.listLocalPosts().forEach((p) => {
      const kind = p.type || 'adopt';
      items.push({
        id: 'l_' + p.id,
        source: 'local',
        refId: p.id,
        kind,
        tag: KIND_LABEL[kind] || '同城',
        authorLine: displayUserNickName({ ...p, isMine: store.isMyUserContent(p) }),
        preview: (p.title || p.desc || '').slice(0, 72),
        time: displayPublishTime(p) || p.time || '',
        sortAt: postSortTime(p),
        ...pickGeo(p),
        contact: p.contact || '',
        desc: p.desc || '',
        cover: resolveCover(kind, p),
      });
    });
  } catch (e) {
    /* ignore */
  }

  if (!cloudApi.cloudEnabled()) {
    (MOCK_RESCUE || []).forEach((p) => {
      if (items.some((x) => x.id === p.id)) return;
      items.push({
        id: p.id,
        source: p.source || 'mock',
        refId: p.refId || '',
        kind: p.kind || 'adopt',
        tag: p.tag || KIND_LABEL[p.kind] || '领养',
        authorLine: displayUserNickName(p) || p.userName || '',
        preview: p.preview || p.title || '',
        time: displayPublishTime(p) || p.time || '',
        sortAt: postSortTime(p),
        location: p.location || '',
        locationName: p.location || '',
        locationAddress: p.locationAddress || '',
        locationLat: p.locationLat || '',
        locationLng: p.locationLng || '',
        contact: p.contact || '',
        desc: p.desc || p.preview || '',
        cover: p.cover || resolveCover(p.kind || 'adopt', p),
      });
    });
  }

  items.sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0));

  return items.map((item) => {
    let canDelete = false;
    if (item.source === 'social' && item.refId) {
      const p = store.getSocialPost(item.refId);
      canDelete = store.isMyUserContent(p);
    } else if (item.source === 'local' && item.refId) {
      const p = store.getLocalPost(item.refId);
      canDelete = store.isMyUserContent(p);
    }
    const { sortAt, ...rest } = item;
    return { ...rest, canDelete };
  });
}

function filterRescueList(list, filter) {
  if (filter === 'all') return list;
  return list.filter((x) => x.kind === filter);
}

module.exports = {
  buildRescueList,
  filterRescueList,
};
