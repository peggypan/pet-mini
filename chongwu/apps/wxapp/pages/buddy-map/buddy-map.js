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
    mapSpeciesFilter: 'all',
    mapSpeciesFilterLabel: '全部',
    mapSpeciesCounts: { all: 0, dog: 0, cat: 0, exotic: 0 },
    speciesTabs: [
      { key: 'all', label: '全部' },
      { key: 'dog', label: '狗搭子' },
      { key: 'cat', label: '猫搭子' },
      { key: 'exotic', label: '异宠搭子' },
    ],
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

  onSpeciesFilter(e) {
    const key = e.currentTarget.dataset.key || 'all';
    if (key === this.data.mapSpeciesFilter) return;
    this.setData({ mapSpeciesFilter: key }, () => loadPetMap(this));
  },
});
