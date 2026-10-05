function showClubJoinResult(club, result) {
  const name = (club && club.name) || '俱乐部';
  if (result && result.ok) {
    wx.showModal({
      title: '加入成功',
      content: `你已加入「${name}」。可在「我的俱乐部 → 加入的俱乐部」查看并参与互动。`,
      showCancel: false,
      confirmText: '知道了',
    });
    return;
  }
  const msg = (result && result.message) || '加入失败，请稍后重试';
  if (msg.length > 18) {
    wx.showModal({
      title: '无法加入',
      content: msg,
      showCancel: false,
      confirmText: '知道了',
    });
  } else {
    wx.showToast({ title: msg, icon: 'none', duration: 2800 });
  }
}

module.exports = {
  showClubJoinResult,
};
