/** 解析 event.seats 如 "2/20" */
function parseSeatsString(seats) {
  const raw = String(seats || '').trim();
  const m = raw.match(/^(\d+)\s*\/\s*(\d+)/);
  if (m) {
    return { signupCount: Number(m[1]) || 0, maxPeople: Number(m[2]) || 20 };
  }
  const cap = Number(String(raw).replace(/\D/g, '')) || 20;
  return { signupCount: 0, maxPeople: cap };
}

/**
 * 统一名额：已报 signupCount / 上限 maxPeople，剩余 remain
 */
function resolveEventQuota(event) {
  const e = event || {};
  let maxPeople = Number(e.maxPeople);
  if (!Number.isFinite(maxPeople) || maxPeople <= 0) {
    maxPeople = parseSeatsString(e.seats).maxPeople;
  }

  let signupCount = e.signupCount;
  if (signupCount == null || signupCount === '') {
    signupCount = parseSeatsString(e.seats).signupCount;
  }
  signupCount = Math.max(0, Number(signupCount) || 0);

  let remain = e.remain;
  if (remain == null || remain === '') {
    remain = Math.max(0, maxPeople - signupCount);
  } else {
    remain = Math.max(0, Number(remain) || 0);
  }

  if (signupCount + remain > maxPeople) {
    signupCount = Math.min(signupCount, maxPeople);
    remain = Math.max(0, maxPeople - signupCount);
  }

  return {
    maxPeople,
    signupCount,
    remain,
    seats: `${signupCount}/${maxPeople}`,
  };
}

function applyEventQuota(event) {
  if (!event) return event;
  const q = resolveEventQuota(event);
  return {
    ...event,
    maxPeople: q.maxPeople,
    signupCount: q.signupCount,
    remain: q.remain,
    seats: q.seats,
  };
}

module.exports = {
  parseSeatsString,
  resolveEventQuota,
  applyEventQuota,
};
