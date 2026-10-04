const {
  POSTER_W,
  POSTER_H,
  roundRect,
  wrapText,
  drawCover,
  prepareCanvas,
  exportCanvas,
  loadCanvasImage,
} = require('./event-poster');
const { buildPetCertQrContent } = require('./pet-cert-qrcode');
const { drawQrMatrixOnCtx } = require('./qrcode');
const store = require('./store');

const STYLES = [
  { id: 'fresh', name: '证照蓝调' },
  { id: 'magazine', name: '杂志封面' },
  { id: 'cute', name: '萌宠名片' },
];

function vaccineLabel(pet) {
  if (pet.vaccineStatus === 'immune' || pet.verified) return '已免疫';
  if (pet.vaccineStatus === 'vaccinating') return '免疫中';
  if (pet.vaccineStatus === 'none') return '未免疫';
  return '';
}

function normalizePetForPoster(rawPet) {
  const p = rawPet || {};
  if (p.id) store.registerPublicPetCert(p);
  const tags = Array.isArray(p.socialTags) ? p.socialTags.filter(Boolean).slice(0, 4) : [];
  const area = (p.activityAreaName || p.activityAreaAddress || '').trim();
  let qrContent = '';
  try {
    qrContent = buildPetCertQrContent(p);
  } catch (e) {
    qrContent = '';
  }
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
    qrContent,
  };
}

function drawCertHeader(ctx, y, accent) {
  ctx.fillStyle = accent;
  ctx.font = '700 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ELECTRONIC PET CERTIFICATE', POSTER_W / 2, y);
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(120, y + 22);
  ctx.lineTo(POSTER_W - 120, y + 22);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawTags(ctx, tags, x, y, maxW, style) {
  if (!tags.length) return y;
  let cx = x;
  let cy = y;
  const gap = 10;
  const padX = 14;
  ctx.font = '600 20px sans-serif';
  tags.forEach((tag) => {
    const tw = ctx.measureText(tag).width + padX * 2;
    if (cx + tw > x + maxW) {
      cx = x;
      cy += 40;
    }
    ctx.fillStyle = style.bg;
    roundRect(ctx, cx, cy, tw, 32, 16);
    ctx.fill();
    ctx.fillStyle = style.fg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, cx + padX, cy + 16);
    cx += tw + gap;
  });
  return cy + 44;
}

function drawPetQrBlock(ctx, pet, x, y, qrSize, labelColor, subColor, options = {}) {
  const pad = 14;
  const boxW = qrSize + pad * 2;
  const subLines = options.subCaption ? 2 : 1;
  const captionH = subLines === 2 ? 52 : 36;
  const boxH = qrSize + pad * 2 + captionH;

  ctx.save();
  ctx.shadowColor = 'rgba(15, 40, 80, 0.12)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = options.boxFill || '#FFFFFF';
  roundRect(ctx, x, y, boxW, boxH, 20);
  ctx.fill();
  ctx.restore();

  const qrX = x + pad;
  const qrY = y + pad;
  const ok = pet.qrContent && drawQrMatrixOnCtx(ctx, qrX, qrY, qrSize, pet.qrContent, {
    fg: options.qrFg || '#0D2137',
    bg: '#FFFFFF',
    quietModules: 2,
    ecc: 'M',
  });
  if (!ok) {
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = '#999';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('二维码生成失败', qrX + qrSize / 2, qrY + qrSize / 2);
  }

  ctx.fillStyle = labelColor;
  ctx.font = '600 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(options.caption || '微信扫一扫', x + boxW / 2, y + pad + qrSize + 8);
  if (options.subCaption) {
    ctx.fillStyle = subColor;
    ctx.font = '18px sans-serif';
    ctx.fillText(options.subCaption, x + boxW / 2, y + pad + qrSize + 32);
  }
}

function drawAvatarRing(ctx, avatarImg, cx, cy, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(30, 136, 229, 0.25)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  drawCover(ctx, avatarImg, cx - r, cy - r, r * 2, r * 2, 'circle');
  ctx.strokeStyle = 'rgba(30, 136, 229, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawStyleFresh(ctx, pet, avatarImg) {
  const grd = ctx.createLinearGradient(0, 0, POSTER_W, POSTER_H);
  grd.addColorStop(0, '#EAF4FF');
  grd.addColorStop(0.55, '#C5E3FF');
  grd.addColorStop(1, '#7EC4FA');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  roundRect(ctx, 28, 36, POSTER_W - 56, POSTER_H - 72, 32);
  ctx.fill();

  drawCertHeader(ctx, 88, '#1E88E5');

  ctx.fillStyle = '#1E88E5';
  ctx.font = '800 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('宠头头 · 电子宠证', POSTER_W / 2, 128);

  const cx = POSTER_W / 2;
  const cy = 280;
  const r = 118;
  drawAvatarRing(ctx, avatarImg, cx, cy, r);

  if (pet.vaccine) {
    const badgeW = 128;
    const bx = cx + r - 24;
    const by = cy - r + 8;
    ctx.fillStyle = '#1E88E5';
    roundRect(ctx, bx, by, badgeW, 40, 20);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = '600 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pet.vaccine, bx + badgeW / 2, by + 20);
  }

  ctx.fillStyle = '#0D2137';
  ctx.font = '800 52px sans-serif';
  ctx.fillText(pet.name, POSTER_W / 2, 440);

  ctx.fillStyle = '#5A6B7D';
  ctx.font = '26px sans-serif';
  const sub = [pet.breed, pet.age, pet.personality].filter(Boolean).join(' · ');
  wrapText(ctx, sub, POSTER_W - 140, 2).forEach((line, i) => {
    ctx.fillText(line, POSTER_W / 2, 492 + i * 38);
  });

  let tagY = drawTags(ctx, pet.tags, 72, 560, POSTER_W - 144, {
    bg: 'rgba(30, 136, 229, 0.12)',
    fg: '#1565C0',
  });

  if (pet.area) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8FA3B8';
    ctx.font = '22px sans-serif';
    ctx.fillText('常活动区域', 72, tagY);
    ctx.fillStyle = '#334155';
    ctx.font = '24px sans-serif';
    wrapText(ctx, pet.area, POSTER_W - 144, 2).forEach((line, i) => {
      ctx.fillText(line, 72, tagY + 34 + i * 32);
    });
  }

  const qrSize = 168;
  drawPetQrBlock(
    ctx,
    pet,
    (POSTER_W - qrSize - 28) / 2,
    920,
    qrSize,
    '#0D2137',
    '#64748B',
    { caption: '扫码查验电子宠证', subCaption: '宠头头小程序' },
  );

  ctx.fillStyle = 'rgba(13, 33, 55, 0.45)';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('信息以平台档案为准 · 仅供宠友查验', POSTER_W / 2, 1148);
}

