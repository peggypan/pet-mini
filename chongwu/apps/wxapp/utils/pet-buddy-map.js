const store = require('./store');
const cloudApi = require('./cloud-api');
const { ensureChatThreadOnCloud } = require('./chat-cloud-sync');
const { listAllBuddies, resolveBuddyPostId } = require('./catalog');
const { buildPetAvatarMarkers, hydrateMapMarkerIcons } = require('./pet-map-markers');
const { buddyIsNearViewer, resolveCityFromGps } = require('./geo-distance');
const {
  filterPeersBySpecies,
  countPeersBySpecies,
  filterKeyLabel,
  resolveBuddySpeciesCode,
  markerLabelForPeer,
} = require('./buddy-map-species');
const { buddyActiveInFeed } = require('./buddy-expect-expiry');

/** 地图只展示其他宠友，不含本人帖与档案疗愈搭子 */
function isSelfBuddyRow(b) {
  if (!b) return true;
  if (b.healingPetProfile === true) return true;
  return store.isMyUserContent(b);
}

function buddyPeerKey(b) {
  if (b.userId) return `u:${b.userId}`;
  if (b.openid) return `o:${b.openid}`;
  if (b._openid) return `o:${b._openid}`;
  return `id:${b.id}`;
}

function peerFromBuddy(b) {
  const postId = resolveBuddyPostId(b);
  if (!postId) return null;
  return {
    postId,
    buddyId: postId,
    peerId: postId,
    id: postId,
    peerOpenid: b.peerOpenid || b.openid || b._openid || '',
    userName: b.userName,
    petName: b.petName,
    avatar: b.avatar,
    location: b.location,
    expectPlace: b.expectPlace,
    expectPlaceAddress: b.expectPlaceAddress,
    city: b.city,
    latitude: b.latitude,
    longitude: b.longitude,
    petSpecies: b.petSpecies || '',
    species: resolveBuddySpeciesCode(b),
    buddyType: b.buddyType || '',
  };
}

function collectMapPeers(posts, viewer) {
  const map = new Map();
  listAllBuddies()
    .filter((b) => !isSelfBuddyRow(b))
    .filter((b) => buddyActiveInFeed(b))
    .filter((b) => buddyIsNearViewer(b, viewer))
    .forEach((b) => {
      const peer = peerFromBuddy(b);
      if (!peer) return;
      map.set(buddyPeerKey(b), peer);
    });
  (posts || [])
    .filter((p) => !isSelfBuddyRow(p))
    .filter((p) => buddyActiveInFeed(p))
    .filter((p) => buddyIsNearViewer(p, viewer))
    .forEach((p) => {
      const key = buddyPeerKey(p);
      if (map.has(key)) return;
      const peer = peerFromBuddy(p);
      if (!peer) return;
      map.set(key, peer);
    });
  return Array.from(map.values());
}

function loadPetMap(page, options) {
  const posts = (options && options.posts) || [];
  const loc = store.getCityLocation();
  let latitude = loc.lat || 39.9042;
  let longitude = loc.lng || 116.4074;

  const apply = () => {
    const viewer = {
      lat: latitude,
      lng: longitude,
      city: resolveCityFromGps(latitude, longitude) || store.getCity(),
    };
    const allPeers = collectMapPeers(posts, viewer);
    const speciesFilter = (page.data && page.data.mapSpeciesFilter) || 'all';
    const peers = filterPeersBySpecies(allPeers, speciesFilter).map((p) => {
      const meta = markerLabelForPeer(p);
      return {
        ...p,
        speciesDockClass: meta.dockClass,
        speciesTag: meta.content,
      };
    });
    const built = buildPetAvatarMarkers(peers, latitude, longitude);
    page.setData({
      mapLatitude: latitude,
      mapLongitude: longitude,
      mapPeerCount: peers.length,
      mapPeers: peers,
      mapSpeciesCounts: countPeersBySpecies(allPeers),
      mapSpeciesFilterLabel: filterKeyLabel(speciesFilter),
    });
    hydrateMapMarkerIcons(built).then((markers) => {
      if (!page || typeof page.setData !== 'function') return;
      page.setData({ mapMarkers: markers });
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

async function openPeerChat(peer) {
  if (!peer || peer.peerId == null) return;
  const peerName = encodeURIComponent(peer.userName || '宠友');
  const petName = encodeURIComponent(peer.petName || '');
  const avatar = encodeURIComponent(peer.avatar || '');
  const threadPayload = {
    id: `c_${peer.peerId}`,
    peerId: peer.peerId,
    peerName: peer.userName || '宠友',
    petName: peer.petName || '',
    avatar: peer.avatar || '',
  };
  const localThread = store.ensureChatThread(threadPayload);
  const threadId = (localThread && localThread.id) || threadPayload.id;
  wx.navigateTo({
    url: `/pages/chat/chat?threadId=${encodeURIComponent(threadId)}&peerId=${peer.peerId}&peerName=${peerName}&petName=${petName}&avatar=${avatar}`,
  });
  if (cloudApi.cloudEnabled()) {
    ensureChatThreadOnCloud(threadPayload).catch(() => {});
  }
}

/** 进入搭子详情（收藏 / 举报 / 发起私聊 / 期望地点导航） */
function openBuddyDetail(peerOrId) {
  const buddyId = typeof peerOrId === 'object'
    ? resolveBuddyPostId({
      id: peerOrId.postId || peerOrId.buddyId || peerOrId.peerId,
      peerOpenid: peerOrId.peerOpenid,
      openid: peerOrId.openid,
    })
    : resolveBuddyPostId(String(peerOrId || ''));
  if (!buddyId) {
    wx.showToast({ title: '无法打开该搭子', icon: 'none' });
    return;
  }
  wx.navigateTo({
    url: `/pages/buddy-detail/buddy-detail?id=${encodeURIComponent(buddyId)}`,
  });
}

function findMarkerByTapId(markers, markerId) {
  const mid = Number(markerId);
  return (markers || []).find(
    (m) => m.id === markerId || m.id === mid || String(m.id) === String(markerId),
  );
}

function onMapMarkerTap(page, e) {
  const markerId = e.detail.markerId;
  const marker = findMarkerByTapId(page.data.mapMarkers, markerId);
  if (!marker) return;
  openBuddyDetail(marker);
}

module.exports = {
  collectMapPeers,
  loadPetMap,
  onMapMarkerTap,
  openBuddyDetail,
  openPeerChat,
};
