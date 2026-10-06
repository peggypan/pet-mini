const POSTER_W = 750;
const POSTER_H = 1200;
/** 底部留给小程序码 + 文案的安全区（px） */
const QR_FOOTER_H = 210;
const PAGE_PAD = 40;

const STYLES = [
  { id: 'fresh', name: '清新蓝天' },
  { id: 'magazine', name: '杂志封面' },
  { id: 'cute', name: '萌宠气泡' },
];

function hashCode(str) {
  let hash = 0;
  const s = String(str || 'pet-mini');
  for (let i = 0; i < s.length; i += 1) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function isReservedModule(row, col, modules) {
  const inTL = row < 8 && col < 8;
  const inTR = row < 8 && col >= modules - 8;
  const inBL = row >= modules - 8 && col < 8;
  return inTL || inTR || inBL;
}

function drawFinder(ctx, x, y, moduleSize) {
  const s = moduleSize * 7;
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + moduleSize, y + moduleSize, s - moduleSize * 2, s - moduleSize * 2);
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(x + moduleSize * 2, y + moduleSize * 2, s - moduleSize * 4, s - moduleSize * 4);
}

function drawMiniQr(ctx, x, y, size, seed) {
  const modules = 21;
  const moduleSize = size / modules;
  const hash = hashCode(seed);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, size, size);

  drawFinder(ctx, x, y, moduleSize);
  drawFinder(ctx, x + size - moduleSize * 7, y, moduleSize);
  drawFinder(ctx, x, y + size - moduleSize * 7, moduleSize);

  ctx.fillStyle = '#1A1A1A';
  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      if (isReservedModule(row, col, modules)) continue;
      if ((hash + row * 31 + col * 17) % 3 !== 0) {
        ctx.fillRect(x + col * moduleSize, y + row * moduleSize, moduleSize, moduleSize);
      }
    }
  }

  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.11;
  ctx.fillStyle = '#4DA7F8';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1A1A1A';
  ctx.font = `bold ${Math.floor(r * 1.1)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('宠', cx, cy + 1);
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth, maxLines) {
  const chars = String(text || '').split('');
  const lines = [];
  let line = '';
  chars.forEach((ch) => {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, maxLines || 3);
}

function loadCanvasImage(canvas, src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('empty src'));
      return;
    }
    wx.getImageInfo({
      src,
      success: (info) => {
        const img = canvas.createImage();
        img.onload = () => resolve({ img, info });
        img.onerror = reject;
        img.src = info.path;
      },
      fail: reject,
    });
  });
}

function drawCover(ctx, img, x, y, w, h, mode) {
  if (!img) return;
  const iw = img.width;
  const ih = img.height;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  if (mode === 'circle') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
    ctx.clip();
  } else {
    ctx.save();
    roundRect(ctx, x, y, w, h, mode === 'round' ? 28 : 0);
    ctx.clip();
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function drawMetaBlock(ctx, event, x, y, color, subColor, options = {}) {
  const lineH = options.lineHeight || 40;
  const rows = [
    `时间  ${event.time || '待定'}`,
    `地点  ${event.place || '同城'}`,
    `费用  ${event.fee || '免费报名'}`,
    `名额  剩余 ${event.remain != null ? event.remain : event.seats || '—'}`,
  ].slice(0, options.maxRows || 4);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  rows.forEach((row, i) => {
    ctx.fillStyle = i === 0 ? color : subColor;
    ctx.font = i === 0 ? '600 26px sans-serif' : '24px sans-serif';
    ctx.fillText(row, x, y + i * lineH);
  });
  return y + rows.length * lineH;
}

function drawQrImage(ctx, qrImage, x, y, qrSize, fallbackSeed) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, qrSize, qrSize);
  if (qrImage) {
    ctx.drawImage(qrImage, x, y, qrSize, qrSize);
  } else {
    drawMiniQr(ctx, x, y, qrSize, fallbackSeed);
  }
}

function drawQrBlock(ctx, event, x, y, qrSize, labelColor, subColor, qrImage, options = {}) {
  const pad = options.innerPad != null ? options.innerPad : 14;
  const caption = options.caption || '长按识别小程序';
  const subCaption = options.subCaption || '扫码查看活动详情';
  const boxW = qrSize + pad * 2;
  const captionH = options.compactCaption ? 36 : 48;
  const boxH = qrSize + pad * 2 + captionH;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.12)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = options.boxFill || '#FFFFFF';
  roundRect(ctx, x, y, boxW, boxH, 18);
  ctx.fill();
  ctx.restore();

  drawQrImage(ctx, qrImage, x + pad, y + pad, qrSize, `event-${event.id}-${options.seed || 'qr'}`);
  ctx.fillStyle = labelColor;
  ctx.font = '600 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(caption, x + boxW / 2, y + pad + qrSize + 10);
  if (!options.compactCaption && subCaption) {
    ctx.fillStyle = subColor;
    ctx.font = '18px sans-serif';
    ctx.fillText(subCaption, x + boxW / 2, y + pad + qrSize + 34);
  }
  return { boxW, boxH };
}

/** 右下角固定小程序码，避免与正文重叠、被画布裁切 */
function drawFooterQr(ctx, event, qrImage, options = {}) {
  const qrSize = options.qrSize || 136;
  const pad = PAGE_PAD;
  const innerPad = 14;
  const captionH = options.compactCaption ? 36 : 48;
  const boxW = qrSize + innerPad * 2;
  const boxH = qrSize + innerPad * 2 + captionH;
  const x = POSTER_W - pad - boxW;
  const y = POSTER_H - pad - boxH;
  drawQrBlock(
    ctx,
    event,
    x,
    y,
    qrSize,
    options.labelColor || '#1A1A1A',
    options.subColor || '#888888',
    qrImage,
    { ...options, seed: options.seed || 'foot' },
  );
  return { x, y, boxW, boxH, qrSize, contentMaxY: y - 16 };
}

/** 底部居中小程序码（杂志风） */
function drawCenterFooterQr(ctx, event, qrImage, options = {}) {
  const qrSize = options.qrSize || 148;
  const innerPad = 12;
  const captionH = 40;
  const boxW = qrSize + innerPad * 2;
  const boxH = qrSize + innerPad * 2 + captionH;
  const x = (POSTER_W - boxW) / 2;
  const y = POSTER_H - PAGE_PAD - boxH;
  drawQrBlock(
    ctx,
    event,
    x,
    y,
    qrSize,
    options.labelColor || '#FFFFFF',
    options.subColor || 'rgba(255,255,255,0.75)',
    qrImage,
    {
      ...options,
      compactCaption: true,
      caption: options.caption || '长按识别 · 宠头头',
      subCaption: '',
      boxFill: 'rgba(255,255,255,0.96)',
      seed: options.seed || 'center',
    },
  );
  return { x, y, boxW, boxH, contentMaxY: y - 24 };
}

function drawStyleFresh(ctx, event, coverImg, qrImage) {
  const grd = ctx.createLinearGradient(0, 0, POSTER_W, POSTER_H);
  grd.addColorStop(0, '#E8F4FF');
  grd.addColorStop(0.55, '#B8E0FF');
  grd.addColorStop(1, '#4DA7F8');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  ctx.save();
  ctx.shadowColor = 'rgba(30,136,229,0.25)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  drawCover(ctx, coverImg, 36, 44, POSTER_W - 72, 480, 'round');
  ctx.restore();

  const cardX = 28;
  const cardY = 544;
  const cardW = POSTER_W - 56;
  const cardH = POSTER_H - cardY - 28;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fill();

  const foot = drawFooterQr(ctx, event, qrImage, {
    qrSize: 128,
    labelColor: '#1E88E5',
    subColor: '#999999',
    seed: 'fresh',
  });
  const textRight = foot.x - 20;
  const innerX = 52;

  const tagText = event.category || event.tag || '同城活动';
  ctx.font = '600 22px sans-serif';
  ctx.textAlign = 'left';
  const tagW = Math.min(240, ctx.measureText(tagText).width + 48);
  ctx.fillStyle = 'rgba(77, 167, 248, 0.18)';
  roundRect(ctx, innerX, cardY + 28, tagW, 40, 12);
  ctx.fill();
  ctx.fillStyle = '#1E88E5';
  ctx.fillText(tagText, innerX + 20, cardY + 54);

  ctx.fillStyle = '#1A1A1A';
  ctx.font = '800 40px sans-serif';
  const titleLines = wrapText(ctx, event.title, textRight - innerX, 2);
  titleLines.forEach((line, i) => {
    ctx.fillText(line, innerX, cardY + 100 + i * 50);
  });

  const metaY = cardY + 100 + titleLines.length * 50 + 16;
  drawMetaBlock(ctx, event, innerX, metaY, '#1A1A1A', '#666666', {
    maxRows: 3,
    lineHeight: 36,
  });

  const brandMid = foot.y + foot.boxH / 2;
  ctx.fillStyle = '#1fb896';
  ctx.font = '700 26px sans-serif';
  ctx.fillText(event.host || '主理人', innerX, brandMid - 8);
  ctx.fillStyle = '#1E88E5';
  ctx.font = '800 30px sans-serif';
  ctx.fillText('宠头头', innerX, brandMid + 32);
}

function drawStyleMagazine(ctx, event, coverImg, qrImage) {
  drawCover(ctx, coverImg, 0, 0, POSTER_W, POSTER_H, 'fill');

  const foot = drawCenterFooterQr(ctx, event, qrImage, {
    qrSize: 140,
    seed: 'mag',
    labelColor: '#333333',
  });
  const contentBottom = foot.contentMaxY;

  const overlay = ctx.createLinearGradient(0, contentBottom - 420, 0, POSTER_H);
  overlay.addColorStop(0, 'rgba(0,0,0,0)');
  overlay.addColorStop(0.35, 'rgba(0,0,0,0.55)');
  overlay.addColorStop(1, 'rgba(0,0,0,0.82)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, contentBottom - 420, POSTER_W, POSTER_H - contentBottom + 420);

  const pad = 48;
  let y = contentBottom - 320;

  const badge = event.sourceText || event.category || '宠友活动';
  ctx.fillStyle = 'rgba(91, 184, 255, 0.92)';
  roundRect(ctx, pad, y, Math.min(220, ctx.measureText(badge).width + 40), 36, 8);
  ctx.fill();
  ctx.fillStyle = '#0D3B66';
  ctx.font = '700 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, pad + 16, y + 18);
  y += 52;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 46px sans-serif';
  ctx.textBaseline = 'top';
  const titleMaxW = POSTER_W - pad * 2;
  const titleLines = wrapText(ctx, event.title, titleMaxW, 2);
  titleLines.forEach((line, i) => {
    ctx.fillText(line, pad, y + i * 54);
  });
  y += titleLines.length * 54 + 12;

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '26px sans-serif';
  const desc = wrapText(ctx, event.desc || event.place || '', titleMaxW, 1);
  desc.forEach((line, i) => {
    ctx.fillText(line, pad, y + i * 34);
  });
  y += desc.length * 34 + 8;

  drawMetaBlock(ctx, event, pad, y, '#FFFFFF', 'rgba(255,255,255,0.78)', {
    maxRows: 2,
    lineHeight: 34,
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1fb896';
  ctx.font = '700 24px sans-serif';
  ctx.fillText(event.host || '主理人', pad, foot.y - 28);
}

function drawStyleCute(ctx, event, coverImg, qrImage) {
  const bg = ctx.createLinearGradient(0, 0, 0, POSTER_H);
  bg.addColorStop(0, '#FFF8F0');
  bg.addColorStop(1, '#FFE8F0');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  ctx.fillStyle = 'rgba(255, 182, 193, 0.4)';
  ctx.beginPath();
  ctx.arc(100, 140, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 143, 171, 0.25)';
  ctx.beginPath();
  ctx.arc(660, 220, 80, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.shadowColor = 'rgba(255, 107, 157, 0.35)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  drawCover(ctx, coverImg, (POSTER_W - 320) / 2, 56, 320, 320, 'circle');
  ctx.restore();

  const foot = drawCenterFooterQr(ctx, event, qrImage, {
    qrSize: 128,
    labelColor: '#FF6B9D',
    seed: 'cute',
    caption: '扫码一起玩',
  });
  const panelTop = 400;
  const panelH = foot.contentMaxY - panelTop + 8;

  ctx.fillStyle = '#FF8FAB';
  roundRect(ctx, 56, panelTop, POSTER_W - 112, panelH, 32);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 76, panelTop + 24, POSTER_W - 152, panelH - 48, 24);
  ctx.fill();

  const cx = POSTER_W / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF6B9D';
  ctx.font = '700 22px sans-serif';
  ctx.fillText(event.tag || event.category || '宠友活动', cx, panelTop + 56);

  ctx.fillStyle = '#1A1A1A';
  ctx.font = '800 38px sans-serif';
  const titleLines = wrapText(ctx, event.title, POSTER_W - 200, 2);
  titleLines.forEach((line, i) => {
    ctx.fillText(line, cx, panelTop + 96 + i * 48);
  });

  const metaY = panelTop + 96 + titleLines.length * 48 + 12;
  ctx.textAlign = 'left';
  drawMetaBlock(ctx, event, 100, metaY, '#1A1A1A', '#666666', {
    maxRows: 3,
    lineHeight: 34,
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#1fb896';
  ctx.font = '700 24px sans-serif';
  ctx.fillText(`${event.host || '主理人'} 邀你来玩`, cx, foot.y - 36);

  ctx.fillStyle = '#FF8FAB';
  ctx.font = '700 24px sans-serif';
  ctx.fillText('宠头头 · 一起带毛孩出门', cx, panelTop + panelH - 28);
}

function drawPoster(ctx, styleId, event, coverImg, qrImage) {
  if (styleId === 'fresh') drawStyleFresh(ctx, event, coverImg, qrImage);
  else if (styleId === 'magazine') drawStyleMagazine(ctx, event, coverImg, qrImage);
  else drawStyleCute(ctx, event, coverImg, qrImage);
}

function prepareCanvas(component, canvasId) {
  return new Promise((resolve, reject) => {
    const query = component.createSelectorQuery();
    query.select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        const item = res && res[0];
        if (!item || !item.node) {
          reject(new Error(`canvas ${canvasId} not found`));
          return;
        }
        const canvas = item.node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        canvas.width = POSTER_W * dpr;
        canvas.height = POSTER_H * dpr;
        ctx.scale(dpr, dpr);
        resolve({ canvas, ctx });
      });
  });
}

function exportCanvas(canvas) {
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      width: POSTER_W,
      height: POSTER_H,
      destWidth: POSTER_W * 2,
      destHeight: POSTER_H * 2,
      fileType: 'png',
      quality: 1,
      success: (res) => resolve(res.tempFilePath),
      fail: reject,
    });
  });
}

async function loadCoverImage(canvas, src) {
  try {
    const loaded = await loadCanvasImage(canvas, src);
    return loaded.img;
  } catch (e) {
    return null;
  }
}

async function loadWxacodeImage(canvas, eventId) {
  try {
    const { fetchEventWxacodePath } = require('./wxacode-cloud');
    const path = await fetchEventWxacodePath(eventId);
    const loaded = await loadCanvasImage(canvas, path);
    return loaded.img;
  } catch (e) {
    console.warn('[event-poster] wxacode', e);
    return null;
  }
}

async function generateEventPosters(component, event) {
  const coverSrc = event.cover || '/assets/mock/real_pup.jpg';
  const posters = [];
  let qrImage = null;
  for (let i = 0; i < STYLES.length; i += 1) {
    const style = STYLES[i];
    const { canvas, ctx } = await prepareCanvas(component, `posterCanvas${i}`);
    if (i === 0) {
      qrImage = await loadWxacodeImage(canvas, event.id);
    }
    const coverImg = await loadCoverImage(canvas, coverSrc);
    ctx.clearRect(0, 0, POSTER_W, POSTER_H);
    drawPoster(ctx, style.id, event, coverImg, qrImage);
    const url = await exportCanvas(canvas);
    posters.push({ ...style, url });
  }
  return posters;
}

module.exports = {
  POSTER_W,
  POSTER_H,
  STYLES,
  generateEventPosters,
  drawMiniQr,
  roundRect,
  wrapText,
  drawCover,
  prepareCanvas,
  exportCanvas,
  loadCanvasImage,
};