function drawStyleMagazine(ctx, pet, avatarImg) {
  drawCover(ctx, avatarImg, 0, 0, POSTER_W, POSTER_H * 0.62, 'fill');

  const overlay = ctx.createLinearGradient(0, POSTER_H * 0.28, 0, POSTER_H);
  overlay.addColorStop(0, 'rgba(8, 18, 32, 0.05)');
  overlay.addColorStop(0.45, 'rgba(8, 18, 32, 0.82)');
  overlay.addColorStop(1, '#081220');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '600 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CHONGWUTOUTOU · PET ID', 48, 680);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 58px sans-serif';
  ctx.fillText(pet.name, 48, 752);

  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = '28px sans-serif';
  ctx.fillText(`${pet.breed} · ${pet.personality}`, 48, 818);

  if (pet.vaccine) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, 48, 842, 168, 40, 8);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 22px sans-serif';
    ctx.fillText(pet.vaccine, 64, 862);
  }

  drawTags(ctx, pet.tags, 48, 900, POSTER_W - 96, {
    bg: 'rgba(255,255,255, 0.16)',
    fg: '#FFFFFF',
  });

  if (pet.area) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '24px sans-serif';
    ctx.fillText(`📍 ${pet.area}`, 48, 980);
  }

  const qrSize = 156;
  drawPetQrBlock(
    ctx,
    pet,
    (POSTER_W - qrSize - 28) / 2,
    1010,
    qrSize,
    '#0D2137',
    '#64748B',
    {
      boxFill: '#FFFFFF',
      qrFg: '#0D2137',
      caption: '扫码查验电子宠证',
      subCaption: '宠头头',
    },
  );
}

function drawStyleCute(ctx, pet, avatarImg) {
  ctx.fillStyle = '#FFF9F5';
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  ctx.fillStyle = 'rgba(255, 200, 180, 0.35)';
  ctx.beginPath();
  ctx.arc(100, 140, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(650, 200, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 40, 48, POSTER_W - 80, POSTER_H - 96, 36);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 143, 171, 0.35)';
  ctx.lineWidth = 2;
  roundRect(ctx, 40, 48, POSTER_W - 80, POSTER_H - 96, 36);
  ctx.stroke();

  drawAvatarRing(ctx, avatarImg, POSTER_W / 2, 220, 108);

  ctx.fillStyle = '#FF6B9D';
  ctx.font = '700 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🐾 电子宠证名片', POSTER_W / 2, 360);

  ctx.fillStyle = '#2D2A32';
  ctx.font = '800 48px sans-serif';
  ctx.fillText(pet.name, POSTER_W / 2, 418);

  ctx.fillStyle = '#6B6570';
  ctx.font = '26px sans-serif';
  const line = [pet.breed, pet.age, pet.personality].filter(Boolean).join(' · ');
  wrapText(ctx, line, POSTER_W - 160, 2).forEach((l, i) => {
    ctx.fillText(l, POSTER_W / 2, 468 + i * 36);
  });

  if (pet.vaccine) {
    ctx.fillStyle = '#FF8FAB';
    ctx.font = '600 24px sans-serif';
    ctx.fillText(pet.vaccine, POSTER_W / 2, 548);
  }

  drawTags(ctx, pet.tags, 80, 580, POSTER_W - 160, {
    bg: 'rgba(255, 143, 171, 0.18)',
    fg: '#E91E63',
  });

  if (pet.area) {
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '22px sans-serif';
    ctx.fillText(`常在 ${pet.area}`, POSTER_W / 2, 680);
  }

  const qrSize = 160;
  drawPetQrBlock(
    ctx,
    pet,
    (POSTER_W - qrSize - 28) / 2,
    720,
    qrSize,
    '#2D2A32',
    '#9CA3AF',
    { caption: '扫码查验电子宠证', subCaption: '宠头头小程序' },
  );

  ctx.fillStyle = '#FFB6C1';
  ctx.font = '700 26px sans-serif';
  ctx.fillText('来搭搭，认识更多宠友', POSTER_W / 2, 980);
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
