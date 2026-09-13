const POSTER_W = 750;
const POSTER_H = 1200;

const STYLES = [
  { id: 'fresh', name: '清新绿野' },
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
  ctx.fillStyle = '#4CE600';
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

function drawMetaBlock(ctx, event, x, y, color, subColor) {
  const rows = [
    `时间  ${event.time || ''}`,
    `地点  ${event.place || ''}`,
    `费用  ${event.fee || ''}`,
    `名额  剩余 ${event.remain != null ? event.remain : event.seats || ''}`,
  ];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  rows.forEach((row, i) => {
    ctx.fillStyle = i === 0 ? color : subColor;
    ctx.font = i === 0 ? '600 28px sans-serif' : '26px sans-serif';
    ctx.fillText(row, x, y + i * 44);
  });
}

function drawQrBlock(ctx, event, x, y, qrSize, labelColor, subColor) {
  const pad = 16;
  const boxW = qrSize + pad * 2;
  const boxH = qrSize + pad * 2 + 52;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, x, y, boxW, boxH, 16);
  ctx.fill();
  drawMiniQr(ctx, x + pad, y + pad, qrSize, `event-${event.id}`);
  ctx.fillStyle = labelColor;
  ctx.font = '600 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('长按识别小程序', x + boxW / 2, y + pad + qrSize + 18);
  ctx.fillStyle = subColor;
  ctx.font = '20px sans-serif';
  ctx.fillText('扫码查看活动详情', x + boxW / 2, y + pad + qrSize + 44);
}

function drawStyleFresh(ctx, event, coverImg) {
  const grd = ctx.createLinearGradient(0, 0, 0, POSTER_H);
  grd.addColorStop(0, '#E8F8EF');
  grd.addColorStop(1, '#D4FF00');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  drawCover(ctx, coverImg, 40, 48, POSTER_W - 80, 520, 'round');

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 32, 600, POSTER_W - 64, 560, 28);
  ctx.fill();

  if (event.tag) {
    ctx.fillStyle = 'rgba(76, 230, 0, 0.2)';
    roundRect(ctx, 56, 628, 120, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#2DB300';
    ctx.font = '600 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(event.tag, 72, 658);
  }

  ctx.fillStyle = '#1A1A1A';
  ctx.font = '800 44px sans-serif';
  ctx.textAlign = 'left';
  const titleLines = wrapText(ctx, event.title, POSTER_W - 120, 2);
  titleLines.forEach((line, i) => {
    ctx.fillText(line, 56, 700 + i * 56);
  });

  drawMetaBlock(ctx, event, 56, 820, '#1A1A1A', '#666666');

  ctx.fillStyle = '#999999';
  ctx.font = '24px sans-serif';
  ctx.fillText(`主理人 · ${event.host || ''}`, 56, 1010);

  ctx.fillStyle = '#2DB300';
  ctx.font = '800 32px sans-serif';
  ctx.fillText('宠头头', 56, 1060);

  drawQrBlock(ctx, event, POSTER_W - 220, 980, 148, '#1A1A1A', '#999999');
}

function drawStyleMagazine(ctx, event, coverImg) {
  drawCover(ctx, coverImg, 0, 0, POSTER_W, POSTER_H, 'fill');

  const overlay = ctx.createLinearGradient(0, POSTER_H * 0.35, 0, POSTER_H);
  overlay.addColorStop(0, 'rgba(0,0,0,0.05)');
  overlay.addColorStop(0.55, 'rgba(0,0,0,0.72)');
  overlay.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  if (event.sourceText) {
    ctx.fillStyle = '#D4FF00';
    ctx.font = '700 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(event.sourceText, 48, 620);
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 52px sans-serif';
  ctx.textAlign = 'left';
  const titleLines = wrapText(ctx, event.title, POSTER_W - 96, 2);
  titleLines.forEach((line, i) => {
    ctx.fillText(line, 48, 680 + i * 64);
  });

  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = '28px sans-serif';
  const desc = wrapText(ctx, event.desc || '', POSTER_W - 96, 2);
  desc.forEach((line, i) => {
    ctx.fillText(line, 48, 820 + i * 40);
  });

  drawMetaBlock(ctx, event, 48, 920, '#FFFFFF', 'rgba(255,255,255,0.75)');

  const qrSize = 168;
  const boxX = (POSTER_W - qrSize - 32) / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, boxX - 16, 1080, qrSize + 32, qrSize + 88, 20);
  ctx.fill();
  drawMiniQr(ctx, boxX, 1096, qrSize, `event-${event.id}-mag`);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('长按识别 · 宠头头小程序', POSTER_W / 2, 1096 + qrSize + 28);
}

function drawStyleCute(ctx, event, coverImg) {
  ctx.fillStyle = '#FFF8F0';
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  ctx.fillStyle = 'rgba(255, 182, 193, 0.35)';
  ctx.beginPath();
  ctx.arc(120, 160, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(640, 260, 70, 0, Math.PI * 2);
  ctx.fill();

  drawCover(ctx, coverImg, (POSTER_W - 360) / 2, 80, 360, 360, 'circle');

  ctx.fillStyle = '#FF8FAB';
  roundRect(ctx, 80, 480, POSTER_W - 160, 620, 36);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 108, 512, POSTER_W - 216, 556, 28);
  ctx.fill();

  ctx.fillStyle = '#FF6B9D';
  ctx.font = '700 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(event.tag || '宠友活动', POSTER_W / 2, 548);

  ctx.fillStyle = '#1A1A1A';
  ctx.font = '800 42px sans-serif';
  const titleLines = wrapText(ctx, event.title, POSTER_W - 260, 2);
  titleLines.forEach((line, i) => {
    ctx.fillText(line, POSTER_W / 2, 600 + i * 52);
  });

  ctx.textAlign = 'left';
  drawMetaBlock(ctx, event, 132, 720, '#1A1A1A', '#666666');

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF8FAB';
  ctx.font = '600 26px sans-serif';
  ctx.fillText(`🐾 ${event.host || '主理人'} 邀你来玩`, POSTER_W / 2, 900);

  drawQrBlock(ctx, event, (POSTER_W - 196) / 2, 940, 132, '#FF6B9D', '#999999');

  ctx.fillStyle = '#FFB6C1';
  ctx.font = '700 28px sans-serif';
  ctx.fillText('宠头头 · 一起带毛孩出门', POSTER_W / 2, 1160);
}

function drawPoster(ctx, styleId, event, coverImg) {
  if (styleId === 'fresh') drawStyleFresh(ctx, event, coverImg);
  else if (styleId === 'magazine') drawStyleMagazine(ctx, event, coverImg);
  else drawStyleCute(ctx, event, coverImg);
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

async function generateEventPosters(component, event) {
  const coverSrc = event.cover || '/assets/mock/real_pup.jpg';
  const posters = [];
  for (let i = 0; i < STYLES.length; i += 1) {
    const style = STYLES[i];
    const { canvas, ctx } = await prepareCanvas(component, `posterCanvas${i}`);
    const coverImg = await loadCoverImage(canvas, coverSrc);
    ctx.clearRect(0, 0, POSTER_W, POSTER_H);
    drawPoster(ctx, style.id, event, coverImg);
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
};
