const store = require('../../utils/store');
const { MOCK_PET } = require('../../utils/mock');
const amap = require('../../utils/amap');
const { chooseMedia } = require('../../utils/choose-media');

const PLACEHOLDERS = {
  lost: '描述走失时间、体貌特征、是否戴项圈、酬谢方式等…',
  found: '描述捡到时间、宠物特征、当前安置情况、联系方式等…',
};

Page({
  data: {
    postType: 'lost',
    zones: [
      { id: 'cat', name: '猫咪' },
      { id: 'dog', name: '狗狗' },
      { id: 'other', name: '异宠' },
    ],
    zone: 'dog',
    location: '',
    geoLocation: null,
    phone: '',
    content: '',
    mediaList: [],
    maxMediaCount: 6,
    placeholder: PLACEHOLDERS.lost,
    lastPublishedId: '',
    shareTitle: '',
  },

  onLoad() {
    this.checkPermissions();
  },

  checkPermissions() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.writePhotosAlbum'] === false) {
          this.showPermissionGuide();
        }
      },
    });
  },

  showPermissionGuide() {
    wx.showModal({
      title: '需要相册权限',
      content: '上传图片/视频需要访问相册，请在设置中开启',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) wx.openSetting();
      },
    });
  },

  onType(e) {
    const postType = e.currentTarget.dataset.type;
    this.setData({
      postType,
      placeholder: PLACEHOLDERS[postType],
    });
  },

  onZone(e) {
    this.setData({ zone: e.currentTarget.dataset.id });
  },

  onField(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  onChooseLocation() {
    amap.choosePoint()
      .then((loc) => {
        this.setData({
          geoLocation: {
            name: loc.name,
            address: loc.address,
            latitude: loc.latitude,
            longitude: loc.longitude,
            city: loc.city,
            province: loc.province,
          },
          location: loc.name || loc.address || this.data.location,
        });
      })
      .catch((err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return;
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要位置权限',
            content: '选择走失/发现地点需要授权位置信息',
            confirmText: '去设置',
            success: (r) => { if (r.confirm) wx.openSetting(); },
          });
        }
      });
  },

  onClearLocation() {
    this.setData({ geoLocation: null, location: '' });
  },

  onOpenLocation() {
    const { geoLocation } = this.data;
    if (!geoLocation) return;
    amap.openNavigation({
      lat: geoLocation.latitude,
      lng: geoLocation.longitude,
      name: geoLocation.name || '走失地点',
      address: geoLocation.address || '',
    });
  },

  onChooseImage() {
    const remain = this.data.maxMediaCount - this.data.mediaList.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 6 个媒体', icon: 'none' });
      return;
    }
    chooseMedia({
      count: Math.min(remain, 9),
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const append = (res.tempFiles || []).map((f) => ({
          type: 'image',
          url: f.tempFilePath,
        }));
        if (!append.length) return;
        this.setData({
          mediaList: [...this.data.mediaList, ...append].slice(0, this.data.maxMediaCount),
        });
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('permission')) {
          this.showPermissionGuide();
        }
      },
    });
  },

  onChooseVideo() {
    const { mediaList, maxMediaCount } = this.data;
    if (mediaList.some((m) => m.type === 'video')) {
      wx.showToast({ title: '每条启事最多 1 个视频', icon: 'none' });
      return;
    }
    if (mediaList.length >= maxMediaCount) {
      wx.showToast({ title: '媒体数量已达上限', icon: 'none' });
      return;
    }
    chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      success: (res) => {
        const file = (res.tempFiles || [])[0];
        if (!file) return;
        if (file.size > 50 * 1024 * 1024) {
          wx.showToast({ title: '视频请小于 50MB', icon: 'none' });
          return;
        }
        this.setData({
          mediaList: [...mediaList, {
            type: 'video',
            url: file.tempFilePath,
            poster: file.thumbTempFilePath || '',
            duration: file.duration || 0,
          }].slice(0, maxMediaCount),
        });
      },
    });
  },

  onRemoveMedia(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    this.setData({ mediaList: this.data.mediaList.filter((_, i) => i !== index) });
  },

  onPreviewMedia(e) {
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.mediaList[index];
    if (!item) return;
    if (item.type === 'video') {
      wx.previewMedia({ sources: [{ url: item.url, type: 'video', poster: item.poster }] });
      return;
    }
    const images = this.data.mediaList.filter((m) => m.type === 'image').map((m) => m.url);
    wx.previewImage({ urls: images, current: item.url });
  },

  onSubmit() {
    const {
      postType, zone, location, geoLocation, phone, content, mediaList,
    } = this.data;
    const text = (content || '').trim();
    if (!text) {
      wx.showToast({ title: '请填写详细描述', icon: 'none' });
      return;
    }
    if (!geoLocation && !(location || '').trim()) {
      wx.showToast({ title: '请选择或填写发生地点', icon: 'none' });
      return;
    }
    if (phone && !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' });
      return;
    }

    const banned = /活体|出售猫|出售狗|卖猫|卖狗|买卖|配种|繁殖/;
    if (banned.test(text) || banned.test(location || '')) {
      wx.showToast({ title: '禁止借寻宠/招领进行活体交易', icon: 'none' });
      return;
    }

    const tag = postType === 'lost' ? '寻宠' : '招领';
    const locText = geoLocation
      ? `${geoLocation.name || geoLocation.address}`
      : location;
    const parts = [
      `【${tag}互助】`,
      text,
      locText ? `地点：${locText}` : '',
      phone ? `联系：${phone}` : '',
    ].filter(Boolean);

    const imageUrls = mediaList.filter((m) => m.type === 'image').map((m) => m.url);
    const row = store.addSocialPost({
      userName: '我',
      petName: MOCK_PET.name,
      avatar: MOCK_PET.avatar,
      zone,
      content: parts.join('\n'),
      image: imageUrls[0] || '',
      images: imageUrls,
      mediaList,
      location: locText,
      geoLocation,
      lostType: postType,
      essence: false,
    });

    const shareTitle = postType === 'lost'
      ? `急寻宠物！${locText ? locText + ' · ' : ''}${text.slice(0, 20)}`
      : `招领宠物 · ${locText || '同城'} · ${text.slice(0, 20)}`;

    this.setData({ lastPublishedId: row.id, shareTitle });

    store.pushMessage(
      `${tag}信息已发布`,
      '已同步到交友广场，分享给好友可扩大寻找范围',
      'social'
    );

    wx.showModal({
      title: '发布成功',
      content: '分享给同城好友，一起帮忙寻找或认领',
      confirmText: '立即分享',
      cancelText: '完成',
      success: (res) => {
        if (res.confirm) {
          wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
        }
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/social-detail/social-detail?id=${row.id}`,
            fail: () => wx.navigateBack(),
          });
        }, res.confirm ? 300 : 700);
      },
    });
  },

  onShareAppMessage() {
    const { lastPublishedId, shareTitle, postType, content, location, geoLocation } = this.data;
    if (lastPublishedId) {
      return {
        title: shareTitle || '寻宠启事 · 宠头头',
        path: `/pages/social-detail/social-detail?id=${lastPublishedId}`,
      };
    }
    const tag = postType === 'lost' ? '寻宠启事' : '招领信息';
    const loc = geoLocation?.name || location || '同城';
    const preview = (content || '').trim().slice(0, 24);
    return {
      title: preview ? `${tag} · ${loc} · ${preview}` : `${tag} · 宠头头同城互助`,
      path: '/pages/lost-publish/lost-publish',
    };
  },

  onShareTimeline() {
    const { shareTitle, postType } = this.data;
    const tag = postType === 'lost' ? '寻宠启事' : '招领信息';
    return {
      title: shareTitle || `${tag} · 宠头头`,
    };
  },
});
