import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distIndex = resolve(__dirname, '../dist/index.html');

const html = await readFile(distIndex, 'utf8');

const iosSplash = [
  { w: 1290, h: 2796, pt: [430, 932], ratio: 3 },
  { w: 1179, h: 2556, pt: [393, 852], ratio: 3 },
  { w: 1284, h: 2778, pt: [428, 926], ratio: 3 },
  { w: 1170, h: 2532, pt: [390, 844], ratio: 3 },
  { w: 1080, h: 2340, pt: [360, 780], ratio: 3 },
  { w: 1125, h: 2436, pt: [375, 812], ratio: 3 },
  { w: 1242, h: 2688, pt: [414, 896], ratio: 3 },
  { w:  828, h: 1792, pt: [414, 896], ratio: 2 },
  { w:  750, h: 1334, pt: [375, 667], ratio: 2 }
];

const splashLinks = iosSplash
  .map(({ w, h, pt, ratio }) => {
    const media = `(device-width: ${pt[0]}px) and (device-height: ${pt[1]}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`;
    return `    <link rel="apple-touch-startup-image" media="${media}" href="/icons/splash-${w}x${h}.png">`;
  })
  .join('\n');

const headInject = `
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">
    <link rel="icon" type="image/png" sizes="48x48" href="/icons/favicon-48.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/favicon-180.png">
${splashLinks}
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="Pracomprá">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="theme-color" content="#F5F1E8">
    <meta name="mobile-web-app-capable" content="yes">
    <style>
      html { scrollbar-width: none; -ms-overflow-style: none; }
      html::-webkit-scrollbar, *::-webkit-scrollbar { display: none; }
      * { scrollbar-width: none; -ms-overflow-style: none; }
    </style>`;

const bodyInject = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    </script>`;

if (html.includes('/manifest.webmanifest')) {
  console.log('[postbuild-web] already patched, skipping');
  process.exit(0);
}

const patched = html
  .replace(
    /<meta name="viewport" content="[^"]*"\s*\/?>/,
    '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover">'
  )
  .replace('</head>', `${headInject}\n  </head>`)
  .replace('</body>', `${bodyInject}\n  </body>`);

await writeFile(distIndex, patched, 'utf8');
console.log('[postbuild-web] injected PWA meta + SW registration into dist/index.html');
