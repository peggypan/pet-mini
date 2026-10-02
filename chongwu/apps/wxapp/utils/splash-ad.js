const STORAGE_KEY = 'mvp_splash_ad_shown';

function todayKey() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function readShownMap() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || {};
  } catch (e) {
    return {};
  }
}

function writeShownMap(map) {
  wx.setStorageSync(STORAGE_KEY, map || {});
}

function shouldShowSplash(ad) {
  if (!ad || !ad.id || !ad.imageUrl) return false;
  if (ad.status && ad.status !== 'online') return false;
  const rule = ad.showRule || 'oncePerDay';
  const map = readShownMap();
  const rec = map[String(ad.id)] || {};
  if (rule === 'everyLaunch') return true;
  if (rule === 'oncePerUser') return !rec.once;
  if (rule === 'oncePerDay') return rec.lastDay !== todayKey();
  return true;
}

function markSplashShown(ad) {
  if (!ad || !ad.id) return;
  const map = readShownMap();
  const id = String(ad.id);
  const rule = ad.showRule || 'oncePerDay';
  if (rule === 'oncePerUser') {
    map[id] = { ...map[id], once: true };
  } else if (rule === 'oncePerDay') {
    map[id] = { ...map[id], lastDay: todayKey() };
  } else {
    map[id] = { ...map[id], lastLaunch: Date.now() };
  }
  writeShownMap(map);
}

function cacheSplashForPage(ad) {
  const app = getApp();
  if (app && app.globalData) {
    app.globalData.pendingSplashAd = ad;
  }
  wx.setStorageSync('mvp_splash_ad_pending', ad);
}

function consumePendingSplashAd() {
  const app = getApp();
  let ad = (app && app.globalData && app.globalData.pendingSplashAd) || null;
  if (!ad) {
    try {
      ad = wx.getStorageSync('mvp_splash_ad_pending') || null;
    } catch (e) {
      ad = null;
    }
  }
  if (app && app.globalData) app.globalData.pendingSplashAd = null;
  wx.removeStorageSync('mvp_splash_ad_pending');
  return ad;
}

module.exports = {
  shouldShowSplash,
  markSplashShown,
  cacheSplashForPage,
  consumePendingSplashAd,
};
