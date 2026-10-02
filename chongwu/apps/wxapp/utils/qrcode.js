/**
 * 活动核销等场景：用 qrcode-generator 生成可被微信/系统相机识别的 QR
 */
const qrcodeFactory = require('./vendor/qrcode-generator');

/**
 * @param {string} text
 * @param {'L'|'M'|'Q'|'H'} [ecc]
 * @returns {number[][]}
 */
function encodeQrMatrix(text, ecc = 'M') {
  const qr = qrcodeFactory(0, ecc);
  qr.addData(String(text || ''));
  qr.make();
  const n = qr.getModuleCount();
  const matrix = [];
  for (let y = 0; y < n; y += 1) {
    const row = [];
    for (let x = 0; x < n; x += 1) {
      row.push(qr.isDark(y, x) ? 1 : 0);
    }
    matrix.push(row);
  }
  return matrix;
}

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
        const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        const fallbackW = Math.floor((376 * (win.windowWidth || 375)) / 750);
        const cssW = item.width > 0 ? item.width : fallbackW;
        const px = Math.max(280, Math.floor(cssW * dpr));
        canvas.width = px;
        canvas.height = px;
        let matrix;
        try {
          matrix = encodeQrMatrix(text);
        } catch (e) {
          reject(e);
          return;
        }
        const n = matrix.length;
        const quiet = 4;
        const cells = n + quiet * 2;
        const cell = px / cells;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, px, px);
        ctx.fillStyle = '#000000';
        for (let y = 0; y < n; y += 1) {
          for (let x = 0; x < n; x += 1) {
            if (matrix[y][x]) {
              ctx.fillRect((x + quiet) * cell, (y + quiet) * cell, cell + 0.5, cell + 0.5);
            }
          }
        }
        setTimeout(resolve, 80);
      });
  });
}

function drawQrToTempFile(page, canvasId, text) {
  return drawQrCanvas(page, canvasId, text).then(() => new Promise((resolve, reject) => {
    wx.createSelectorQuery()
      .in(page)
      .select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        const item = res && res[0];
        const canvas = item && item.node;
        if (!canvas) {
          reject(new Error('canvas not found'));
          return;
        }
        const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        const dpr = win.pixelRatio || 2;
        const cssW = item.width > 0 ? item.width : Math.floor((376 * (win.windowWidth || 375)) / 750);
        const dest = Math.max(320, Math.floor(cssW * dpr));
        wx.canvasToTempFilePath({
          canvas,
          destWidth: dest,
          destHeight: dest,
          fileType: 'png',
          success: (r) => resolve(r.tempFilePath),
          fail: reject,
        });
      });
  }));
}

module.exports = {
  encodeQrMatrix,
  drawQrCanvas,
  drawQrToTempFile,
};
