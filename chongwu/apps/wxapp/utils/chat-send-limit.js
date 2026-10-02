const CHAT_LIMIT_TIP = '对方关注或回复你之前，除首条分享评论，只能额外发送1条消息';

function evaluateChatSendLimit({ peerId, messages, peerFollowsMe }) {
  const list = messages || [];
  const peerReplied = list.some((m) => m.from === 'peer');
  const unlocked = !!peerFollowsMe || peerReplied;
  const shareCommentCount = list.filter((m) => m.from === 'me' && m.type === 'shareComment').length;
  const extraSentCount = list.filter((m) => m.from === 'me' && m.type !== 'shareComment').length;

  return {
    unlocked,
    peerFollowsMe: !!peerFollowsMe,
    peerReplied,
    shareCommentCount,
    extraSentCount,
    showTip: !unlocked,
    composerDisabled: !unlocked && extraSentCount >= 1,
    tipText: CHAT_LIMIT_TIP,
  };
}

function canSendOutgoing(state, messageType) {
  if (!state) return { ok: false, reason: CHAT_LIMIT_TIP };
  if (state.unlocked) return { ok: true };
  if (messageType === 'shareComment') {
    if (state.shareCommentCount >= 1) {
      return { ok: false, reason: '首条分享评论已发送' };
    }
    return { ok: true };
  }
  if (state.extraSentCount >= 1) {
    return { ok: false, reason: CHAT_LIMIT_TIP };
  }
  return { ok: true };
}

module.exports = {
  CHAT_LIMIT_TIP,
  evaluateChatSendLimit,
  canSendOutgoing,
};
