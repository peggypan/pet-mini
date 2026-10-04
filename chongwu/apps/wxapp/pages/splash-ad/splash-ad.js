const { openLaunchTab } = require('../../utils/app-entry');
const { consumePendingSplashAd, markSplashShown } = require('../../utils/splash-ad');
const { requireInteract } = require('../../utils/pet-profile-guard');

Page({
  data: {
    ad: null,
    canSkip: false,
    skipLabel: '跳过',
  },

  _timer: null,
  _tick: null,
  _left: 0,

  onLoad() {
    const ad = consumePendingSplashAd();
    if (!ad || !ad.imageUrl) {
      openLaunchTab();
      return;
    }
    const skipAfter = ad.skippable === false ? ad.durationSec : (ad.skipAfterSec || 0);
    const duration = Math.max(1, Number(ad.durationSec) || 5);
    this._left = Math.max(skipAfter, duration);
    this.setData({
      ad,
      canSkip: ad.skippable !== false && skipAfter <= 0,
      skipLabel: this.buildSkipLabel(skipAfter),
    });
    this.startTimers(skipAfter, duration);
  },

  buildSkipLabel(skipAfterSec) {
    const ad = this.data.ad;
    if (ad && ad.skippable === false) {
      return `${this._left}s`;
    }
    if (skipAfterSec > 0) {
      return `${skipAfterSec}s 后可跳过`;
    }
    return '跳过';
  },

  startTimers(skipAfterSec, durationSec) {
    let elapsed = 0;
    this._tick = setInterval(() => {
      elapsed += 1;
      const left = Math.max(0, durationSec - elapsed);
      this._left = left;
      if (skipAfterSec > 0 && elapsed >= skipAfterSec && !this.data.canSkip) {
        this.setData({ canSkip: true, skipLabel: '跳过' });
      } else if (skipAfterSec > 0 && elapsed < skipAfterSec) {
        this.setData({ skipLabel: `${skipAfterSec - elapsed}s 后可跳过` });
      } else if (left > 0 && this.data.canSkip) {
        this.setData({ skipLabel: `跳过 ${left}s` });
      }
      if (elapsed >= durationSec) {
        this.finish(false);
      }
    }, 1000);
  },

  clearTimers() {
    if (this._tick) clearInterval(this._tick);
    if (this._timer) clearTimeout(this._timer);
    this._tick = null;
    this._timer = null;
  },

  finish(tapped) {
    if (this._finished) return;
    this._finished = true;
    this.clearTimers();
    const ad = this.data.ad;
    if (ad) markSplashShown(ad);
    if (tapped && ad && ad.linkType === 'miniPage' && ad.linkTarget) {
      const url = ad.linkTarget;
      if (url.includes('map-submit')) {
        if (!requireInteract()) {
          openLaunchTab();
          return;
        }
      }
      wx.reLaunch({
        url,
        fail: () => openLaunchTab(),
      });
      return;
    }
    openLaunchTab();
  },

  onSkip() {
    if (!this.data.canSkip && this.data.ad && this.data.ad.skippable !== false) return;
    this.finish(false);
  },

  onTapAd() {
    const ad = this.data.ad;
    if (!ad || ad.linkType === 'none' || !ad.linkTarget) {
      this.finish(false);
      return;
    }
    if (ad.linkType === 'h5') {
      wx.setClipboardData({
        data: ad.linkTarget,
        success: () => {
          wx.showToast({ title: '链接已复制', icon: 'none' });
          this.finish(false);
        },
      });
      return;
    }
    this.finish(true);
  },

  onUnload() {
    this.clearTimers();
  },
});
