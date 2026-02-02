const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generate(size) {
  const svgPath = path.join(__dirname, '../public/icon.svg');
  const outPath = path.join(__dirname, `../public/pwa-${size}x${size}.png`);
  const svg = fs.readFileSync(svgPath);
  await sharp(svg)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
}

(async () => {
  await generate(192);
  await generate(512);
})();
