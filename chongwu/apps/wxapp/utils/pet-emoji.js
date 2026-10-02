/** 宠物社区 · 聊天/发帖表情包 */

const CAT_EMOJIS = [
  '🐱', '🐈', '🐈‍⬛', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
  '🐾', '🎀', '🐟', '🥛', '💤', '🧶',
];

const DOG_EMOJIS = [
  '🐶', '🐕', '🦮', '🐩', '🐕‍🦺', '🦴', '🎾', '🏃', '🤗', '😋', '🥰', '😎',
  '🐾', '💛', '🎉',
];

const STICKER_EMOJIS = [
  '🫶', '🥳', '😘', '🤣', '😍', '🙏', '💪', '🌈', '🍖', '🥩', '🍗', '🦴',
  '🐾', '✨', '💖', '🎊', '👋', '🫡', '🤳', '📸', '🎥', '💬', '🗣️', '🏠',
  '🌳', '☀️', '🌙', '❤️‍🔥', '😇', '🥺', '😤', '🫠', '🤔', '👀',
];

const COMMON_EMOJIS = [
  '❤️', '👍', '😂', '🥹', '🔥', '🎉', '🤝', '✨', '💬', '🌟', '👏', '😭',
  '🙂', '😊', '😅', '🙈', '💯', '✅', '❌', '‼️', '⁉️',
];

const EMOJI_TABS = [
  { id: 'cat', name: '🐱 猫猫' },
  { id: 'dog', name: '🐶 狗狗' },
  { id: 'sticker', name: '表情包' },
  { id: 'common', name: '常用' },
];

function getEmojiList(tab) {
  if (tab === 'cat') return CAT_EMOJIS;
  if (tab === 'dog') return DOG_EMOJIS;
  if (tab === 'sticker') return STICKER_EMOJIS;
  return COMMON_EMOJIS;
}

module.exports = {
  CAT_EMOJIS,
  DOG_EMOJIS,
  STICKER_EMOJIS,
  COMMON_EMOJIS,
  EMOJI_TABS,
  getEmojiList,
};
