const META_LINE_RE = /^(地点|联系)[：:]/;

function stripMetaLinesFromContent(content) {
  const lines = String(content || '').split('\n');
  const kept = lines.filter((line) => !META_LINE_RE.test(String(line).trim()));
  return kept.join('\n').trim();
}

function parseContactFromContent(content) {
  const lines = String(content || '').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const m = String(lines[i]).trim().match(/^联系[：:]\s*(.+)$/);
    if (m) return m[1].trim();
  }
  return '';
}

function enrichPostLocationView(post) {
  if (!post) return post;
  const geo = post.geoLocation && typeof post.geoLocation === 'object' ? post.geoLocation : null;
  const lat = geo && geo.latitude != null ? Number(geo.latitude) : NaN;
  const lng = geo && geo.longitude != null ? Number(geo.longitude) : NaN;
  const hasMap = Number.isFinite(lat) && Number.isFinite(lng);
  const locationName = (geo && (geo.name || geo.address)) || post.location || '';
  const locationAddress = geo && geo.address && geo.address !== geo.name ? geo.address : '';
  const contactPhone = parseContactFromContent(post.content) || (post.contact || '').trim();
  const displayContent = stripMetaLinesFromContent(post.content);

  const mapMarkers = hasMap
    ? [{
      id: 1,
      latitude: lat,
      longitude: lng,
      width: 28,
      height: 28,
      callout: locationName
        ? { content: locationName, display: 'BYCLICK', padding: 6, borderRadius: 6 }
        : undefined,
    }]
    : [];

  return {
    ...post,
    content: displayContent,
    contactPhone,
    locationName,
    locationAddress,
    showLocationBlock: hasMap || (!!locationName && locationName !== '同城'),
    mapLatitude: hasMap ? lat : null,
    mapLongitude: hasMap ? lng : null,
    mapMarkers,
  };
}

module.exports = {
  enrichPostLocationView,
  stripMetaLinesFromContent,
  parseContactFromContent,
};
