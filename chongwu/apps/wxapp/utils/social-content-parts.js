/** 帖子正文：【标签】与 #话题 分段，便于列表/详情分色展示 */
const HASHTAG_RE = /(#[^\s#【】]+)/g;
const PART_RE = /(【[^】]+】|#[^\s#【】]+)/g;

function tagType(tagText) {
  const t = String(tagText || '');
  if (/寻宠/.test(t)) return 'lost';
  if (/招领/.test(t)) return 'found';
  if (/救助/.test(t)) return 'rescue';
  if (/领养/.test(t)) return 'adopt';
  return 'highlight';
}

function splitPlainSegment(text) {
  const s = String(text || '');
  if (!s) return [];
  const parts = [];
  let last = 0;
  let m;
  const re = new RegExp(HASHTAG_RE.source, 'g');
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) {
      parts.push({ text: s.slice(last, m.index), tag: false });
    }
    const token = m[1];
    parts.push({ text: token, tag: true, type: 'hashtag', topic: token });
    last = m.index + token.length;
  }
  if (last < s.length) {
    parts.push({ text: s.slice(last), tag: false });
  }
  return parts.length ? parts : [{ text: s, tag: false }];
}

function parseContentParts(content) {
  const s = String(content || '');
  if (!s) return [];
  const parts = [];
  let last = 0;
  let m;
  const re = new RegExp(PART_RE.source, 'g');
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) {
      parts.push(...splitPlainSegment(s.slice(last, m.index)));
    }
    const text = m[1];
    if (text.startsWith('【')) {
      parts.push({ text, tag: true, type: tagType(text) });
    } else {
      parts.push({ text, tag: true, type: 'hashtag', topic: text });
    }
    last = m.index + text.length;
  }
  if (last < s.length) {
    parts.push(...splitPlainSegment(s.slice(last)));
  }
  return parts.length ? parts : [{ text: s, tag: false }];
}

function withContentParts(post) {
  if (!post) return post;
  return {
    ...post,
    contentParts: parseContentParts(post.content),
  };
}

module.exports = {
  parseContentParts,
  withContentParts,
};
