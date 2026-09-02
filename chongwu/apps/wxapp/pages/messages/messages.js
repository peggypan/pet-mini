const store = require('../../utils/store');

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

Page({
  data: {
    messages: [],
  },

  onShow() {
    const messages = store.listMessages().map((m) => ({
      ...m,
      timeText: formatTime(m.createdAt),
    }));
    this.setData({ messages });
    store.markMessagesRead();
  },
});
