const { speciesLabel } = require('./pet-species');

/** @returns {1|2|3|4} */
function resolveBuddySpeciesCode(peer) {
  if (!peer) return 3;
  const num = Number(peer.species);
  if (num >= 1 && num <= 4) return num;
  const label = String(peer.petSpecies || '').trim();
  if (label === '狗') return 2;
  if (label === '猫') return 1;
  if (label === '异宠') return 4;
  if (label === '其他') return 3;
  const bt = String(peer.buddyType || '');
  if (/狗|遛/.test(bt)) return 2;
  if (/猫/.test(bt)) return 1;
  if (/异宠|爬|鸟|兔|仓鼠|守宫|蛇|龙猫|刺猬/.test(bt)) return 4;
  return 3;
}

const FILTER_KEYS = ['all', 'dog', 'cat', 'exotic'];

function speciesToFilterKey(code) {
  if (code === 2) return 'dog';
  if (code === 1) return 'cat';
  if (code === 4 || code === 3) return 'exotic';
  return 'exotic';
}

function filterKeyLabel(key) {
  if (key === 'dog') return '狗搭子';
  if (key === 'cat') return '猫搭子';
  if (key === 'exotic') return '异宠搭子';
  return '全部';
}

function peerMatchesFilter(peer, filterKey) {
  if (!filterKey || filterKey === 'all') return true;
  return speciesToFilterKey(resolveBuddySpeciesCode(peer)) === filterKey;
}

function filterPeersBySpecies(peers, filterKey) {
  return (peers || []).filter((p) => peerMatchesFilter(p, filterKey));
}

function countPeersBySpecies(peers) {
  const list = peers || [];
  const counts = { all: list.length, dog: 0, cat: 0, exotic: 0 };
  list.forEach((p) => {
    const fk = speciesToFilterKey(resolveBuddySpeciesCode(p));
    if (counts[fk] != null) counts[fk] += 1;
  });
  return counts;
}

const MARKER_LABEL = {
  2: { content: '狗', bgColor: '#4A90E2', color: '#FFFFFF', borderColor: '#357ABD' },
  1: { content: '猫', bgColor: '#FF9F43', color: '#FFFFFF', borderColor: '#E8892F' },
  4: { content: '异宠', bgColor: '#9B59B6', color: '#FFFFFF', borderColor: '#8E44AD' },
  3: { content: '其他', bgColor: '#7F8C8D', color: '#FFFFFF', borderColor: '#636E72' },
};

function markerLabelForPeer(peer) {
  const code = resolveBuddySpeciesCode(peer);
  const style = MARKER_LABEL[code] || MARKER_LABEL[3];
  const speciesName = speciesLabel(code) || style.content;
  return {
    ...style,
    speciesCode: code,
    speciesName,
    dockClass: code === 2 ? 'species-dog' : code === 1 ? 'species-cat' : 'species-exotic',
  };
}

function buildMarkerLabelStyle(peer) {
  const meta = markerLabelForPeer(peer);
  return {
    content: meta.content,
    color: meta.color,
    fontSize: 11,
    anchorX: 0,
    anchorY: -52,
    borderWidth: 1,
    borderColor: meta.borderColor,
    borderRadius: 6,
    bgColor: meta.bgColor,
    padding: 3,
    textAlign: 'center',
  };
}

module.exports = {
  FILTER_KEYS,
  resolveBuddySpeciesCode,
  speciesToFilterKey,
  filterKeyLabel,
  filterPeersBySpecies,
  countPeersBySpecies,
  peerMatchesFilter,
  markerLabelForPeer,
  buildMarkerLabelStyle,
};
