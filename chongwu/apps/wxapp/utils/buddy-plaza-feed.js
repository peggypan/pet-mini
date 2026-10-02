/** 搭子广场无限列表：数据源不足时循环填充，feedKey 保证 wx:key 唯一 */
const PAGE_SIZE = 8;
const MAX_FEED_ITEMS = 200;

function appendFeedItems(sourceRows, currentList, decorateRow) {
  const sources = sourceRows || [];
  const list = currentList || [];
  if (!sources.length) {
    return { list: [], hasMore: false, nextOffset: 0 };
  }
  const start = list.length;
  if (start >= MAX_FEED_ITEMS) {
    return { list, hasMore: false, nextOffset: start };
  }
  const end = Math.min(start + PAGE_SIZE, MAX_FEED_ITEMS);
  const chunk = [];
  for (let i = start; i < end; i += 1) {
    const src = sources[i % sources.length];
    const round = Math.floor(i / sources.length);
    const base = decorateRow(src);
    chunk.push({
      ...base,
      feedKey: `${src.id}_r${round}_i${i}`,
    });
  }
  return {
    list: list.concat(chunk),
    hasMore: end < MAX_FEED_ITEMS,
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
