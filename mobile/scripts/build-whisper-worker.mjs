import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, resolve, sep } from 'node:path';
import { mkdir, copyFile, readdir } from 'node:fs/promises';

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

// Self-host onnxruntime-web's wasm runtime instead of relying on transformers.js's
// default (jsDelivr CDN) -- see whisperWorkerEntry.ts's env.backends.onnx.wasm.wasmPaths.
// Copy every ort-wasm-simd-threaded* runtime variant (plain, .jsep, and whatever else
// this onnxruntime-web version ships -- v4 of transformers.js added .jspi/.asyncify
// variants for its native WebGPU EP) rather than hardcoding filenames: the worker picks
// between them at runtime depending on which device/EP pipeline() succeeds with, and a
// hardcoded list silently goes stale across onnxruntime-web version bumps.
// pnpm doesn't hoist onnxruntime-web to the top level (it's a transitive dep of
// @huggingface/transformers, not a direct dependency here) -- resolve it starting
// from that package so Node's algorithm walks its own nested node_modules. Its
// package.json doesn't expose a "./package.json" export subpath, so resolve the
// main entry instead and derive the package root from the resolved path.
const require = createRequire(import.meta.url);
const ortMainEntry = require.resolve('onnxruntime-web', { paths: [require.resolve('@huggingface/transformers')] });
const marker = `${sep}onnxruntime-web${sep}`;
const ortPkgRoot = ortMainEntry.slice(0, ortMainEntry.lastIndexOf(marker) + marker.length);
const ortDistDir = resolve(ortPkgRoot, 'dist');
const ortFiles = (await readdir(ortDistDir)).filter((f) => f.startsWith('ort-wasm-simd-threaded') && (f.endsWith('.wasm') || f.endsWith('.mjs')));
for (const file of ortFiles) {
  await copyFile(resolve(ortDistDir, file), resolve(outDir, file));
}
console.log(`copied ${ortFiles.length} onnxruntime-web wasm runtime files to ${outDir}: ${ortFiles.join(', ')}`);
