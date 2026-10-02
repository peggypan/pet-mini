/**
 * 轻量 QR 生成：Byte 模式、纠错 L、版本 1-6
 * 用于活动报名核销码本地绘制
 */

const EXP = new Array(512);
const LOG = new Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x *= 2;
    if (x > 255) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
}());

function gfMul(a, b) {
  if (!a || !b) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/** ECC L：版本 -> [dataCodewords, ecPerBlock, blockCount] */
const VERSIONS = {
  1: [19, 7, 1],
  2: [34, 10, 1],
  3: [55, 15, 1],
  4: [80, 20, 1],
  5: [108, 26, 1],
  6: [136, 18, 2],
};

const ALIGN = {
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
};

const REMAINDER = {
  1: 0,
  2: 7,
  3: 7,
  4: 7,
  5: 7,
  6: 7,
};

function rsGenerator(ecLen) {
  let poly = [1];
  for (let i = 0; i < ecLen; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= gfMul(poly[j], EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecLen) {
  const gen = rsGenerator(ecLen);
  const res = data.slice();
  for (let i = 0; i < ecLen; i += 1) res.push(0);
  for (let i = 0; i < data.length; i += 1) {
    const coef = res[i];
    if (!coef) continue;
    for (let j = 0; j < gen.length; j += 1) {
      res[i + j] ^= gfMul(gen[j], coef);
    }
  }
  return res.slice(data.length);
}

function toUtf8(text) {
  const bytes = [];
  const str = String(text || '');
  for (let i = 0; i < str.length; i += 1) {
    let code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const low = str.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        i += 1;
      }
    }
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return bytes;
}

function chooseVersion(byteLen) {
  const need = byteLen + 2;
  const keys = Object.keys(VERSIONS).map(Number);
  for (let i = 0; i < keys.length; i += 1) {
    const ver = keys[i];
    if (VERSIONS[ver][0] >= need) return ver;
  }
  return 6;
}

function buildDataBits(bytes, version) {
  const [dataCw] = VERSIONS[version];
  const bits = [];
  const push = (val, len) => {
    for (let i = len - 1; i >= 0; i -= 1) bits.push((val >> i) & 1);
  };
  push(0x4, 4);
  push(bytes.length, 8);
  bytes.forEach((b) => push(b, 8));
  const maxBits = dataCw * 8;
  const term = Math.min(4, maxBits - bits.length);
  for (let i = 0; i < term; i += 1) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const pads = [0xec, 0x11];
  let p = 0;
  while (bits.length < maxBits) {
    push(pads[p % 2], 8);
    p += 1;
  }
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j += 1) v = (v << 1) | bits[i + j];
    codewords.push(v);
  }
  return codewords.slice(0, dataCw);
}

function interleave(dataCw, version) {
  const [, ecLen, blockCount] = VERSIONS[version];
  const blockDataLen = dataCw.length / blockCount;
  const blocks = [];
  for (let i = 0; i < blockCount; i += 1) {
    const data = dataCw.slice(i * blockDataLen, (i + 1) * blockDataLen);
    blocks.push({ data, ec: rsEncode(data, ecLen) });
  }
  const out = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i += 1) {
    blocks.forEach((b) => {
      if (i < b.data.length) out.push(b.data[i]);
    });
  }
  for (let i = 0; i < ecLen; i += 1) {
    blocks.forEach((b) => out.push(b.ec[i]));
  }
  return out;
}

function sizeOf(version) {
  return 21 + (version - 1) * 4;
}

function inFinder(x, y, size) {
  const zones = [[0, 0], [size - 7, 0], [0, size - 7]];
  return zones.some(([sx, sy]) => x >= sx && x < sx + 7 && y >= sy && y < sy + 7);
}

function inTiming(x, y) {
  return (y === 6 && x >= 0) || (x === 6 && y >= 0);
}

function inAlign(x, y, version) {
  const pos = ALIGN[version] || [];
  for (let i = 0; i < pos.length; i += 1) {
    for (let j = 0; j < pos.length; j += 1) {
      const cx = pos[i];
      const cy = pos[j];
      if ((cx === 6 && cy === 6) || (cx === 6 && cy === pos[pos.length - 1] && pos[pos.length - 1] === sizeOf(version) - 7)
        || (cy === 6 && cx === pos[pos.length - 1])) {
        continue;
      }
      if (Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2) return true;
    }
  }
  return false;
}

function reserved(x, y, size, version) {
  if (inFinder(x, y, size)) return true;
  if (x === 6 || y === 6) return true;
  if (inAlign(x, y, version)) return true;
  if (y === 8 && (x <= 8 || x >= size - 8)) return true;
  if (x === 8 && (y <= 8 || y >= size - 8)) return true;
  return false;
}

function drawFinder(mod, ox, oy) {
  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 7; x += 1) {
      const edge = x === 0 || x === 6 || y === 0 || y === 6;
      const center = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      mod[oy + y][ox + x] = edge || center ? 1 : 0;
    }
  }
}

function drawAlign(mod, cx, cy) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const a = Math.max(Math.abs(x), Math.abs(y));
      mod[cy + y][cx + x] = a === 0 || a === 2 ? 1 : 0;
    }
  }
}

