const store = require('../../utils/store');
const { listAllMapPoints, listAllBuddies } = require('../../utils/catalog');
const amap = require('../../utils/amap');

const BUDDY_MARKER_ID_BASE = 10000;

// 演示数据没有真实坐标，头像 marker 用确定性伪随机散布在地图中心附近
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 9973;
  return h;
}

function buildBuddyMarkers(buddies, latitude, longitude) {
  return buddies.slice(0, 12).map((b, index) => {
    const seed = hashSeed(String(b.id || index));
    return {
      id: BUDDY_MARKER_ID_BASE + index,
      buddyId: b.id,
      latitude: latitude + ((seed % 17) - 8) * 0.0007,
      longitude: longitude + ((seed % 23) - 11) * 0.0009,
      iconPath: b.avatar,
      width: 34,
      height: 34,
      alpha: 0.95,
      callout: {
        content: `${b.userName || '宠友'}${b.petName ? ' · ' + b.petName : ''}\n${b.buddyType || '宠友'}${b.distance ? ' · ' + b.distance : ''}`,
        display: 'BYCLICK',
        padding: 8,
        borderRadius: 8,
        fontSize: 12,
      },
    };
  });
}

const CATEGORY_IDS = ['hotel', 'park', 'mall', 'food', 'scenic', 'camp'];

function matchCategory(p) {
  const t = String(p.type || '');
  if (p.danger || t.includes('毒') || t.includes('危险')) return 'danger';
  if (t.includes('不友好') || p.allowPet === false) return 'unfriendly';
  if (t.includes('酒店')) return 'hotel';
  if (t.includes('公园')) return 'park';
  if (t.includes('商场')) return 'mall';
  if (t.includes('餐厅')) return 'food';
  if (t.includes('景区')) return 'scenic';
  if (t.includes('露营')) return 'camp';
  return 'other';
}

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
    filters: [
      { id: 'all', name: '全部' },
      { id: 'hotel', name: '酒店' },
      { id: 'park', name: '公园' },
      { id: 'mall', name: '商场' },
      { id: 'food', name: '餐厅' },
      { id: 'scenic', name: '景区' },
      { id: 'camp', name: '露营地' },
      { id: 'unfriendly', name: '不友好' },
      { id: 'danger', name: '危险/毒点' },
    ],
    filter: 'all',
    keyword: '',
    tips: [],
  },

  onSearchInput(e) {
    const keyword = (e.detail.value || '').trim();
    this.setData({ keyword: e.detail.value });
    if (this._searchTimer) clearTimeout(this._searchTimer);
    if (!keyword) {
      this.setData({ tips: [] });
      return;
    }
    this._searchTimer = setTimeout(() => this.runSearch(keyword), 350);
  },

  async runSearch(keyword) {
    // 本地点位匹配（无 Key 也可用）
    const local = (this._allPoints || [])
      .filter((p) => (p.name || '').includes(keyword) || (p.address || '').includes(keyword) || (p.type || '').includes(keyword))
      .slice(0, 5)
      .map((p) => ({
        kind: 'local',
        id: p.id,
        name: p.name,
        address: p.address || p.type || '',
        latitude: p.latitude,
        longitude: p.longitude,
      }));
    let remote = [];
    try {
      const tips = await amap.searchTips(keyword, this.data.city);
      remote = (tips || []).map((t) => {
        const [lng, lat] = String(t.location || '').split(',').map(Number);
        return {
          kind: 'remote',
          id: t.id,
          name: t.name,
          address: t.address || t.district || '',
          latitude: lat || 0,
          longitude: lng || 0,
        };
      }).filter((t) => t.latitude && t.longitude);
    } catch (e) {
      /* 忽略远程搜索失败 */
    }
    this.setData({ tips: [...local, ...remote].slice(0, 10) });
  },

  onPickTip(e) {
    const index = Number(e.currentTarget.dataset.index);
    const tip = this.data.tips[index];
    if (!tip) return;
    this.setData({ tips: [], keyword: tip.name });
    if (tip.kind === 'local') {
      // 本地点位：地图跳转并弹出点位卡片
      const point = (this._allPoints || []).find((p) => String(p.id) === String(tip.id));
      if (point) {
        this.setData({ latitude: point.latitude, longitude: point.longitude, scale: 16, selectedPoint: point });
      }
      return;
    }
    // 远程搜索结果：移动视野并落一个搜索标记
    this._searchMarker = {
      id: 99999,
      latitude: tip.latitude,
      longitude: tip.longitude,
      title: tip.name,
      width: 32,
      height: 40,
      callout: {
        content: `${tip.name}\n${tip.address}`,
        display: 'ALWAYS',
        padding: 8,
        borderRadius: 8,
        fontSize: 12,
      },
    };
    this.setData({
      latitude: tip.latitude,
      longitude: tip.longitude,
      scale: 16,
      markers: this.rebuildMarkers(),
    });
  },

  onClearSearch() {
    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchMarker = null;
    this.setData({ keyword: '', tips: [], markers: this.rebuildMarkers() });
  },

  rebuildMarkers() {
    const pointMarkers = amap.buildMapMarkers(this.data.points);
    const buddyMarkers = this._buddyMarkers || [];
    const searchMarker = this._searchMarker ? [this._searchMarker] : [];
    return [...pointMarkers, ...buddyMarkers, ...searchMarker];
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
    this._allPoints = points;
    const pointMarkers = amap.buildMapMarkers(points);
    const buddyMarkers = buildBuddyMarkers(listAllBuddies(), latitude, longitude);
    this._buddyMarkers = buddyMarkers;

    this.setData({
      latitude,
      longitude,
      points,
      markers: [...pointMarkers, ...buddyMarkers],
      loading: false,
    });
  },

  onFilter(e) {
    const id = e.currentTarget.dataset.id;
    if (id === this.data.filter) return;
    this.setData({ filter: id });
    this.applyFilter(id);
  },

  applyFilter(id) {
    const all = this._allPoints || [];
    let points = all;
    let latitude = this.data.latitude;
    let longitude = this.data.longitude;
    let scale = this.data.scale;
    if (id !== 'all') {
      points = all.filter((p) => matchCategory(p) === id);
      // 视野聚焦到该类别第一个点位，保证筛选结果可见
      const first = points.find((p) => p.latitude && p.longitude);
      if (first) {
        latitude = first.latitude;
        longitude = first.longitude;
        scale = 12;
      }
    }
    this.setData({
      points,
      markers: this.rebuildMarkers(),
      latitude,
      longitude,
      scale,
      selectedPoint: null,
    });
  },

  onMarkerTap(e) {
    const markerId = e.detail.markerId;
    const marker = this.data.markers.find((m) => m.id === markerId);
    if (!marker) return;
    if (marker.buddyId != null) {
      wx.navigateTo({ url: `/pages/buddy-detail/buddy-detail?id=${marker.buddyId}` });
      return;
    }
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
