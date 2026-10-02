const store = require('./store');

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isSignupNotice(msg) {
  return msg.type === 'event' || msg.title === '活动报名成功';
}

function isSignupNoticeRead(signup, linked) {
  if (signup && signup.noticeRead) return true;
  if (linked) return linked.read !== false;
  return false;
}

/**
 * 通知列表：已报名活动用报名记录补全详情，并去掉重复的旧报名通知
 */
function buildNotices() {
  const messages = store.listMessages();
  const signups = store.listEventSignups().map((row) => {
    const notice = store.buildEventSignupNotice(row);
    const linked = messages.find((m) => String(m.eventId) === String(row.eventId));
    return {
      id: `signup_${row.id}`,
      title: notice.title,
      content: notice.content,
      lines: notice.lines,
      type: 'event',
      eventId: row.eventId,
      url: `/pages/event-detail/event-detail?id=${row.eventId}&ticket=1`,
      createdAt: row.createdAt,
      timeText: formatTime(row.createdAt),
      read: isSignupNoticeRead(row, linked),
    };
  });
  const seen = new Set(signups.map((s) => String(s.eventId)));
  const others = messages
    .filter((m) => {
      if (isSignupNotice(m)) {
        return m.eventId && !seen.has(String(m.eventId));
      }
      return true;
    })
    .map((m) => ({
      ...m,
      read: m.read !== false,
      lines: m.type === 'event' && m.content ? String(m.content).split('\n') : [],
      timeText: formatTime(m.createdAt),
    }));
  return [...signups, ...others].sort((a, b) => {
    const tb = Date.parse(b.createdAt || '') || 0;
    const ta = Date.parse(a.createdAt || '') || 0;
    return tb - ta;
  });
}

function countUnreadNotices() {
  return buildNotices().filter((n) => !n.read).length;
}

module.exports = {
  buildNotices,
  countUnreadNotices,
};
