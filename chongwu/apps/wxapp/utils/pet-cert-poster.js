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
const { speciesLabel } = require('./pet-species');
const store = require('./store');
const {
  pickPosterPhotoUrls,
  defaultPetFallbackPhoto,
} = require('./pet-photo-pool');

const STYLES = [
  { id: 'dada', name: '搭搭经典' },
  { id: 'dawn', name: '清晨蓝调' },
  { id: 'coral', name: '日落暖色' },
];

const THEMES = {
  dada: {
    sky: ['#6EC8FF', '#4EB6F8', '#E8F4FC', '#F0F7FF'],
    skyDeco: 'rgba(255,255,255,0.35)',
    pillBg: 'rgba(255,255,255,0.92)',
    pillText: '#1D6FBD',
    cardBg: ['#FFFFFF', '#EEF6FF', '#E3EFFF'],
    cardShadow: 'rgba(30, 100, 180, 0.22)',
    photoBorder: 'rgba(255,255,255,0.48)',
    scoreNum: '#B8E4FF',
    tagBg: 'rgba(255,255,255,0.22)',
    tagText: '#FFFFFF',
    detailBg: '#FFFFFF',
    detailLabel: '#64748B',
    detailValue: '#0F2942',
    footerBg: 'rgba(255,255,255,0.95)',
  },
  dawn: {
    sky: ['#5B9BD5', '#3D7EB8', '#D6E8F5', '#EBF3FA'],
    skyDeco: 'rgba(255,255,255,0.28)',
    pillBg: 'rgba(255,255,255,0.9)',
    pillText: '#1A5A8A',
    cardBg: ['#FFFFFF', '#F0F6FC', '#E5EEF8'],
    cardShadow: 'rgba(26, 90, 138, 0.2)',
    photoBorder: 'rgba(255,255,255,0.5)',
    scoreNum: '#A8D4FF',
    tagBg: 'rgba(255,255,255,0.2)',
    tagText: '#FFFFFF',
    detailBg: '#FFFFFF',
    detailLabel: '#64748B',
    detailValue: '#0F2942',
    footerBg: 'rgba(255,255,255,0.95)',
  },
  coral: {
    sky: ['#FFB88C', '#FF9A6C', '#FFE8DC', '#FFF5F0'],
    skyDeco: 'rgba(255,255,255,0.4)',
    pillBg: 'rgba(255,255,255,0.92)',
    pillText: '#C45C26',
    cardBg: ['#FFFFFF', '#FFF5EE', '#FFEDE3'],
    cardShadow: 'rgba(196, 92, 38, 0.18)',
    photoBorder: 'rgba(255,255,255,0.55)',
    scoreNum: '#FFD4B8',
    tagBg: 'rgba(255,255,255,0.25)',
    tagText: '#FFFFFF',
    detailBg: '#FFFFFF',
    detailLabel: '#8B7355',
    detailValue: '#4A2C1A',
    footerBg: 'rgba(255,255,255,0.95)',
  },
};

function vaccineLabel(pet) {
  if (pet.vaccineStatus === 'immune' || pet.verified) return '已免疫 ✓';
  if (pet.vaccineStatus === 'vaccinating') return '免疫进行中';
  if (pet.vaccineStatus === 'none') return '未免疫';
  return '待完善';
}

function profileCompleteness(pet) {
  let s = 36;
  if (pet.name) s += 12;
  if (pet.breedShort) s += 10;
  if (pet.age) s += 8;
  if (pet.vaccine && !pet.vaccine.includes('待')) s += 14;
  if (pet.area && !pet.area.includes('待设置')) s += 10;
  if (pet.personality) s += 5;
  if (pet.displayTags && pet.displayTags.length) s += 5;
  return Math.min(99, Math.max(55, s));
}

function buildAboutText(pet) {
  const bits = [];
  if (pet.personality) bits.push(`性格${pet.personality}`);
  if (pet.healingIntro) bits.push(String(pet.healingIntro).slice(0, 60));
  if (!bits.length) bits.push('友善可爱，欢迎扫码查看完整电子宠证');
  return bits.join('，');
}

function normalizePetForPoster(rawPet) {
  const p = rawPet || {};
  if (p.id) store.registerPublicPetCert(p);
  const socialTags = Array.isArray(p.socialTags) ? p.socialTags.filter(Boolean) : [];
  const area = (p.activityAreaName || p.activityAreaAddress || '').trim();
  let qrContent = '';
  try {
    qrContent = buildPetCertQrContent(p);
  } catch (e) {
    qrContent = '';
  }
  const breedShort = (p.breedName || p.breed || '').trim() || '品种待完善';
  const sp = speciesLabel(p.species);
  const breedFull = sp && breedShort ? `${sp} · ${breedShort}` : breedShort;
  const personality = (p.personality || '').trim() || '活泼友好';
  const displayTags = [];
  if (personality) displayTags.push(personality);
  socialTags.forEach((t) => {
    if (displayTags.length >= 5) return;
    if (!displayTags.includes(t)) displayTags.push(t);
  });

  const draft = {
    id: p.id || 'pet',
    name: p.name || '毛孩子',
    breedShort,
    breedFull,
    age: p.age ? String(p.age) : '',
    personality,
    avatar: pickPosterPhotoUrls(p, 1)[0] || defaultPetFallbackPhoto(),
    vaccine: vaccineLabel(p),
    tags: socialTags.slice(0, 6),
    displayTags,
    area: area || '待设置活动区域',
    aboutText: buildAboutText({ ...p, personality }),
    qrContent,
    healingPet: !!p.healingPet,
  };
  draft.profileScore = profileCompleteness(draft);
  return draft;
}

