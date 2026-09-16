const store = require('./store');
const { listAllBuddies } = require('./catalog');
const { buildPetAvatarMarkers } = require('./pet-map-markers');

function collectMapPeers(posts) {
  const map = new Map();
  listAllBuddies().forEach((b) => {
    map.set(String(b.id), {
      peerId: b.id,
      userName: b.userName,
      petName: b.petName,
      avatar: b.avatar,
    });
  });
  (posts || []).forEach((p) => {
    const peerId = p.userId || `u_${p.userName || p.id}`;
    if (map.has(String(peerId))) return;
    map.set(String(peerId), {
      peerId,
      userName: p.userName,
      petName: p.petName,
      avatar: p.avatar,
    });
  });
  return Array.from(map.values());
}

function loadPetMap(page, options) {
  const posts = (options && options.posts) || [];
  const loc = store.getCityLocation();
  let latitude = loc.lat || 39.9042;
  let longitude = loc.lng || 116.4074;

  const apply = () => {
    const peers = collectMapPeers(posts);
    const markers = buildPetAvatarMarkers(peers, latitude, longitude);
    page.setData({
      mapLatitude: latitude,
      mapLongitude: longitude,
      mapMarkers: markers,
      mapPeerCount: peers.length,
      mapPeers: peers,
    });
  };

  wx.getLocation({
    type: 'gcj02',
    success: (res) => {
      latitude = res.latitude;
      longitude = res.longitude;
      apply();
    },
    fail: () => apply(),
  });
}

function openPeerChat(peer) {
  if (!peer || peer.peerId == null) return;
  const peerName = encodeURIComponent(peer.userName || '宠友');
  const petName = encodeURIComponent(peer.petName || '');
  const avatar = encodeURIComponent(peer.avatar || '');
  store.ensureChatThread({
    id: `c_${peer.peerId}`,
    peerId: peer.peerId,
    peerName: peer.userName || '宠友',
    petName: peer.petName || '',
    avatar: peer.avatar || '',
  });
  wx.navigateTo({
    url: `/pages/chat/chat?peerId=${peer.peerId}&peerName=${peerName}&petName=${petName}&avatar=${avatar}`,
  });
}

function onMapMarkerTap(page, e) {
  const markerId = e.detail.markerId;
  const marker = (page.data.mapMarkers || []).find((m) => m.id === markerId);
  if (!marker || !marker.peerId) return;
  openPeerChat({
    peerId: marker.peerId,
    userName: marker.userName,
    petName: marker.petName,
    avatar: marker.avatar,
  });
}

module.exports = {
  collectMapPeers,
  loadPetMap,
  onMapMarkerTap,
  openPeerChat,
};
