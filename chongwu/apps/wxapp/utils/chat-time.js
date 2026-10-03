function pad(n) {
  return n < 10 ? `0${n}` : String(n);
}

/** 会话气泡旁时间（IM 风格） */
function formatChatMessageTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const sameDay =
    d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
  if (sameDay) return hm;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear()
    && d.getMonth() === yesterday.getMonth()
    && d.getDate() === yesterday.getDate();
  if (isYesterday) return `昨天 ${hm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

function decorateChatMessages(list) {
  return (list || []).map((m) => ({
    ...m,
    timeLabel: formatChatMessageTime(m.createdAt) || m.time || '',
  }));
}

module.exports = {
  formatChatMessageTime,
  decorateChatMessages,
};
