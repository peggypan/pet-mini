const store = require('../../utils/store');
const { MOCK_PET, RISK_TIPS } = require('../../utils/mock');
const amap = require('../../utils/amap');
const { pickMixedMedia, MEDIA_LIMIT_HINT, mediaSlots } = require('../../utils/media-upload');
const { blockSubPageWithoutProfile, requirePetProfile } = require('../../utils/pet-profile-guard');
const cloudApi = require('../../utils/cloud-api');
const { saveSocialToCloud } = require('../../utils/social-cloud-sync');
const { saveLocalToCloud } = require('../../utils/local-cloud-sync');
const sensitiveWords = require('../../utils/sensitive-words');

const PLACEHOLDERS = {
  lost: '描述走失时间、体貌特征、是否戴项圈、酬谢方式等…',
  found: '描述捡到时间、宠物特征、当前安置情况、联系方式等…',
  rescue: '描述救助对象、伤情/状况、当前安置、所需物资或志愿者等…',
  adopt: '描述宠物情况、健康状况、领养要求、是否绝育等…',
};

const TYPE_TAG = { lost: '寻宠', found: '招领', rescue: '救助', adopt: '领养' };

const SHARE_PAGE_TAG = {
  lost: '寻宠启事',
  found: '招领信息',
  rescue: '宠物救助',
  adopt: '领养救助',
};

const TITLE_PLACEHOLDERS = {
  lost: '如：走失金毛，红花镇附近',
  found: '如：捡到小型犬，待主人认领',
  rescue: '如：流浪猫需医疗救助',
  adopt: '如：温顺狸花猫寻找领养',
};

