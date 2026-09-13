/** 宠友圈 · 猫猫狗狗表情包 */

const CAT_EMOJIS = [
  '🐱', '🐈', '🐈‍⬛', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
  '🐾', '🎀', '🐟', '🥛', '💤', '🧶', '😺✨', '🐱💕',
];

const DOG_EMOJIS = [
  '🐶', '🐕', '🦮', '🐩', '🐕‍🦺', '🦴', '🎾', '🏃', '🤗', '😋', '🥰', '😎',
  '🐾', '💛', '🦴', '🎉', '🐶❤️', '🐕‍🦺✨', '🦴🎾',
];

const COMMON_EMOJIS = [
  '❤️', '👍', '😂', '🥹', '🔥', '🎉', '🤝', '✨', '💬', '🌟', '👏', '😭',
];

const EMOJI_TABS = [
  { id: 'cat', name: '🐱 猫猫' },
  { id: 'dog', name: '🐶 狗狗' },
  { id: 'common', name: '常用' },
];

function getEmojiList(tab) {
  if (tab === 'cat') return CAT_EMOJIS;
  if (tab === 'dog') return DOG_EMOJIS;
  return COMMON_EMOJIS;
}

module.exports = {
  CAT_EMOJIS,
  DOG_EMOJIS,
  COMMON_EMOJIS,
  EMOJI_TABS,
  getEmojiList,
};
