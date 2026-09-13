const store = require('../../utils/store');
const { listAllMapPoints } = require('../../utils/catalog');
const amap = require('../../utils/amap');

Page({
  data: {
    latitude: 39.9042,
    longitude: 116.4074,
    scale: 14,
    markers: [],
    points: [],
    selectedPoint: null,
    city: '北京',
    amapReady: false,
    loading: true,
  },

  onLoad() {
    this.setData({
      city: store.getCity(),
      amapReady: amap.isAmapConfigured(),
    });
    this.initMap();
  },

  async initMap() {
    this.setData({ loading: true });
    const city = store.getCity();
    let latitude = 39.9042;
    let longitude = 116.4074;

    try {
      const loc = await new Promise((resolve, reject) => {
        wx.getLocation({ type: 'gcj02', success: resolve, fail: reject });
      });
      latitude = loc.latitude;
      longitude = loc.longitude;
    } catch (e) {
      const saved = store.getCityLocation();
      if (saved.lat && saved.lng) {
        latitude = saved.lat;
        longitude = saved.lng;
      }
    }

    const raw = listAllMapPoints();
    const points = await amap.enrichPointsWithCoords(raw, city);
    const markers = amap.buildMapMarkers(points);

    this.setData({
      latitude,
      longitude,
      points,
      markers,
      loading: false,
    });
  },

  onMarkerTap(e) {
    const markerId = e.detail.markerId;
    const marker = this.data.markers.find((m) => m.id === markerId);
    if (!marker) return;
    const point = this.data.points.find((p) => p.id === marker.pointId);
    if (point) this.setData({ selectedPoint: point });
  },

  onNav() {
    const p = this.data.selectedPoint;
    if (!p) return;
    amap.openNavigation({
      lat: p.latitude,
      lng: p.longitude,
      name: p.name,
      address: p.address,
    });
  },

  onRelocate() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          scale: 15,
        });
      },
      fail: () => wx.showToast({ title: '定位失败', icon: 'none' }),
    });
  },

  onSubmitPoint() {
    wx.navigateTo({ url: '/pages/map-submit/map-submit' });
  },

  onCloseCard() {
    this.setData({ selectedPoint: null });
  },
});
