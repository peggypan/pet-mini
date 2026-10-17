/** 与小程序 utils/buddy-expect-expiry.js 保持同步 */
const VAGUE_PATTERN = /可协商|随时|面议|待定|长期有效|长期|每日|每天|工作日|周末|下月|月初|月末/;

function trim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function isVagueExpectTime(expectTime) {
  const raw = trim(expectTime);
  if (!raw) return true;
  if (raw === '可协商') return true;
  if (/\d{1,2}\s*月\s*\d{1,2}\s*日/.test(raw)) return false;
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(raw)) return false;
  if (VAGUE_PATTERN.test(raw)) return true;
  return false;
}

function parseExpectDeadline(expectTime, nowInput) {
  const raw = trim(expectTime);
  if (!raw || isVagueExpectTime(raw)) return null;
  const parsedIso = Date.parse(raw);
  if (!Number.isNaN(parsedIso)) return new Date(parsedIso);
  const now = nowInput instanceof Date ? nowInput : new Date();
  const mdhm = raw.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日(?:\s*(\d{1,2}):(\d{2}))?/);
  if (mdhm) {
    const month = Number(mdhm[1]) - 1;
    const day = Number(mdhm[2]);
    const hasClock = mdhm[3] != null;
    const hour = hasClock ? Number(mdhm[3]) : 23;
    const minute = hasClock ? Number(mdhm[4]) : 59;
    const second = hasClock ? 0 : 59;
    let year = now.getFullYear();
    let d = new Date(year, month, day, hour, minute, second);
    if (d.getTime() < now.getTime() - 86400000 * 45) {
      d = new Date(year + 1, month, day, hour, minute, second);
    }
    return d;
  }
  return null;
}

function isBuddyExpectExpired(buddy, nowInput) {
  const deadline = parseExpectDeadline(buddy && buddy.expectTime, nowInput);
  if (!deadline) return false;
  const now = nowInput instanceof Date ? nowInput : new Date();
  return now.getTime() > deadline.getTime();
}

module.exports = {
  isBuddyExpectExpired,
};
