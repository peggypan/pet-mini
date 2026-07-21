// Simple SVG to PNG converter using canvas
const fs = require('fs');
const path = require('path');
const https = require('https');

const icons = [
  { name: 'home', color: '#999999' },
  { name: 'home-active', color: '#FF8C42' },
  { name: 'service', color: '#999999' },
  { name: 'service-active', color: '#FF8C42' },
  { name: 'idle', color: '#999999' },
  { name: 'idle-active', color: '#FF8C42' },
  { name: 'profile', color: '#999999' },
  { name: 'profile-active', color: '#FF8C42' }
];

// Icon paths (simple SVG paths)
const iconPaths = {
  'home': '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>',
  'service': '<path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>',
  'idle': '<path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2s-1.05.22-1.41.58l-9 9c-.37.37-.59.88-.59 1.41 0 .53.22 1.04.59 1.41l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.58l9-9c.37-.37.59-.88.59-1.41 0-.53-.22-1.04-.59-1.41zM11 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm2-8h-4v4h4v-4z"/>',
  'profile': '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>'
};

function downloadIcon(name, color, outputPath) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="81" height="81" viewBox="0 0 24 24" fill="${color}">
${iconPaths[name.replace('-active', '')]}
</svg>`;

  // Use an online converter API
  const postData = JSON.stringify({
    svg: svg,
    width: 81,
    height: 81
  });

  const options = {
    hostname: 'svg2png.herokuapp.com',
    path: '/convert',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          fs.writeFileSync(outputPath, Buffer.concat(chunks));
          console.log(`Downloaded: ${outputPath}`);
          resolve();
        });
      } else {
        reject(new Error(`Failed: ${res.statusCode}`));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function convertAll() {
  const dir = __dirname;

  for (const icon of icons) {
    const outputPath = path.join(dir, `${icon.name}.png`);
    try {
      await downloadIcon(icon.name, icon.color, outputPath);
      // Wait a bit between requests
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`Failed to download ${icon.name}:`, err.message);
    }
  }

  console.log('Done!');
}

convertAll().catch(console.error);
