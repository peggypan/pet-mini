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

/** @returns {Date|null} 截止时刻；模糊文案返回 null（不过期） */
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

  const ymd = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (ymd) {
    const hasClock = ymd[4] != null;
    return new Date(
      Number(ymd[1]),
      Number(ymd[2]) - 1,
      Number(ymd[3]),
      hasClock ? Number(ymd[4]) : 23,
      hasClock ? Number(ymd[5]) : 59,
      hasClock ? 0 : 59,
    );
  }

  const hm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      Number(hm[1]),
      Number(hm[2]),
      0,
    );
  }

  return null;
}

function isBuddyExpectExpired(buddy, nowInput) {
  const deadline = parseExpectDeadline(buddy && buddy.expectTime, nowInput);
  if (!deadline) return false;
  const now = nowInput instanceof Date ? nowInput : new Date();
  return now.getTime() > deadline.getTime();
}

function buddyActiveInFeed(buddy) {
  return !isBuddyExpectExpired(buddy);
}

function attachBuddyExpiryMeta(buddy) {
  if (!buddy) return buddy;
  const expired = isBuddyExpectExpired(buddy);
  return {
    ...buddy,
    expectExpired: expired,
    expectActive: !expired,
  };
}

function parseExpectTimeToForm(expectTime) {
  const raw = trim(expectTime);
  const out = { expectDate: '', expectTimeValue: '', expectDateLabel: '' };
  if (!raw) return out;

  const md = raw.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (md) {
    const year = new Date().getFullYear();
    const m = String(md[1]).padStart(2, '0');
    const d = String(md[2]).padStart(2, '0');
    out.expectDate = `${year}-${m}-${d}`;
    out.expectDateLabel = `${Number(md[1])}月${Number(md[2])}日`;
  }

  const ymd = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd && !out.expectDate) {
    out.expectDate = `${ymd[1]}-${String(ymd[2]).padStart(2, '0')}-${String(ymd[3]).padStart(2, '0')}`;
    out.expectDateLabel = `${Number(ymd[2])}月${Number(ymd[3])}日`;
  }

  const hm = raw.match(/(\d{1,2}):(\d{2})/);
  if (hm) {
    out.expectTimeValue = `${String(hm[1]).padStart(2, '0')}:${hm[2]}`;
  }
  return out;
}

function isExpectTimeInFuture(expectTime, nowInput) {
  const deadline = parseExpectDeadline(expectTime, nowInput);
  if (!deadline) return true;
  const now = nowInput instanceof Date ? nowInput : new Date();
  return deadline.getTime() > now.getTime();
}

module.exports = {
  isVagueExpectTime,
  parseExpectDeadline,
  isBuddyExpectExpired,
  buddyActiveInFeed,
  attachBuddyExpiryMeta,
  parseExpectTimeToForm,
  isExpectTimeInFuture,
};
