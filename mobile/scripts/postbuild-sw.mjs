import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');
const swPath = resolve(distDir, 'sw.js');

async function listFiles(dir, base) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(full, base)));
    } else {
      const rel = full.slice(base.length + 1).split('\\').join('/');
      files.push('/' + rel);
    }
  }
  return files;
}

// Precache only the app-shell JS bundle(s). Fonts/icons (~18MB, mostly unused
// weights/families pulled in by Metro) blow past the SW install time/quota
// budget on iOS if precached, causing cache.addAll to fail atomically and the
// SW to never activate. They still get cached on first use via runtime cache.
const jsDir = resolve(distDir, '_expo/static/js/web');
const assets = (await listFiles(jsDir, distDir)).sort();
const version = createHash('sha1').update(assets.join(',')).digest('hex').slice(0, 10);

let sw = await readFile(swPath, 'utf8');

if (sw.startsWith('self.__SW_VERSION__')) {
  console.log('[postbuild-sw] already patched, skipping');
  process.exit(0);
}

const inject = `self.__SW_VERSION__=${JSON.stringify(version)};self.__PRECACHE_ASSETS__=${JSON.stringify(assets)};\n`;
await writeFile(swPath, inject + sw, 'utf8');

console.log(`[postbuild-sw] precaching ${assets.length} assets, version ${version}`);
