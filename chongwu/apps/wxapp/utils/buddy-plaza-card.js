function formatDistanceLabel(dist) {
  if (!dist) return '距您 —';
  const s = String(dist).trim();
  if (s.startsWith('距您')) return s;
  return `距您${s}`;
}

function isVideoSrc(src) {
  const s = String(src || '').toLowerCase();
  return /\.(mp4|mov|m4v|webm|avi)(\?|$)/.test(s);
}

function buildBuddyPlazaCard(buddy) {
  const media = buddy.mediaList && buddy.mediaList[0];
  const coverIsVideo = !!(media && media.type === 'video');
  const coverVideoUrl = coverIsVideo ? (media.url || '') : '';
  const rawPoster = coverIsVideo ? (media.poster || buddy.cover || '') : '';
  const coverPoster = rawPoster && !isVideoSrc(rawPoster) && rawPoster !== coverVideoUrl
    ? rawPoster
    : '';
  const cover = coverIsVideo
    ? (coverPoster || buddy.avatar || '')
    : ((media && media.url) || buddy.cover || buddy.avatar);
  const tagList = [...(buddy.tags || []), ...(buddy.creditTags || [])].filter(Boolean).slice(0, 2);
  const intro = (buddy.desc || buddy.personality || '').trim();
  return {
    id: buddy.id,
    cover,
    coverPoster,
    coverVideoUrl,
    coverIsVideo,
    userName: buddy.userName,
    petName: buddy.petName,
    titleLine: `${buddy.userName} · ${buddy.petName}`,
    breed: buddy.breed,
    age: buddy.age,
    buddyType: buddy.buddyType,
    distanceLabel: formatDistanceLabel(buddy.distance),
    verified: buddy.verified,
    personality: buddy.personality,
    intro,
    tags: tagList,
    petLine: [buddy.breed, buddy.age, buddy.personality].filter(Boolean).join(' · '),
    expectPlace: buddy.expectPlace || '',
    expectPlaceAddress: buddy.expectPlaceAddress || (buddy.location && buddy.location.address) || '',
    placeLat: (buddy.location && buddy.location.latitude) || buddy.latitude || '',
    placeLng: (buddy.location && buddy.location.longitude) || buddy.longitude || '',
  };
}

module.exports = {
  formatDistanceLabel,
  buildBuddyPlazaCard,
};