function drawSky(ctx, theme) {
  const stops = theme.sky;
  const grd = ctx.createLinearGradient(0, 0, 0, POSTER_H);
  grd.addColorStop(0, stops[0]);
  grd.addColorStop(0.38, stops[1]);
  grd.addColorStop(0.72, stops[2]);
  grd.addColorStop(1, stops[3]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  ctx.fillStyle = theme.skyDeco;
  ctx.beginPath();
  ctx.arc(-20, 100, 180, 0, Math.PI * 2);
  ctx.fill();
}

function drawHeader(ctx, theme) {
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 36px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(21, 88, 150, 0.28)';
  ctx.shadowBlur = 8;
  ctx.fillText('让毛孩子', 40, 44);
  ctx.shadowBlur = 0;
  ctx.font = '600 26px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText('遇到更好的伙伴', 40, 88);

  const pillW = 200;
  const pillH = 52;
  const pillX = POSTER_W - 40 - pillW;
  const pillY = 48;
  ctx.fillStyle = theme.pillBg;
  ctx.shadowColor = 'rgba(30, 120, 200, 0.18)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, pillX, pillY, pillW, pillH, 26);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = theme.pillText;
  ctx.font = '700 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💙 电子宠证', pillX + pillW / 2, pillY + pillH / 2);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('宠头头 · 搭搭', POSTER_W - 40, 108);
}

function drawPhotoOverlay(ctx, x, y, w, h) {
  const grd = ctx.createLinearGradient(0, y + h * 0.45, 0, y + h);
  grd.addColorStop(0, 'rgba(15, 41, 66, 0)');
  grd.addColorStop(0.38, 'rgba(15, 41, 66, 0.35)');
  grd.addColorStop(1, 'rgba(15, 41, 66, 0.78)');
  ctx.fillStyle = grd;
  ctx.fillRect(x, y, w, h);
}

function drawTagsRow(ctx, tags, x, y, maxW, theme) {
  let cx = x;
  const gap = 10;
  const padX = 16;
  const padY = 8;
  ctx.font = '600 22px sans-serif';
  (tags || []).forEach((tag) => {
    const tw = ctx.measureText(tag).width + padX * 2;
    if (cx + tw > x + maxW && cx > x) {
      cx = x;
      y += 44;
    }
    ctx.fillStyle = theme.tagBg;
    roundRect(ctx, cx, y, tw, 36, 18);
    ctx.fill();
    ctx.fillStyle = theme.tagText;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, cx + padX, y + 18);
    cx += tw + gap;
  });
  return y + 44;
}

function drawDetailLine(ctx, label, value, x, y, w, theme) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = theme.detailLabel;
  ctx.font = '600 22px sans-serif';
  ctx.fillText(label, x, y);
  ctx.fillStyle = theme.detailValue;
  ctx.font = '24px sans-serif';
  const lines = wrapText(ctx, value || '—', w - 4, 2);
  lines.forEach((line, i) => {
    ctx.fillText(line, x + 72, y + i * 30);
  });
  return y + Math.max(34, lines.length * 30 + 8);
}

