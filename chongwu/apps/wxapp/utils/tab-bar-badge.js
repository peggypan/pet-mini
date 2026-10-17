/** 刷新所有栈内 Tab 页上的自定义 tabBar 未读角标 */
function refreshAllTabBars() {
  const pages = getCurrentPages();
  pages.forEach((page) => {
    if (!page || typeof page.getTabBar !== 'function') return;
    const bar = page.getTabBar();
    if (bar && typeof bar.refreshUnread === 'function') bar.refreshUnread();
  });
}

module.exports = {
  refreshAllTabBars,
};
