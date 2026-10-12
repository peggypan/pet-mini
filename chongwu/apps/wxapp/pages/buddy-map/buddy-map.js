const { loadPetMap, onMapMarkerTap, openBuddyDetail } = require('../../utils/pet-buddy-map');
const { refreshBuddyFeedFromCloud } = require('../../utils/buddy-cloud-sync');
const cloudApi = require('../../utils/cloud-api');

Page({
  data: {
    mapLatitude: 39.9042,
    mapLongitude: 116.4074,
    mapScale: 14,
    mapMarkers: [],
    mapPeerCount: 0,
    mapPeers: [],
  },

  onShow() {
    if (cloudApi.cloudEnabled()) {
      refreshBuddyFeedFromCloud({ limit: 80 })
        .catch(() => {})
        .finally(() => loadPetMap(this));
      return;
    }
    loadPetMap(this);
  },

  onMapMarkerTap(e) {
    onMapMarkerTap(this, e);
  },

  onPeerTap(e) {
    const peer = (this.data.mapPeers || [])[Number(e.currentTarget.dataset.index)];
    openBuddyDetail(peer);
  },
});