function drawDadaPoster(ctx, pet, avatarImg, themeId) {
  const theme = THEMES[themeId] || THEMES.dada;
  drawSky(ctx, theme);
  drawHeader(ctx, theme);

  const cardX = 32;
  const cardY = 132;
  const cardW = POSTER_W - 64;
  const cardH = 868;

  ctx.save();
  ctx.shadowColor = theme.cardShadow;
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  const cardGrd = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrd.addColorStop(0, theme.cardBg[0]);
  cardGrd.addColorStop(0.55, theme.cardBg[1]);
  cardGrd.addColorStop(1, theme.cardBg[2]);
  ctx.fillStyle = cardGrd;
  roundRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.fill();
  ctx.restore();

  const pad = 20;
  const photoX = cardX + pad;
  const photoY = cardY + pad;
  const photoW = cardW - pad * 2;
  const photoH = 580;

  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  roundRect(ctx, photoX, photoY, photoW, photoH, 28);
  ctx.fill();
  ctx.strokeStyle = theme.photoBorder;
  ctx.lineWidth = 8;
  roundRect(ctx, photoX, photoY, photoW, photoH, 28);
  ctx.stroke();

  ctx.save();
  roundRect(ctx, photoX + 4, photoY + 4, photoW - 8, photoH - 8, 24);
  ctx.clip();
  drawCover(ctx, avatarImg, photoX + 4, photoY + 4, photoW - 8, photoH - 8, 'fill');
  ctx.restore();

  drawPhotoOverlay(ctx, photoX, photoY, photoW, photoH);

  ctx.fillStyle = 'rgba(15, 41, 66, 0.42)';
  roundRect(ctx, photoX + photoW - 140, photoY + 20, 120, 40, 20);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.font = '700 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('扫码查验', photoX + photoW - 80, photoY + 40);

  if (pet.vaccine && pet.vaccine.includes('已免疫')) {
    ctx.fillStyle = 'rgba(30, 136, 229, 0.88)';
    roundRect(ctx, photoX + 20, photoY + 20, 120, 40, 20);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = '700 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('已免疫', photoX + 80, photoY + 40);
  }

  const infoX = photoX + 24;
  const infoW = photoW - 48;
  let infoY = photoY + photoH - 200;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 44px sans-serif';
  ctx.fillText(pet.name, infoX, infoY);

  const nameW = ctx.measureText(pet.name).width;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = '600 28px sans-serif';
  ctx.fillText(`| ${pet.breedShort}`, infoX + nameW + 12, infoY + 10);

  const scoreW = 100;
  const scoreX = photoX + photoW - 24 - scoreW;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = '20px sans-serif';
  ctx.fillText('档案完整度', scoreX + scoreW, infoY + 4);
  ctx.fillStyle = theme.scoreNum;
  ctx.font = '800 40px sans-serif';
  ctx.fillText(`${pet.profileScore}%`, scoreX + scoreW, infoY + 28);

  infoY += 58;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '24px sans-serif';
  const locLine = `📍 ${pet.area}`;
  wrapText(ctx, locLine, infoW - scoreW - 20, 2).forEach((line, i) => {
    ctx.fillText(line, infoX, infoY + i * 32);
  });
  infoY += 40;

  drawTagsRow(ctx, pet.displayTags, infoX, infoY, infoW, theme);

  const detailY = photoY + photoH + 16;
  const detailH = cardY + cardH - detailY - 16;
  ctx.fillStyle = theme.detailBg;
  roundRect(ctx, photoX, detailY, photoW, detailH, 20);
  ctx.fill();

  let dy = detailY + 20;
  dy = drawDetailLine(ctx, '品种', pet.breedFull, photoX + 20, dy, photoW - 40, theme);
  dy = drawDetailLine(ctx, '年龄', pet.age || '未填写', photoX + 20, dy, photoW - 40, theme);
  dy = drawDetailLine(ctx, '免疫', pet.vaccine, photoX + 20, dy, photoW - 40, theme);
  dy = drawDetailLine(ctx, '简介', pet.aboutText, photoX + 20, dy, photoW - 40, theme);

  const footerY = cardY + cardH + 24;
  const footerH = POSTER_H - footerY - 36;
  ctx.fillStyle = theme.footerBg;
  roundRect(ctx, cardX, footerY, cardW, footerH, 24);
  ctx.fill();

  const qrSize = Math.min(footerH - 28, 128);
  const qrX = cardX + 24;
  const qrY = footerY + (footerH - qrSize) / 2;
  ctx.fillStyle = '#FFF';
  roundRect(ctx, qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 12);
  ctx.fill();
  const ok = pet.qrContent && drawQrMatrixOnCtx(ctx, qrX, qrY, qrSize, pet.qrContent, {
    fg: '#0F2942',
    bg: '#FFFFFF',
    quietModules: 2,
    ecc: 'M',
  });
  if (!ok) {
    ctx.fillStyle = '#EEE';
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
  }

  const textX = qrX + qrSize + 28;
  const textW = cardX + cardW - textX - 20;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#0F2942';
  ctx.font = '700 28px sans-serif';
  ctx.fillText('扫码查看电子宠证', textX, footerY + 28);
  ctx.fillStyle = '#64748B';
  ctx.font = '22px sans-serif';
  wrapText(ctx, '二维码与宠证页一致，可查验免疫与档案信息。保存海报分享给好友，一起来搭搭。', textW, 3).forEach((line, i) => {
    ctx.fillText(line, textX, footerY + 68 + i * 30);
  });
}

function drawPoster(ctx, styleId, pet, avatarImg) {
  drawDadaPoster(ctx, pet, avatarImg, styleId);
}

async function generatePetCertPosters(component, rawPet) {
  const pet = normalizePetForPoster(rawPet);
  const photoUrls = pickPosterPhotoUrls(rawPet, STYLES.length);
  const posters = [];
  for (let i = 0; i < STYLES.length; i += 1) {
    const style = STYLES[i];
    const avatarSrc = photoUrls[i] || defaultPetFallbackPhoto();
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
