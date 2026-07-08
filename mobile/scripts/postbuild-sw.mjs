import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');
const swPath = resolve(distDir, 'sw.js');

const SKIP = new Set(['sw.js', 'metadata.json']);

async function listFiles(dir, base) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(full, base)));
    } else {
      const rel = full.slice(base.length + 1).split('\\').join('/');
      if (!SKIP.has(rel)) files.push('/' + rel);
    }
  }
  return files;
}

const assets = (await listFiles(distDir, distDir)).sort();
const version = createHash('sha1').update(assets.join(',')).digest('hex').slice(0, 10);

let sw = await readFile(swPath, 'utf8');

if (sw.startsWith('self.__SW_VERSION__')) {
  console.log('[postbuild-sw] already patched, skipping');
  process.exit(0);
}

const inject = `self.__SW_VERSION__=${JSON.stringify(version)};self.__PRECACHE_ASSETS__=${JSON.stringify(assets)};\n`;
await writeFile(swPath, inject + sw, 'utf8');

console.log(`[postbuild-sw] precaching ${assets.length} assets, version ${version}`);
