import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distIndex = resolve(__dirname, '../dist/index.html');

const html = await readFile(distIndex, 'utf8');

const headInject = `
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="apple-touch-icon" href="/icons/icon.png">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="Pracomprá">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="theme-color" content="#F5F1E8">
    <meta name="mobile-web-app-capable" content="yes">`;

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
  .replace('</head>', `${headInject}\n  </head>`)
  .replace('</body>', `${bodyInject}\n  </body>`);

await writeFile(distIndex, patched, 'utf8');
console.log('[postbuild-web] injected PWA meta + SW registration into dist/index.html');
