import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, '../public/icons');
const source = resolve(iconsDir, 'icon.png');

const paper = { r: 245, g: 241, b: 232, alpha: 1 };

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
  const icon = await sharp(source).resize(iconSize, iconSize, { fit: 'contain' }).png().toBuffer();
  const out = resolve(iconsDir, `splash-${w}x${h}.png`);
  await sharp({ create: { width: w, height: h, channels: 4, background: paper } })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(out);
}

console.log(`[gen-splash] wrote ${sizes.length} splash images to public/icons/`);
