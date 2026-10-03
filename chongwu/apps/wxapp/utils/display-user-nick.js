const store = require('./store');

/** 列表/卡片只展示网名，不含「我 ·」前缀与宠物名 */
function displayUserNickName(entry) {
  if (!entry) return '宠友';
  if (entry.isMine) {
    const mine = (store.getUserProfile().nickname || '').trim();
    if (mine) return mine;
  }
  let name = String(entry.userName || '').trim();
  if (name === '我') {
    const mine = (store.getUserProfile().nickname || '').trim();
    if (mine) return mine;
  }
  const stripped = name.replace(/^我\s*[·•]\s*/, '').trim();
  return stripped || name || '宠友';
}

module.exports = {
  displayUserNickName,
};
