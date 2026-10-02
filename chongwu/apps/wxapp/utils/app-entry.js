/** 启动后默认 Tab：搭搭社交（pet-discover） */
const LAUNCH_TAB = '/pages/pet-discover/pet-discover';

function openLaunchTab() {
  wx.switchTab({
    url: LAUNCH_TAB,
    fail: () => {
      wx.reLaunch({ url: LAUNCH_TAB });
    },
  });
}

module.exports = {
  LAUNCH_TAB,
  openLaunchTab,
};
