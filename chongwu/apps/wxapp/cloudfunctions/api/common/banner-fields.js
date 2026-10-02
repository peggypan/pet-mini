function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function isWithinSchedule(doc, nowMs) {
  if (!doc) return false;
  const start = doc.startAt ? new Date(doc.startAt).getTime() : 0;
  const end = doc.endAt ? new Date(doc.endAt).getTime() : 0;
  if (start && nowMs < start) return false;
  if (end && nowMs > end) return false;
  return true;
}

function publicBanner(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  const link = trim(rest.link);
  return {
    id: _id,
    title: rest.title || '',
    type: rest.type || 'official',
    cover: rest.cover || '',
    link,
    url: link,
    subtitle: rest.subtitle || '',
    tag: rest.tag || '',
    sortOrder: rest.sortOrder != null ? rest.sortOrder : 0,
    city: rest.city || '',
  };
}

function sortBanners(rows) {
  return (rows || []).slice().sort((a, b) => {
    const sa = a.sortOrder != null ? a.sortOrder : 999;
    const sb = b.sortOrder != null ? b.sortOrder : 999;
    if (sa !== sb) return sa - sb;
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

module.exports = {
  publicBanner,
  sortBanners,
  isWithinSchedule,
};