Page({
  data: {
    pageMode: 'lost-found',
    postType: 'lost',
    zones: [
      { id: 'cat', name: '猫咪' },
      { id: 'dog', name: '狗狗' },
      { id: 'other', name: '异宠' },
    ],
    zone: 'dog',
    location: '',
    geoLocation: null,
    headline: '',
    titlePlaceholder: TITLE_PLACEHOLDERS.lost,
    phone: '',
    content: '',
    mediaList: [],
    mediaLimitHint: MEDIA_LIMIT_HINT,
    mediaCanAdd: true,
    mediaSummary: '0/6 图 · 0/3 视频',
    placeholder: PLACEHOLDERS.lost,
    lastPublishedId: '',
    shareTitle: '',
  },

  onLoad(options) {
    blockSubPageWithoutProfile(this);
    this.checkPermissions();
    const opts = options || {};
    const pageMode = opts.mode === 'rescue-adopt' ? 'rescue-adopt' : 'lost-found';
    let postType = 'lost';

    if (pageMode === 'rescue-adopt') {
      wx.setNavigationBarTitle({ title: '领养救助' });
      wx.showModal({
        title: '风险提示',
        content: RISK_TIPS.adopt,
        showCancel: false,
      });
      const raw = opts.postType;
      postType = raw === 'rescue' || raw === 'adopt' ? raw : 'adopt';
    } else {
      postType = opts.postType === 'found' ? 'found' : 'lost';
    }

    this.setData({
      pageMode,
      postType,
      placeholder: PLACEHOLDERS[postType],
      titlePlaceholder: TITLE_PLACEHOLDERS[postType] || TITLE_PLACEHOLDERS.lost,
    });
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
    const { pageMode } = this.data;
    const allowed = pageMode === 'rescue-adopt'
      ? ['rescue', 'adopt']
      : ['lost', 'found'];
    if (!allowed.includes(postType)) return;
    this.setData({
      postType,
      placeholder: PLACEHOLDERS[postType],
      titlePlaceholder: TITLE_PLACEHOLDERS[postType] || TITLE_PLACEHOLDERS.lost,
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
    amap.openPlace(this.data.geoLocation || {});
  },

  syncMediaUI(list) {
    const slots = mediaSlots(list);
    this.setData({
      mediaList: list,
      mediaCanAdd: slots.canAddAny,
      mediaSummary: slots.summary,
    });
  },

  onChooseMedia() {
    pickMixedMedia(this.data.mediaList)
      .then((list) => this.syncMediaUI(list))
      .catch((err) => {
        const msg = (err && err.errMsg) || '';
        if (msg.includes('permission')) this.showPermissionGuide();
      });
  },

  onRemoveMedia(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    this.syncMediaUI(this.data.mediaList.filter((_, i) => i !== index));
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

  async onSubmit() {
    if (!requirePetProfile()) return;
    const {
      postType, zone, location, geoLocation, phone, headline, content, mediaList,
    } = this.data;
    const title = (headline || '').trim();
    const text = (content || '').trim();
    if (!title) {
      wx.showToast({ title: '请填写标题', icon: 'none' });
      return;
    }
    if (!text) {
      wx.showToast({ title: '请填写详细描述', icon: 'none' });
      return;
    }
    if (sensitiveWords.textBlocked(title)) {
      wx.showToast({ title: '标题含有违规内容', icon: 'none' });
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

    const locationPlain = location || '';
    if (sensitiveWords.textBlocked(text) || sensitiveWords.textBlocked(locationPlain)) {
      const banTip = postType === 'lost' || postType === 'found'
        ? '禁止借寻宠/招领进行活体交易'
        : '禁止借领养救助进行活体交易';
      wx.showToast({ title: banTip, icon: 'none' });
      return;
    }

    const tag = TYPE_TAG[postType] || '寻宠';
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
    const nick = (store.getUserProfile().nickname || '').trim() || '宠友';
    const payload = {
      userName: nick,
      petName: MOCK_PET.name,
      avatar: MOCK_PET.avatar,
      zone,
      title,
      content: parts.join('\n'),
      image: imageUrls[0] || '',
      images: imageUrls,
      mediaList,
      location: locText,
      geoLocation,
      lostType: postType,
      essence: false,
    };

    let row;
    try {
      if (cloudApi.cloudEnabled() && postType === 'adopt') {
        row = await saveLocalToCloud({
          type: 'adopt',
          title,
          desc: text,
          contact: phone || '',
          location: locText,
          geoLocation,
          mediaList,
          image: imageUrls[0] || '',
          images: imageUrls,
          userName: nick,
        });
      } else if (cloudApi.cloudEnabled()) {
        row = await saveSocialToCloud(payload);
      } else {
        row = store.addSocialPost(payload);
      }
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '发布失败', icon: 'none' });
      return;
    }

    let shareTitle;
    if (postType === 'lost') {
      shareTitle = `急寻宠物！${title}`;
    } else if (postType === 'found') {
      shareTitle = `招领宠物 · ${title}`;
    } else if (postType === 'rescue') {
      shareTitle = `宠物救助 · ${title}`;
    } else {
      shareTitle = `爱心领养 · ${title}`;
    }

    this.setData({ lastPublishedId: row.id, shareTitle });

    let successHint = '已同步到宠物社区，分享给好友可扩大寻找范围';
    let successModal = '分享给同城好友，一起帮忙寻找或认领';
    if (postType === 'adopt') {
      successHint = cloudApi.cloudEnabled()
        ? '已发布到同城救助列表，分享给好友可扩大领养信息传播'
        : '已同步到宠物社区，分享给好友可扩大领养信息传播';
      successModal = '分享给同城好友，一起帮毛孩子寻找新家';
    } else if (postType === 'rescue') {
      successHint = '已同步到宠物社区，分享给好友可汇聚更多救助力量';
      successModal = '分享给同城好友，一起参与爱心救助';
    }

    store.pushMessage(`${tag}信息已发布`, successHint, 'social');

    wx.showModal({
      title: '发布成功',
      content: successModal,
      confirmText: '立即分享',
      cancelText: '完成',
      success: (res) => {
        if (res.confirm) {
          wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
        }
        setTimeout(() => {
          if (postType === 'adopt' && cloudApi.cloudEnabled()) {
            wx.navigateTo({
              url: `/pages/social-detail/social-detail?id=${row.id}&source=local`,
              fail: () => wx.navigateBack(),
            });
            return;
          }
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
      if (postType === 'adopt' && cloudApi.cloudEnabled()) {
        return {
          title: shareTitle || '爱心领养 · 宠头头',
          path: `/pages/social-detail/social-detail?id=${lastPublishedId}&source=local`,
        };
      }
      return {
        title: shareTitle || '寻宠启事 · 宠头头',
        path: `/pages/social-detail/social-detail?id=${lastPublishedId}`,
      };
    }
    const tag = SHARE_PAGE_TAG[postType] || '同城互助';
    const loc = geoLocation?.name || location || '同城';
    const preview = (content || '').trim().slice(0, 24);
    const { pageMode } = this.data;
    const sharePath = pageMode === 'rescue-adopt'
      ? `/pages/lost-publish/lost-publish?mode=rescue-adopt&postType=${postType}`
      : '/pages/lost-publish/lost-publish';
    return {
      title: preview ? `${tag} · ${loc} · ${preview}` : `${tag} · 宠头头同城互助`,
      path: sharePath,
    };
  },

  onShareTimeline() {
    const { shareTitle, postType } = this.data;
    const tag = SHARE_PAGE_TAG[postType] || '同城互助';
    return {
      title: shareTitle || `${tag} · 宠头头`,
    };
  },
});
