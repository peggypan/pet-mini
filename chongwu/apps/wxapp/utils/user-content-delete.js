const store = require('./store');

function confirmDelete(options = {}) {
  return new Promise((resolve) => {
    wx.showModal({
      title: options.title || '删除内容',
      content: options.content || '删除后无法恢复，确定继续？',
      confirmText: '删除',
      confirmColor: '#FF2442',
      cancelText: '取消',
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false),
    });
  });
}

function finishAfterDelete(fallbackTab) {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    wx.navigateBack();
    return;
  }
  if (fallbackTab) {
    wx.switchTab({ url: fallbackTab });
    return;
  }
  wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) });
}

async function deleteOwnedSocialPost(postId, options = {}) {
  const id = String(postId || '');
  if (!id) return { ok: false, reason: '无效内容' };
  const row = store.getSocialPost(id);
  if (!row) return { ok: false, reason: '演示内容无法删除' };
  if (!store.isMyUserContent(row)) return { ok: false, reason: '只能删除自己发布的内容' };
  const ok = await confirmDelete(options);
  if (!ok) return { ok: false, cancelled: true };
  store.deleteSocialPost(id);
  wx.showToast({ title: '已删除', icon: 'success' });
  return { ok: true };
}

async function deleteOwnedBuddyPost(buddyId, options = {}) {
  const id = String(buddyId || '');
  if (!id) return { ok: false, reason: '无效内容' };
  const row = store.getBuddyPost(id);
  if (!row) return { ok: false, reason: '演示内容无法删除' };
  if (!store.isMyUserContent(row)) return { ok: false, reason: '只能删除自己发布的内容' };
  const ok = await confirmDelete(options);
  if (!ok) return { ok: false, cancelled: true };
  store.deleteBuddyPost(id);
  wx.showToast({ title: '已删除', icon: 'success' });
  return { ok: true };
}

async function deleteOwnedEvent(eventId, options = {}) {
  const id = String(eventId || '');
  if (!id) return { ok: false, reason: '无效活动' };
  const row = store.getMyEvent(id);
  if (!row) return { ok: false, reason: '只能删除自己发起的活动' };
  const ok = await confirmDelete({
    title: '删除活动',
    content: '删除后活动将从列表下架，确定继续？',
    ...options,
  });
  if (!ok) return { ok: false, cancelled: true };
  store.deleteMyEvent(id);
  wx.showToast({ title: '已删除', icon: 'success' });
  return { ok: true };
}

async function deleteOwnedLocalPost(postId, options = {}) {
  const id = String(postId || '');
  if (!id) return { ok: false, reason: '无效内容' };
  const row = store.getLocalPost(id);
  if (!row) return { ok: false, reason: '无法删除该条信息' };
  const ok = await confirmDelete(options);
  if (!ok) return { ok: false, cancelled: true };
  store.deleteLocalPost(id);
  wx.showToast({ title: '已删除', icon: 'success' });
  return { ok: true };
}

async function deleteRescueItem(item, options = {}) {
  if (!item) return { ok: false, reason: '无效内容' };
  if (item.source === 'social' && item.refId) {
    const res = await deleteOwnedSocialPost(item.refId, {
      title: '删除寻宠救助信息',
      ...options,
    });
    return res;
  }
  if (item.source === 'local' && item.refId) {
    return deleteOwnedLocalPost(item.refId, {
      title: '删除领养信息',
      ...options,
    });
  }
  return { ok: false, reason: '演示内容无法删除' };
}

module.exports = {
  confirmDelete,
  finishAfterDelete,
  deleteOwnedSocialPost,
  deleteOwnedBuddyPost,
  deleteOwnedEvent,
  deleteOwnedLocalPost,
  deleteRescueItem,
};
