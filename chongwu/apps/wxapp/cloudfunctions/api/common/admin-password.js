const { scryptSync, randomBytes, timingSafeEqual } = require('crypto');

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };

function hashPassword(password) {
  const plain = typeof password === 'string' ? password : '';
  if (!plain) return '';
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(plain, salt, 64, SCRYPT_PARAMS);
  return `${salt}:${derived.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const plain = typeof password === 'string' ? password : '';
  if (!plain || !stored || typeof stored !== 'string') return false;
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, hashHex] = parts;
  try {
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(plain, salt, 64, SCRYPT_PARAMS);
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch (e) {
    return false;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
};
