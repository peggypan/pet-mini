const TYPES = ['text', 'image', 'video'];

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

const POST_REFS = ['social_posts', 'local_posts'];

function pickCommentPayload(raw) {
  const p = raw || {};
  const postRef = POST_REFS.includes(p.postRef) ? p.postRef : 'social_posts';
  let type = TYPES.includes(p.type) ? p.type : 'text';
  const content = trim(p.content);
  const url = trim(p.url);
  const poster = trim(p.poster);
  if (type === 'text' && !content && url) {
    type = poster ? 'video' : 'image';
  }
  return {
    postId: trim(p.postId),
    postRef,
    userName: trim(p.userName),
    avatar: trim(p.avatar),
    type,
    content,
    url,
    poster,
    parentId: trim(p.parentId),
    replyToUserName: trim(p.replyToUserName),
  };
}

function validateComment(body) {
  if (!body.postId) return '缺少 postId';
  if (body.type === 'text') {
    if (!body.content) return '请输入评论内容';
  } else if (body.type === 'image') {
    if (!body.url && !body.content) return '请上传图片或填写说明';
  } else if (body.type === 'video') {
    if (!body.url) return '请上传视频';
  }
  return '';
}

function publicComment(doc, viewerOpenid) {
  if (!doc) return null;
  const { _id, _openid, ...rest } = doc;
  const isMine = viewerOpenid && (doc.openid === viewerOpenid || doc._openid === viewerOpenid);
  return {
    id: _id,
    ...rest,
    isMine: !!isMine,
    userName: isMine ? '我' : rest.userName,
    time: '刚刚',
  };
}

module.exports = {
  pickCommentPayload,
  validateComment,
  publicComment,
  TYPES,
  POST_REFS,
};
