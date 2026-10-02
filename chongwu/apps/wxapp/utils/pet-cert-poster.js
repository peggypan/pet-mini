const {
  POSTER_W,
  POSTER_H,
  drawMiniQr,
  roundRect,
  wrapText,
  drawCover,
  prepareCanvas,
  exportCanvas,
  loadCanvasImage,
} = require('./event-poster');

const STYLES = [
  { id: 'fresh', name: '清新蓝天' },
  { id: 'magazine', name: '杂志封面' },
  { id: 'cute', name: '萌宠气泡' },
];

function vaccineLabel(pet) {
  if (pet.vaccineStatus === 'immune' || pet.verified) return '已免疫 ✓';
  if (pet.vaccineStatus === 'vaccinating') return '免疫中';
  if (pet.vaccineStatus === 'none') return '未免疫';
  return '';
}

function normalizePetForPoster(pet) {
  const p = pet || {};
  const tags = Array.isArray(p.socialTags) ? p.socialTags.filter(Boolean).slice(0, 4) : [];
  const area = (p.activityAreaName || p.activityAreaAddress || '').trim();
  return {
    id: p.id || 'pet',
    name: p.name || '毛孩子',
    breed: p.breed || p.breedName || '品种待完善',
    age: p.age || '',
    personality: p.personality || '活泼友好',
    avatar: p.avatar || p.avatarUrl || p.cover || '',
    vaccine: vaccineLabel(p),
    tags,
    area,
    qrSeed: `pet-cert-${p.id || p.name || 'default'}`,
  };
}

function drawTags(ctx, tags, x, y, maxW, style) {
  if (!tags.length) return y;
  let cx = x;
  let cy = y;
  const gap = 12;
  const padX = 16;
  const padY = 8;
  ctx.font = '600 22px sans-serif';
  tags.forEach((tag) => {
    const tw = ctx.measureText(tag).width + padX * 2;
    if (cx + tw > x + maxW) {
      cx = x;
      cy += 44;
    }
    ctx.fillStyle = style.bg;
    roundRect(ctx, cx, cy, tw, 36, 18);
    ctx.fill();
    ctx.fillStyle = style.fg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, cx + padX, cy + 18);
    cx += tw + gap;
  });
  return cy + 48;
}

function drawPetQrBlock(ctx, pet, x, y, qrSize, labelColor, subColor) {
  const pad = 16;
  const boxW = qrSize + pad * 2;
  const boxH = qrSize + pad * 2 + 52;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, x, y, boxW, boxH, 16);
  ctx.fill();
  drawMiniQr(ctx, x + pad, y + pad, qrSize, pet.qrSeed);
  ctx.fillStyle = labelColor;
  ctx.font = '600 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('长按识别小程序', x + boxW / 2, y + pad + qrSize + 18);
  ctx.fillStyle = subColor;
  ctx.font = '20px sans-serif';
  ctx.fillText('扫码查看电子宠证', x + boxW / 2, y + pad + qrSize + 44);
}

function drawStyleFresh(ctx, pet, avatarImg) {
  const grd = ctx.createLinearGradient(0, 0, 0, POSTER_H);
  grd.addColorStop(0, '#E8F4FF');
  grd.addColorStop(1, '#5BB8FF');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  drawCover(ctx, avatarImg, (POSTER_W - 320) / 2, 56, 320, 320, 'circle');

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 32, 400, POSTER_W - 64, 760, 28);
  ctx.fill();

  if (pet.vaccine) {
    ctx.fillStyle = 'rgba(30, 136, 229, 0.15)';
    roundRect(ctx, 56, 432, 168, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#1E88E5';
    ctx.font = '600 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(pet.vaccine, 72, 462);
  }

  ctx.fillStyle = '#1A1A1A';
  ctx.font = '800 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(pet.name, POSTER_W / 2, 520);

  ctx.fillStyle = '#666666';
  ctx.font = '28px sans-serif';
  const sub = `${pet.breed} · ${pet.age || '年龄保密'} · ${pet.personality}`;
  const subLines = wrapText(ctx, sub, POSTER_W - 120, 2);
  subLines.forEach((line, i) => {
    ctx.fillText(line, POSTER_W / 2, 580 + i * 40);
  });

  let tagY = drawTags(ctx, pet.tags, 56, 660, POSTER_W - 112, {
    bg: 'rgba(77, 167, 248, 0.18)',
    fg: '#1E88E5',
  });

  if (pet.area) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#999999';
    ctx.font = '22px sans-serif';
    ctx.fillText('常活动', 56, tagY);
    ctx.fillStyle = '#1A1A1A';
    ctx.font = '26px sans-serif';
    const areaLines = wrapText(ctx, pet.area, POSTER_W - 280, 2);
    areaLines.forEach((line, i) => {
      ctx.fillText(line, 56, tagY + 32 + i * 36);
    });
  }

  ctx.fillStyle = '#1E88E5';
  ctx.font = '800 30px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('宠头头 · 电子宠证', 56, 1080);

  drawPetQrBlock(ctx, pet, POSTER_W - 220, 980, 148, '#1A1A1A', '#999999');
}

