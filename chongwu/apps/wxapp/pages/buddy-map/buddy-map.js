const store = require('../../utils/store');
const { loadPetMap, onMapMarkerTap, openPeerChat } = require('../../utils/pet-buddy-map');

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
    loadPetMap(this);
  },

  onMapMarkerTap(e) {
    onMapMarkerTap(this, e);
  },

  onPeerChat(e) {
    const peer = (this.data.mapPeers || [])[Number(e.currentTarget.dataset.index)];
    openPeerChat(peer);
  },

  onRelocate() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          mapLatitude: res.latitude,
          mapLongitude: res.longitude,
          mapScale: 15,
        });
        loadPetMap(this);
      },
      fail: () => wx.showToast({ title: '获取位置失败', icon: 'none' }),
    });
  },
});
