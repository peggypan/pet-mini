function decodeBase64Utf8(b64) {
  try {
    const ab = wx.base64ToArrayBuffer(String(b64 || '').replace(/\s/g, ''));
    const u8 = new Uint8Array(ab);
    let raw = '';
    for (let i = 0; i < u8.length; i += 1) raw += String.fromCharCode(u8[i]);
    return decodeURIComponent(escape(raw));
  } catch (e) {
    return '';
  }
}

function normalizeScanText(raw) {
  let text = String(raw || '').trim();
  if (!text) return '';
  const charsetPref = text.match(/^(?:utf-8|UTF-8);base64,(.+)$/);
  if (charsetPref) {
    text = decodeBase64Utf8(charsetPref[1]) || text;
  }
  if (/^[A-Za-z0-9+/=]{8,}$/.test(text) && !looksLikePlainTicket(text)) {
    const decoded = decodeBase64Utf8(text);
    if (decoded && looksLikePlainTicket(decoded)) text = decoded.trim();
  }
  return text.trim();
}

function looksLikePlainTicket(text) {
  return /^CTT:/i.test(text)
    || /^[A-Z0-9]{4,8}$/i.test(text)
    || /petmini:\/\/event-checkin/i.test(text)
    || /[?&]code=/i.test(text);
}

/** 从扫码结果解析活动 id 与核销码 */
function parseCheckinFromScan(raw) {
  const text = normalizeScanText(raw);
  if (!text) return { eventId: '', ticketCode: '' };

  const ctt = text.match(/^CTT:(.+):([A-Z0-9]{4,8})$/i);
  if (ctt) {
    return {
      eventId: ctt[1].trim(),
      ticketCode: ctt[2].toUpperCase(),
    };
  }

  const urlMatch = text.match(/petmini:\/\/event-checkin\?[^\s#]+/i)
    || text.match(/event-checkin\?[^\s#\n]+/i);
  if (urlMatch) {
    const seg = urlMatch[0];
    const codeRaw = (seg.match(/(?:^|[?&])code=([^&\s#]+)/i) || [])[1];
    const eventRaw = (seg.match(/(?:^|[?&])eventId=([^&\s#]+)/i) || [])[1];
    if (codeRaw) {
      return {
        eventId: eventRaw ? decodeURIComponent(eventRaw) : '',
        ticketCode: decodeURIComponent(codeRaw).trim().toUpperCase(),
      };
    }
  }

  const looseCode = (text.match(/(?:^|[?&])code=([^&\s#\n]+)/i) || [])[1];
  const looseEvent = (text.match(/(?:^|[?&])eventId=([^&\s#\n]+)/i) || [])[1];
  if (looseCode) {
    return {
      eventId: looseEvent ? decodeURIComponent(looseEvent) : '',
      ticketCode: decodeURIComponent(looseCode).trim().toUpperCase(),
    };
  }

  let ticketCode = '';
  const labeled = text.match(/核销码[：:\s]*([A-Z0-9]{4,8})/i);
  if (labeled) ticketCode = labeled[1].toUpperCase();
  if (!ticketCode) {
    const lines = text.split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i].trim();
      if (/^[A-Z0-9]{6}$/i.test(line)) {
        ticketCode = line.toUpperCase();
        break;
      }
    }
  }
  if (!ticketCode && /^[A-Z0-9]{4,8}$/i.test(text)) {
    ticketCode = text.toUpperCase();
  }
  if (!ticketCode) {
    const anySix = text.match(/(?:^|[^A-Z0-9])([A-Z0-9]{6})(?:$|[^A-Z0-9])/i);
    if (anySix) ticketCode = anySix[1].toUpperCase();
  }

  return { eventId: '', ticketCode };
}

function parseTicketCodeFromScan(raw) {
  return parseCheckinFromScan(raw).ticketCode;
}

function parseEventTitleFromScan(raw) {
  const text = String(raw || '');
  const m = text.match(/活动[：:]\s*(.+)/);
  return m ? m[1].split('\n')[0].trim() : '';
}

module.exports = {
  parseCheckinFromScan,
  parseTicketCodeFromScan,
  parseEventTitleFromScan,
};
