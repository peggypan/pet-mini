/** 地图上散布宠物/宠友头像 marker（演示坐标） */

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
    return {
      id: idBase + index,
      peerId: peer.peerId || peer.id,
      userName: peer.userName || peer.peerName || '宠友',
      petName: peer.petName || '',
      avatar: peer.avatar || peer.avatarUrl || '',
      latitude: lat + ((seed % 17) - 8) * 0.00075,
      longitude: lng + ((seed % 23) - 11) * 0.00095,
      iconPath: peer.avatar || peer.avatarUrl || '/assets/mock/real_avatar.jpg',
      width: 44,
      height: 44,
      alpha: 0.98,
      callout: {
        content: `${peer.userName || '宠友'}${peer.petName ? ' · ' + peer.petName : ''}\n点击私聊`,
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
};