function maskBit(mask, x, y) {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function formatBits(mask) {
  let bits = (1 << 3) | mask;
  let rem = bits << 10;
  const gen = 0x537;
  for (let i = 14; i >= 10; i -= 1) {
    if ((rem >> i) & 1) rem ^= gen << (i - 10);
  }
  return (bits << 10 | rem) ^ 0x5412;
}

function placeFormat(mod, size, mask) {
  const bits = formatBits(mask);
  const set = (x, y, bit) => { mod[y][x] = bit; };
  for (let i = 0; i < 6; i += 1) set(i, 8, (bits >> i) & 1);
  set(7, 8, (bits >> 6) & 1);
  set(8, 8, (bits >> 7) & 1);
  set(8, 7, (bits >> 8) & 1);
  for (let i = 9; i < 15; i += 1) set(8, 14 - i, (bits >> i) & 1);
  for (let i = 0; i < 8; i += 1) set(size - 1 - i, 8, (bits >> i) & 1);
  for (let i = 8; i < 15; i += 1) set(size - 15 + i, 8, (bits >> i) & 1);
  mod[size - 8][8] = 1;
}

function penalty(mod, size) {
  let score = 0;
  for (let y = 0; y < size; y += 1) {
    let run = 1;
    for (let x = 1; x < size; x += 1) {
      if (mod[y][x] === mod[y][x - 1]) run += 1;
      else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
    if (run >= 5) score += run - 2;
  }
  for (let x = 0; x < size; x += 1) {
    let run = 1;
    for (let y = 1; y < size; y += 1) {
      if (mod[y][x] === mod[y - 1][x]) run += 1;
      else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
    if (run >= 5) score += run - 2;
  }
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const v = mod[y][x];
      if (v === mod[y][x + 1] && v === mod[y + 1][x] && v === mod[y + 1][x + 1]) score += 3;
    }
  }
  let dark = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) dark += mod[y][x];
  }
  score += Math.abs(Math.floor((dark * 100) / (size * size) / 5) - 10) * 10;
  return score;
}

function fillData(mod, size, version, data) {
  const bits = [];
  data.forEach((cw) => {
    for (let i = 7; i >= 0; i -= 1) bits.push((cw >> i) & 1);
  });
  for (let i = 0; i < (REMAINDER[version] || 0); i += 1) bits.push(0);
  let bit = 0;
  let up = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let i = 0; i < size; i += 1) {
      const y = up ? size - 1 - i : i;
      for (let dx = 0; dx < 2; dx += 1) {
        const x = col - dx;
        if (reserved(x, y, size, version)) continue;
        mod[y][x] = bits[bit] || 0;
        bit += 1;
      }
    }
    up = !up;
  }
}

/**
 * 将文本编码为 QR 黑白矩阵
 * @param {string} text 二维码内容
 * @returns {number[][]} 1 为黑块
 */
function encodeQrMatrix(text) {
  const bytes = toUtf8(text).slice(0, 130);
  const version = chooseVersion(bytes.length);
  const dataCw = buildDataBits(bytes, version);
  const interleaved = interleave(dataCw, version);
  const size = sizeOf(version);
  let best = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    const mod = Array.from({ length: size }, () => new Array(size).fill(0));
    drawFinder(mod, 0, 0);
    drawFinder(mod, size - 7, 0);
    drawFinder(mod, 0, size - 7);
    const pos = ALIGN[version] || [];
    pos.forEach((cx) => {
      pos.forEach((cy) => {
        if (inFinder(cx, cy, size)) return;
        drawAlign(mod, cx, cy);
      });
    });
    for (let i = 8; i < size - 8; i += 1) {
      mod[6][i] = i % 2 === 0 ? 1 : 0;
      mod[i][6] = i % 2 === 0 ? 1 : 0;
    }
    fillData(mod, size, version, interleaved);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!reserved(x, y, size, version) && maskBit(mask, x, y)) {
          mod[y][x] ^= 1;
        }
      }
    }
    placeFormat(mod, size, mask);
    const score = penalty(mod, size);
    if (score < bestScore) {
      bestScore = score;
      best = mod;
    }
  }
  return best;
}

/**
 * 在 2d canvas 上绘制核销二维码
 * @param {WechatMiniprogram.Page.Instance} page 页面实例
 * @param {string} canvasId canvas 选择器 id
 * @param {string} text 二维码内容
 * @returns {Promise<void>}
 */
function drawQrCanvas(page, canvasId, text) {
  return new Promise((resolve, reject) => {
    wx.createSelectorQuery()
      .in(page)
      .select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        const item = res && res[0];
        if (!item || !item.node) {
          reject(new Error('canvas not found'));
          return;
        }
        const canvas = item.node;
        const ctx = canvas.getContext('2d');
        const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        const dpr = info.pixelRatio || 2;
        const cssW = item.width || 200;
        const px = Math.max(200, Math.floor(cssW * dpr));
        canvas.width = px;
        canvas.height = px;
        const matrix = encodeQrMatrix(text);
        const n = matrix.length;
        const quiet = 2;
        const cells = n + quiet * 2;
        const cell = px / cells;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, px, px);
        ctx.fillStyle = '#111111';
        for (let y = 0; y < n; y += 1) {
          for (let x = 0; x < n; x += 1) {
            if (matrix[y][x]) {
              ctx.fillRect((x + quiet) * cell, (y + quiet) * cell, cell + 0.5, cell + 0.5);
            }
          }
        }
        resolve();
      });
  });
}

module.exports = {
  encodeQrMatrix,
  drawQrCanvas,
};
