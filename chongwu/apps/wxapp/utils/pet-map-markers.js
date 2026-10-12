/** 地图上宠友头像 marker：优先搭子真实坐标，无坐标时在地图中心附近微偏移 */

const { pickBuddyLatLng } = require('./geo-distance');
const { FALLBACK_ICON, hydrateMapMarkerIcons } = require('./map-marker-icon');

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 9973;
  return h;
}

function buildPetAvatarMarkers(peers, latitude, longitude, idBase = 1) {
  const lat = Number(latitude) || 39.9042;
  const lng = Number(longitude) || 116.4074;
  return (peers || []).slice(0, 24).map((peer, index) => {
    const seed = hashSeed(String(peer.peerId || peer.id || index));
    const atPeer = pickBuddyLatLng(peer);
    const markerLat = atPeer ? atPeer.lat : lat + ((seed % 17) - 8) * 0.00075;
    const markerLng = atPeer ? atPeer.lng : lng + ((seed % 23) - 11) * 0.00095;
    const postId = peer.postId || peer.buddyId || peer.peerId || peer.id;
    return {
      id: idBase + index,
      postId,
      peerId: postId,
      buddyId: postId,
      peerOpenid: peer.peerOpenid || '',
      userName: peer.userName || peer.peerName || '宠友',
      petName: peer.petName || '',
      avatar: peer.avatar || peer.avatarUrl || '',
      latitude: markerLat,
      longitude: markerLng,
      iconPath: FALLBACK_ICON,
      width: 48,
      height: 48,
      alpha: 0.98,
      callout: {
        content: `${peer.userName || '宠友'}${peer.petName ? ' · ' + peer.petName : ''}\n查看搭子详情`,
        display: 'BYCLICK',
        padding: 8,
        borderRadius: 8,
        fontSize: 12,
      },
    };
  });
}

module.exports = {
  buildPetAvatarMarkers,
  hydrateMapMarkerIcons,
};
