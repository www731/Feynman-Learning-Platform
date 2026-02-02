const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generate(width, height, filename) {
  const svgPath = path.join(__dirname, '../public/icon.svg');
  const outPath = path.join(__dirname, `../public/screenshots/${filename}`);
  const svg = fs.readFileSync(svgPath);
  await sharp(svg)
    .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(outPath);
}

(async () => {
  const dir = path.join(__dirname, '../public/screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await generate(1280, 720, 'desktop-1280x720.png');
  await generate(720, 1280, 'mobile-720x1280.png');
})();
