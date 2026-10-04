const store = require('./store');
const { displayPublishTime } = require('./relative-time');
const { normalizePostMedia } = require('./social-post-media');
const { MOCK_PET } = require('./mock');

const REF_LOCAL = 'local_posts';

function buildLocalContent(local) {
  const lines = [
    local.desc || '',
    local.location ? `地点：${local.location}` : '',
    local.contact ? `联系：${local.contact}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

function localPostToDetailView(local) {
  if (!local) return null;
  const content = buildLocalContent(local);
  const row = {
    id: String(local.id),
    userName: local.userName || '宠友',
    petName: '',
    avatar: local.avatar || MOCK_PET.avatar,
    zone: 'dog',
    topic: '',
    content,
    title: local.title || '',
    lostType: local.type || 'adopt',
    location: local.location || '',
    geoLocation: local.geoLocation || null,
    image: local.image || '',
    images: local.images || [],
    mediaList: local.mediaList || [],
    likes: local.likes || 0,
    comments: local.comments || 0,
    shares: local.shares || 0,
    liked: !!local.liked,
    time: displayPublishTime(local) || local.time || '',
    isMine: local.isMine,
    openid: local.openid,
    _openid: local._openid,
  };
  return normalizePostMedia(row);
}

function findLocalPostForDetail(id) {
  const local = store.getLocalPost(id);
  if (!local) return null;
  return localPostToDetailView(local);
}

module.exports = {
  REF_LOCAL,
  localPostToDetailView,
  findLocalPostForDetail,
  buildLocalContent,
};
