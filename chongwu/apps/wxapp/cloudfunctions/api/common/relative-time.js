function pad(n) {
  return n < 10 ? `0${n}` : String(n);
}

function parseTime(input) {
  if (input == null || input === '') return null;
  if (typeof input === 'number') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'object') {
    if (input instanceof Date) {
      return Number.isNaN(input.getTime()) ? null : input;
    }
    if (input.$date != null) return parseTime(input.$date);
    if (input.type === 'date' && input.value != null) return parseTime(input.value);
    if (typeof input.getTime === 'function') {
      const t = input.getTime();
      if (!Number.isNaN(t)) return new Date(t);
    }
    return null;
  }
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

function formatPublishTime(input, nowInput) {
  const d = parseTime(input);
  if (!d) return '';
  const now = parseTime(nowInput) || new Date();
  let diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) diffMs = 0;

  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return '刚刚';

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分钟前`;

  const hour = Math.floor(min / 60);
  if (hour < 24 && isSameDay(d, now)) return `${hour}小时前`;

  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return `昨天 ${hm}`;

  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

module.exports = {
  formatPublishTime,
};
