import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'public/workers');

await mkdir(outDir, { recursive: true });

await build({
  entryPoints: [resolve(root, 'src/workers/whisperWorkerEntry.ts')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  platform: 'browser',
  outfile: resolve(outDir, 'whisper-worker.js'),
  logLevel: 'info'
});