function drawStyleMagazine(ctx, pet, avatarImg) {
  drawCover(ctx, avatarImg, 0, 0, POSTER_W, POSTER_H, 'fill');

  const overlay = ctx.createLinearGradient(0, POSTER_H * 0.4, 0, POSTER_H);
  overlay.addColorStop(0, 'rgba(0,0,0,0.08)');
  overlay.addColorStop(0.5, 'rgba(0,0,0,0.75)');
  overlay.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  ctx.fillStyle = '#5BB8FF';
  ctx.font = '700 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ELECTRONIC PET ID', 48, 640);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 56px sans-serif';
  ctx.fillText(pet.name, 48, 720);

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '28px sans-serif';
  ctx.fillText(`${pet.breed} · ${pet.personality}`, 48, 790);

  if (pet.vaccine) {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    roundRect(ctx, 48, 820, 200, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 24px sans-serif';
    ctx.fillText(pet.vaccine, 64, 850);
  }

  ctx.textAlign = 'left';
  drawTags(ctx, pet.tags, 48, 880, POSTER_W - 96, {
    bg: 'rgba(255,255,255,0.18)',
    fg: '#FFFFFF',
  });

  if (pet.area) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '26px sans-serif';
    ctx.fillText(`📍 ${pet.area}`, 48, 980);
  }

  const qrSize = 168;
  const boxX = (POSTER_W - qrSize - 32) / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, boxX - 16, 1020, qrSize + 32, qrSize + 88, 20);
  ctx.fill();
  drawMiniQr(ctx, boxX, 1036, qrSize, `${pet.qrSeed}-mag`);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('长按识别 · 宠头头小程序', POSTER_W / 2, 1036 + qrSize + 28);
}

function drawStyleCute(ctx, pet, avatarImg) {
  ctx.fillStyle = '#FFF8F0';
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  ctx.fillStyle = 'rgba(255, 182, 193, 0.35)';
  ctx.beginPath();
  ctx.arc(120, 160, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(640, 260, 70, 0, Math.PI * 2);
  ctx.fill();

  drawCover(ctx, avatarImg, (POSTER_W - 360) / 2, 72, 360, 360, 'circle');

  ctx.fillStyle = '#FF8FAB';
  roundRect(ctx, 64, 460, POSTER_W - 128, 640, 36);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 92, 492, POSTER_W - 184, 576, 28);
  ctx.fill();

  ctx.fillStyle = '#FF6B9D';
  ctx.font = '700 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🐾 我家毛孩名片', POSTER_W / 2, 536);

  ctx.fillStyle = '#1A1A1A';
  ctx.font = '800 44px sans-serif';
  ctx.fillText(pet.name, POSTER_W / 2, 600);

  ctx.fillStyle = '#666666';
  ctx.font = '26px sans-serif';
  const line = `${pet.breed} · ${pet.age || '—'} · ${pet.personality}`;
  wrapText(ctx, line, POSTER_W - 240, 2).forEach((l, i) => {
    ctx.fillText(l, POSTER_W / 2, 650 + i * 38);
  });

  if (pet.vaccine) {
    ctx.fillStyle = '#FF8FAB';
    ctx.font = '600 24px sans-serif';
    ctx.fillText(pet.vaccine, POSTER_W / 2, 730);
  }

  ctx.textAlign = 'left';
  drawTags(ctx, pet.tags, 120, 760, POSTER_W - 240, {
    bg: 'rgba(255, 143, 171, 0.2)',
    fg: '#FF6B9D',
  });

  if (pet.area) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#999999';
    ctx.font = '24px sans-serif';
    ctx.fillText(`常活动在 ${pet.area}`, POSTER_W / 2, 880);
  }

  drawPetQrBlock(ctx, pet, (POSTER_W - 196) / 2, 920, 132, '#FF6B9D', '#999999');

  ctx.fillStyle = '#FFB6C1';
  ctx.font = '700 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('宠头头 · 来搭搭认识 TA', POSTER_W / 2, 1140);
}

function drawPoster(ctx, styleId, pet, avatarImg) {
  if (styleId === 'fresh') drawStyleFresh(ctx, pet, avatarImg);
  else if (styleId === 'magazine') drawStyleMagazine(ctx, pet, avatarImg);
  else drawStyleCute(ctx, pet, avatarImg);
}

async function generatePetCertPosters(component, rawPet) {
  const pet = normalizePetForPoster(rawPet);
  const avatarSrc = pet.avatar || '/assets/mock/real_avatar.jpg';
  const posters = [];
  for (let i = 0; i < STYLES.length; i += 1) {
    const style = STYLES[i];
    const { canvas, ctx } = await prepareCanvas(component, `posterCanvas${i}`);
    const avatarImg = await loadCanvasImage(canvas, avatarSrc).then((r) => r.img).catch(() => null);
    ctx.clearRect(0, 0, POSTER_W, POSTER_H);
    drawPoster(ctx, style.id, pet, avatarImg);
    const url = await exportCanvas(canvas);
    posters.push({ ...style, url });
  }
  return posters;
}

module.exports = {
  STYLES,
  normalizePetForPoster,
  generatePetCertPosters,
};
