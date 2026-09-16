const DEFAULT = { c1: '#6ec8ff', c2: '#4da7f8', c3: '#3a9fe8' };

function rgbToHex(r, g, b) {
  const hex = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function buildGradientFromRgb(r, g, b) {
  const lighten = (f) => rgbToHex(
    r + (255 - r) * f,
    g + (255 - g) * f,
    b + (255 - b) * f,
  );
  const darken = (f) => rgbToHex(r * (1 - f), g * (1 - f), b * (1 - f));
  return {
    c1: lighten(0.32),
    c2: rgbToHex(r, g, b),
    c3: darken(0.18),
  };
}

function extractFromImageData(data) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  const step = 4 * 6;
  for (let i = 0; i < data.length; i += step) {
    const pr = data[i];
    const pg = data[i + 1];
    const pb = data[i + 2];
    const alpha = data[i + 3];
    if (alpha < 120) continue;
    const lum = 0.299 * pr + 0.587 * pg + 0.114 * pb;
    if (lum < 28 || lum > 245) continue;
    r += pr;
    g += pg;
    b += pb;
    count += 1;
  }
  if (!count) return { ...DEFAULT };
  return buildGradientFromRgb(r / count, g / count, b / count);
}

function gradientStyleString(palette) {
  const p = palette || DEFAULT;
  return `linear-gradient(165deg, ${p.c1} 0%, ${p.c2} 46%, ${p.c3} 100%)`;
}

function resolveLocalPath(src) {
  if (!src) return Promise.reject(new Error('no-image'));
  if (!/^https?:\/\//i.test(src)) return Promise.resolve(src);
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: src,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) resolve(res.tempFilePath);
        else reject(new Error('download-fail'));
      },
      fail: reject,
    });
  });
}

function sampleImageColors(page, canvasId, imageSrc) {
  return resolveLocalPath(imageSrc)
    .then((path) => new Promise((resolve) => {
      const query = wx.createSelectorQuery().in(page);
      query
        .select(`#${canvasId}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          const canvas = res[0] && res[0].node;
          if (!canvas) {
            resolve({ ...DEFAULT });
            return;
          }
          const size = 72;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          const img = canvas.createImage();
          img.onload = () => {
            try {
              ctx.clearRect(0, 0, size, size);
              ctx.drawImage(img, 0, 0, size, size);
              const { data } = ctx.getImageData(0, 0, size, size);
              resolve(extractFromImageData(data));
            } catch (e) {
              resolve({ ...DEFAULT });
            }
          };
          img.onerror = () => resolve({ ...DEFAULT });
          img.src = path;
        });
    }))
    .catch(() => ({ ...DEFAULT }));
}

module.exports = {
  DEFAULT,
  gradientStyleString,
  sampleImageColors,
};
