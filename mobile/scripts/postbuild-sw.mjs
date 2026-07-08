import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename } from 'node:path';
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

// Precache the app-shell JS bundle(s) plus only the specific font/icon files
// the app actually uses (src/ui/App.tsx, Masthead/ItemRow Feather icon).
// Precaching ALL of dist/assets (~18MB, every unused icon family and font
// weight Metro bundles in) blew past iOS's SW install time/quota budget,
// making cache.addAll fail atomically and the SW never activate. This
// whitelist keeps the payload small (~1MB) while still covering everything
// visible on first paint.
const USED_FONT_FILES = [
  'SpaceGrotesk_500Medium',
  'SpaceGrotesk_700Bold',
  'Inter_400Regular',
  'Inter_500Medium',
  'Inter_600SemiBold',
  'JetBrainsMono_400Regular',
  'JetBrainsMono_500Medium',
  'Feather'
];

const jsDir = resolve(distDir, '_expo/static/js/web');
const jsFiles = await listFiles(jsDir, distDir);

const allAssetFiles = await listFiles(resolve(distDir, 'assets'), distDir);
const fontFiles = allAssetFiles.filter((f) =>
  USED_FONT_FILES.some((name) => basename(f).startsWith(name + '.'))
);

const assets = [...jsFiles, ...fontFiles].sort();
const version = createHash('sha1').update(assets.join(',')).digest('hex').slice(0, 10);

let sw = await readFile(swPath, 'utf8');

if (sw.startsWith('self.__SW_VERSION__')) {
  console.log('[postbuild-sw] already patched, skipping');
  process.exit(0);
}

const inject = `self.__SW_VERSION__=${JSON.stringify(version)};self.__PRECACHE_ASSETS__=${JSON.stringify(assets)};\n`;
await writeFile(swPath, inject + sw, 'utf8');

console.log(`[postbuild-sw] precaching ${assets.length} assets, version ${version}`);
