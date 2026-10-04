const store = require('./store');
const { getDefaultPet } = require('./catalog');

const TYPE_CONFIG = {
  follow: {
    title: '关注',
    empty: '还没有关注宠友',
    load: () => store.listFollows(),
  },
  fans: {
    title: '粉丝',
    empty: '还没有粉丝',
    load: () => store.listFollowersOfMe(),
  },
  heart: {
    title: '喜欢',
    empty: '还没有喜欢记录',
    load: () => store.listHeartLikes(),
  },
  likesCollects: {
    title: '获赞和收藏',
    empty: '还没有收藏搭子',
    load: () => store.listCollects(),
  },
};

function mapPeerRow(item) {
  if (!item) return null;
  const defaultAvatar = getDefaultPet().avatar;
  let sub = '';
  if (item.source === 'discover') sub = '来自搭搭';
  else if (item.source === 'chat') sub = '来自私信';
  else if (item.collectedAt) sub = '收藏搭子';
  else if (item.followedAt) sub = '宠友';
  return {
    id: item.id,
    userName: item.userName || '宠友',
    petName: item.petName || '',
    avatar: item.avatar || defaultAvatar,
    sub,
  };
}

function buildProfileStatList(type) {
  const key = TYPE_CONFIG[type] ? type : 'follow';
  const cfg = TYPE_CONFIG[key];
  let summary = '';
  if (key === 'likesCollects') {
    const social = store.getProfileSocialStats();
    const collects = store.listCollects().length;
    summary = `内容获赞与收藏 ${social.likesAndCollects} · 收藏搭子 ${collects}`;
  }
  const raw = (cfg.load && cfg.load()) || [];
  const list = raw.map(mapPeerRow).filter(Boolean);
  return {
    type: key,
    title: cfg.title,
    summary,
    list,
    emptyText: cfg.empty,
  };
}

module.exports = {
  TYPE_CONFIG,
  buildProfileStatList,
};
