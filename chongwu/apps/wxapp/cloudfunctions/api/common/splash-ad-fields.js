const { isWithinSchedule } = require('./banner-fields');

const LINK_TYPES = ['none', 'miniPage', 'h5'];
const SHOW_RULES = ['everyLaunch', 'oncePerDay', 'oncePerUser'];
const STATUSES = ['draft', 'online', 'offline'];

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function publicSplashAd(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  const linkType = LINK_TYPES.includes(rest.linkType) ? rest.linkType : 'none';
  const linkTarget = trim(rest.linkTarget);
  return {
    id: _id,
    name: rest.name || '',
    imageUrl: rest.imageUrl || '',
    linkType,
    linkTarget,
    url: linkType === 'miniPage' ? linkTarget : '',
    durationSec: Math.max(1, Number(rest.durationSec) || 5),
    skippable: rest.skippable !== false,
    skipAfterSec: Math.max(0, Number(rest.skipAfterSec) || 0),
    showRule: SHOW_RULES.includes(rest.showRule) ? rest.showRule : 'oncePerDay',
    sortOrder: rest.sortOrder != null ? rest.sortOrder : 0,
    status: rest.status || 'draft',
    startAt: rest.startAt,
    endAt: rest.endAt,
  };
}

function sortSplashAds(rows) {
  return (rows || []).slice().sort((a, b) => {
    const sa = a.sortOrder != null ? a.sortOrder : 0;
    const sb = b.sortOrder != null ? b.sortOrder : 0;
    if (sb !== sa) return sb - sa;
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  });
}

function filterOnlineScheduled(rows, nowMs) {
  return (rows || []).filter(
    (d) => d.status === 'online' && isWithinSchedule(d, nowMs),
  );
}

module.exports = {
  publicSplashAd,
  sortSplashAds,
  filterOnlineScheduled,
  LINK_TYPES,
  SHOW_RULES,
  STATUSES,
};
