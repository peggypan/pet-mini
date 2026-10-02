/** 点击正文 #话题 → 社区 Tab 按话题筛选 */
function openSocialHashtagFilter(topic) {
  const raw = String(topic || '').trim();
  if (!raw) return;
  const tag = raw.startsWith('#') ? raw : `#${raw}`;
  wx.setStorageSync('social_hashtag_filter', tag);
  wx.switchTab({ url: '/pages/social/social' });
}

module.exports = {
  openSocialHashtagFilter,
};
