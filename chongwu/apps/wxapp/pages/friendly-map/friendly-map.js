const store = require('../../utils/store');
const { listAllMapPoints, listAllBuddies } = require('../../utils/catalog');
const amap = require('../../utils/amap');
const { filterPointsByPetSentiment, getPetSentiment } = require('../../utils/map-pet-filter');
const { collectPetServicePOIs, mergeMapPoints } = require('../../utils/map-pet-poi-collector');
const { buildPetAvatarMarkers } = require('../../utils/pet-map-markers');

const BUDDY_MARKER_ID_BASE = 10000;

function buildBuddyMarkers(buddies, latitude, longitude) {
  const peers = buddies.slice(0, 12).map((b) => ({
    peerId: b.id,
    id: b.id,
    buddyId: b.id,
    userName: b.userName,
    petName: b.petName,
    avatar: b.avatar,
  }));
  return buildPetAvatarMarkers(peers, latitude, longitude, BUDDY_MARKER_ID_BASE).map((m, index) => ({
    ...m,
    buddyId: buddies[index] && buddies[index].id,
    callout: {
      content: `${m.userName || '宠友'}${m.petName ? ' · ' + m.petName : ''}\n${(buddies[index] && buddies[index].buddyType) || '宠友'}`,
      display: 'BYCLICK',
      padding: 8,
      borderRadius: 8,
      fontSize: 12,
    },
  }));
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
    petFilter: '',
    fabOpen: false,
    keyword: '',
    tips: [],
    selectedPointBadge: '',
    selectedPointBadgeText: '',
  },

  pointBadgeFor(point) {
    const s = getPetSentiment(point);
    if (s === 'danger') return { cls: 'danger', text: '宠物毒点' };
    if (s === 'unfriendly') return { cls: 'warn', text: '宠物不友好' };
    return { cls: 'ok', text: '宠物友好' };
  },

  focusPoint(point) {
    if (!point || !point.latitude) return;
    const badge = this.pointBadgeFor(point);
    this.setData({
      selectedPoint: point,
      selectedPointBadge: badge.cls,
      selectedPointBadgeText: badge.text,
      latitude: point.latitude,
      longitude: point.longitude,
      scale: 16,
      fabOpen: false,
    }, () => this.refreshMapMarkers());
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
      if (point) this.focusPoint(point);
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
    const activePointId = this.data.selectedPoint && this.data.selectedPoint.id;
    const pointMarkers = amap.buildMapMarkers(this.data.points, {
      mapScale: this.data.scale,
      activePointId,
      calloutMode: 'BYCLICK',
    });
    const buddyMarkers = this._buddyMarkers || [];
    const searchMarker = this._searchMarker ? [this._searchMarker] : [];
    return [...pointMarkers, ...buddyMarkers, ...searchMarker];
  },

  refreshMapMarkers() {
    this.setData({ markers: this.rebuildMarkers() });
  },

  onRegionChange(e) {
    const detail = e.detail || {};
    if (e.type !== 'end') return;
    const scale = detail.scale;
    if (!scale || Math.abs(scale - this.data.scale) < 0.2) return;
    this.setData({ scale }, () => this.refreshMapMarkers());
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
    let points = await amap.enrichPointsWithCoords(raw, city);
    const collected = await collectPetServicePOIs({ city, latitude, longitude });
    points = mergeMapPoints(points, collected);
    this._allPoints = points;
    const pointMarkers = amap.buildMapMarkers(points);
    const buddyMarkers = buildBuddyMarkers(listAllBuddies(), latitude, longitude);
    this._buddyMarkers = buddyMarkers;

    this.setData({
      latitude,
      longitude,
      scale: this.data.scale || 14,
      points,
      loading: false,
    }, () => {
      this.setData({ markers: this.rebuildMarkers() });
    });
  },

  onFabToggle() {
    this.setData({ fabOpen: !this.data.fabOpen });
  },

  onPetFabChange(e) {
    const petFilter = e.detail.value || '';
    this.setData({ petFilter, fabOpen: false });
    this.applyPetFilter(petFilter);
  },

  applyPetFilter(petFilter) {
    const pet = petFilter != null ? petFilter : this.data.petFilter;
    const all = this._allPoints || [];
    const points = filterPointsByPetSentiment(all, pet);
    let latitude = this.data.latitude;
    let longitude = this.data.longitude;
    let scale = this.data.scale;
    const first = points.find((p) => p.latitude && p.longitude);
    if (first && pet) {
      latitude = first.latitude;
      longitude = first.longitude;
      if (pet === 'petHospital' || pet === 'petStore') scale = 14;
      else scale = pet === 'danger' ? 13 : 12;
    }
    this.setData({
      points,
      latitude,
      longitude,
      scale,
      selectedPoint: null,
      selectedPointBadge: '',
      selectedPointBadgeText: '',
    }, () => this.refreshMapMarkers());
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
    if (point) this.focusPoint(point);
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
      fail: () => wx.showToast({ title: '获取位置失败', icon: 'none' }),
    });
  },

  onSubmitPoint() {
    wx.navigateTo({ url: '/pages/map-submit/map-submit' });
  },

  onCloseCard() {
    this.setData({
      selectedPoint: null,
      selectedPointBadge: '',
      selectedPointBadgeText: '',
    }, () => this.refreshMapMarkers());
  },
});
