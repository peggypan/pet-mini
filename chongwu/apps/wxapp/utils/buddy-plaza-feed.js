/** 搭子广场分页：只展示真实数据源，不循环填充重复卡片 */
const PAGE_SIZE = 8;
const MAX_FEED_ITEMS = 200;

function appendFeedItems(sourceRows, currentList, decorateRow) {
  const sources = sourceRows || [];
  const list = currentList || [];
  if (!sources.length) {
    return { list: [], hasMore: false, nextOffset: 0 };
  }
  const cappedTotal = Math.min(sources.length, MAX_FEED_ITEMS);
  const start = list.length;
  if (start >= cappedTotal) {
    return { list, hasMore: false, nextOffset: start };
  }
  const end = Math.min(start + PAGE_SIZE, cappedTotal);
  const chunk = [];
  for (let i = start; i < end; i += 1) {
    const src = sources[i];
    const base = decorateRow(src);
    chunk.push({
      ...base,
      feedKey: `${src.id}_${i}`,
    });
  }
  return {
    list: list.concat(chunk),
    hasMore: end < cappedTotal,
    nextOffset: end,
  };
}

function resetFeed(sourceRows, decorateRow) {
  const sources = sourceRows || [];
  if (!sources.length) {
    return { list: [], hasMore: false, nextOffset: 0 };
  }
  return appendFeedItems(sources, [], decorateRow);
}

module.exports = {
  PAGE_SIZE,
  MAX_FEED_ITEMS,
  appendFeedItems,
  resetFeed,
};
