function ok(data, message = 'ok') {
  return { code: 0, message, data };
}

function fail(code, message, details) {
  return { code: code || 1, message, details: details || null, data: null };
}

module.exports = { ok, fail };
