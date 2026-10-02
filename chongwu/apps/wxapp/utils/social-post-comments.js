/** 帖子评论：楼中楼展示（所有层级归并到一级评论下） */
function buildCommentThreads(flat) {
  const list = (flat || []).map((c) => ({ ...c }));
  if (!list.length) return [];
  const byId = Object.fromEntries(list.map((c) => [c.id, c]));

  function rootOf(id) {
    let cur = byId[id];
    const guard = new Set();
    while (cur && cur.parentId && byId[cur.parentId] && !guard.has(cur.id)) {
      guard.add(cur.id);
      cur = byId[cur.parentId];
    }
    return cur;
  }

  const roots = list.filter((c) => !c.parentId);
  const rootIdSet = new Set(roots.map((r) => r.id));

  list.forEach((c) => {
    if (!c.parentId || rootIdSet.has(c.id)) return;
    const root = rootOf(c.id);
    if (!root || root.id === c.id) return;
    if (!root.replies) root.replies = [];
    if (!root.replies.some((r) => r.id === c.id)) {
      root.replies.push(c);
    }
  });

  roots.forEach((r) => {
    if (!r.replies) r.replies = [];
  });
  return roots;
}

module.exports = {
  buildCommentThreads,
};
