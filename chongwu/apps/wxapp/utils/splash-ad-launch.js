const { openLaunchTab } = require('./app-entry');
const { fetchActiveSplashAdFromCloud } = require('./splash-ad-cloud-sync');
const { shouldShowSplash, cacheSplashForPage } = require('./splash-ad');

async function tryLaunchWithSplash() {
  try {
    const ad = await fetchActiveSplashAdFromCloud();
    if (ad && shouldShowSplash(ad)) {
      cacheSplashForPage(ad);
      wx.reLaunch({ url: '/pages/splash-ad/splash-ad' });
      return;
    }
  } catch (e) {
    console.warn('[splash-ad-launch]', e);
  }
  openLaunchTab();
}

module.exports = {
  tryLaunchWithSplash,
};
