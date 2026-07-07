import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, '../public/icons');
const source = resolve(iconsDir, 'icon.png');

const paper = { r: 245, g: 241, b: 232, alpha: 1 };

// icon.png's own background is baked in slightly off the paper tone
// (~rgb(244,236,228)); shift every pixel so it matches exactly before compositing.
const iconBg = { r: 244, g: 236, b: 228 };
const bgCorrection = [paper.r - iconBg.r, paper.g - iconBg.g, paper.b - iconBg.b];

const sizes = [
  [1290, 2796],
  [1179, 2556],
  [1284, 2778],
  [1170, 2532],
  [1080, 2340],
  [1125, 2436],
  [1242, 2688],
  [828, 1792],
  [750, 1334]
];

for (const [w, h] of sizes) {
  const iconSize = Math.round(Math.min(w, h) * 0.4);
  const icon = await sharp(source)
    .linear([1, 1, 1], bgCorrection)
    .resize(iconSize, iconSize, { fit: 'contain' })
    .png()
    .toBuffer();
  const out = resolve(iconsDir, `splash-${w}x${h}.png`);
  await sharp({ create: { width: w, height: h, channels: 4, background: paper } })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(out);
}

console.log(`[gen-splash] wrote ${sizes.length} splash images to public/icons/`);
