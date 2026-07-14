# Hearsay-pwa Voice Recording Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second, real-audio-recording voice input (Whisper transcription) alongside the existing OS-dictation voice feature, styled in Pracomprá's own visual language.

**Architecture:** `hearsay-pwa` is vendored as a git submodule and folded into the mobile app's pnpm workspace. Metro (the bundler behind `expo export -p web`) cannot parse `onnxruntime-web`'s browser bundles — every variant contains a webpack-only dynamic-import pattern Metro's static analyzer rejects — so the app never imports `useVoiceCommand`/`TranscriptionEngine` (both packages' barrels re-export the poisoned chain alongside the safe pieces). Instead: `AudioRecorder`, `computeWaveform`, and `VoiceButton` are imported via deep paths straight into the submodule's source (bypassing both barrels), and transcription runs in a separate Worker built by esbuild (which tolerates the pattern Metro rejects) and loaded at runtime via a plain string URL Metro never statically analyzes. A new `VoiceRecordSheet` orchestrates these pieces directly with Pracomprá-styled UI. The transcribed text flows through the same `parseVoiceCommand` + toast logic the existing dictation sheet already uses.

**Tech Stack:** `@hearsay-pwa/core`/`@hearsay-pwa/react` (git submodule, pnpm workspace, deep-imported), `@huggingface/transformers` (direct dependency, used only inside the Worker), esbuild (already a devDependency, used for the SW bundle), existing `Sheet`/`Button`/`AppText`/`Toast` components, `@react-native-async-storage/async-storage`.

Spec: `docs/superpowers/specs/2026-07-14-hearsay-voice-integration-design.md`

---

### Task 1: Vendor hearsay-pwa, wire pnpm workspace, prove Metro-safe deep imports

**Files:**
- Submodule (already committed on this branch): `mobile/vendor/hearsay-pwa`, pinned `v1.1.2`
- Modify: `mobile/pnpm-workspace.yaml`
- Modify: `mobile/package.json`
- Create: `mobile/src/ui/components/VoiceRecordSheet/index.tsx` (stub, replaced fully in Task 9)

The submodule itself, `.gitmodules`, `mobile/pnpm-workspace.yaml`, and `mobile/package.json`'s `@hearsay-pwa/react` dependency were already added in a prior session and are sitting as uncommitted changes in this worktree (`git status` shows them modified/untracked) — **do not re-run `git submodule add`**, it's already there and correctly pinned to `v1.1.2`. Your job is to finish wiring it correctly and prove the *safe* import pattern works, then commit.

Two things were tried and ruled out before this task was written, so don't repeat them:
- Importing `useVoiceCommand` from `@hearsay-pwa/react` (even unused) crashes Metro's build — `TranscriptionEngine.ts`'s import of `@huggingface/transformers` pulls in `onnxruntime-web`, and every browser bundle it ships uses `import(/*webpackIgnore:true*/e)` (a dynamic import with a non-literal specifier), which Metro's `collectDependencies` rejects with a `SyntaxError`.
- `config.resolver.unstable_enablePackageExports = false` in `metro.config.js` does **not** fix this — it only changes which `onnxruntime-web` file gets hit, not whether the crash happens. **If `mobile/metro.config.js` currently has this line (check `git diff mobile/metro.config.js`), revert it** — it's not needed once the poisoned import path is avoided entirely, and leaving it in is unnecessary config debt.

The fix that does work: `@hearsay-pwa/core`'s `index.ts` re-exports `AudioRecorder` and `TranscriptionEngine` from the same barrel file (same for `@hearsay-pwa/react`'s `VoiceButton` and `useVoiceCommand`), and Metro resolves everything a barrel statically re-exports regardless of what's actually used. So the app must import `AudioRecorder`, `computeWaveform`, and `VoiceButton` via **deep paths directly into the submodule's source**, bypassing both barrels entirely, and must never import anything from the bare `@hearsay-pwa/core` or `@hearsay-pwa/react` package specifiers.

- [ ] **Step 1: Check and revert any leftover metro.config.js change**

Run: `git diff mobile/metro.config.js`

If it shows `config.resolver.unstable_enablePackageExports = false;` added, remove that line so the file matches what's committed on `master` (just `getDefaultConfig` + the `watchFolders` addition for `../shared`). If the diff is empty, nothing to do here.

- [ ] **Step 2: Verify the pending pnpm-workspace.yaml and package.json changes**

Run: `git diff mobile/pnpm-workspace.yaml mobile/package.json`

Confirm `mobile/pnpm-workspace.yaml` has:
```yaml
packages:
  - "."
  - "vendor/hearsay-pwa/packages/*"
```
(it may also have pre-existing `onlyBuiltDependencies`/`allowBuilds` content above this — leave that as-is, just confirm the `packages:` list is present) and `mobile/package.json`'s `"dependencies"` has **both** `"@hearsay-pwa/core": "workspace:*"` and `"@hearsay-pwa/react": "workspace:*"` added after `"@gorhom/bottom-sheet"` — pnpm's strict `node_modules` isolation only symlinks packages a `package.json` explicitly declares, so `core` needs its own direct entry even though `react` also depends on it (the deep imports in Step 4 reach into `core` directly, bypassing `react` entirely). If either is missing, add it now.

- [ ] **Step 3: Install and verify workspace resolution**

Run from `mobile/`:
```bash
pnpm install
```
Expected: completes with no errors. If pnpm prompts about new build scripts for transitive dependencies (e.g. `onnxruntime-node`, `protobufjs` pulled in via `@hearsay-pwa/core`'s `@huggingface/transformers` dependency), approve them the same way the existing `esbuild`/`sharp` entries in `pnpm-workspace.yaml`'s `allowBuilds` are already approved — this is pnpm's routine build-script gate, not a manual dependency decision.

- [ ] **Step 4: Write the deep-import stub**

Create `mobile/src/ui/components/VoiceRecordSheet/index.tsx`:
```tsx
import React, { forwardRef, useRef } from 'react';
import type BottomSheet from '@gorhom/bottom-sheet';
import { AudioRecorder } from '@hearsay-pwa/core/src/AudioRecorder';
import { computeWaveform } from '@hearsay-pwa/core/src/Waveform';
import { VoiceButton } from '@hearsay-pwa/react/src/VoiceButton';
import { Sheet } from '@ui/components/Sheet';
import { AppText } from '@ui/components/AppText';

void computeWaveform;

interface VoiceRecordSheetProps {
  onSubmit(text: string): void;
  onClose(): void;
  onError(message: string): void;
}

export const VoiceRecordSheet = forwardRef<BottomSheet, VoiceRecordSheetProps>(function VoiceRecordSheet(
  { onClose },
  ref
) {
  const recorderRef = useRef<AudioRecorder | null>(null);
  if (!recorderRef.current) recorderRef.current = new AudioRecorder();

  return (
    <Sheet ref={ref} snapPoints={['50%']} onClose={onClose}>
      <AppText family="display" size="lg" color="ink">Gravar por voz</AppText>
      <VoiceButton mode="press-release" onStart={() => {}} onStop={() => {}}>
        <AppText family="mono" size="xs" color="ink">gravar</AppText>
      </VoiceButton>
    </Sheet>
  );
});
```
This deliberately never imports `@hearsay-pwa/core` or `@hearsay-pwa/react` by their bare package name (only the deep `/src/...` paths) and never references `useVoiceCommand` or `TranscriptionEngine` anywhere. `void computeWaveform;` silences nothing (this tsconfig doesn't enable `noUnusedLocals`) — it's just there so the import's presence is deliberate and visible; a later task actually calls it.

- [ ] **Step 5: Prove it typechecks and bundles**

Run from `mobile/`:
```bash
pnpm run typecheck
pnpm run build:web
```
Expected: both succeed with **no** resolution or syntax errors — this is the real proof, because unlike the earlier attempt, `VoiceRecordSheet` is not yet imported anywhere else in the app, so also temporarily add `import '@ui/components/VoiceRecordSheet';` as the last line of `mobile/src/ui/App.tsx`, rerun `pnpm run build:web`, confirm it still succeeds, then **revert that temporary line** (`git diff mobile/src/ui/App.tsx` must be empty again before you commit). This mirrors exactly how the Metro crash was first caught, so it's the right way to confirm it's gone.

If `build:web` fails even with the deep-import-only stub, stop — this would mean the barrel-bypass theory is wrong somewhere, and every later task in this plan depends on it being right. Do not attempt further Metro config workarounds on your own; report back with the exact error.

- [ ] **Step 6: Commit**

Run from the repo root of this worktree:
```bash
git add mobile/pnpm-workspace.yaml mobile/package.json mobile/pnpm-lock.yaml mobile/metro.config.js mobile/src/ui/components/VoiceRecordSheet/index.tsx
git commit -m "feat(mobile): wire pnpm workspace for hearsay-pwa, prove Metro-safe deep imports"
```
(The submodule and `.gitmodules` are already committed from a prior session — `git status` should show nothing related to `vendor/hearsay-pwa` left to add.)

---

### Task 2: Web button reset for `VoiceButton`

**Files:**
- Create: `mobile/src/ui/components/VoiceRecordSheet/webButtonReset.ts`

`VoiceButton` renders a raw DOM `<button>` and only accepts a `className` (no `style` prop). Without a reset, the browser's default button chrome (border, padding, background) would show around our custom-styled children.

- [ ] **Step 1: Create the reset helper**

Create `mobile/src/ui/components/VoiceRecordSheet/webButtonReset.ts`:
```ts
const STYLE_ID = 'hearsay-voice-btn-reset';

export function ensureVoiceButtonReset(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = '.hearsay-voice-btn { all: unset; cursor: pointer; display: block; width: 100%; }';
  document.head.appendChild(style);
}
```
The `typeof document === 'undefined'` guard keeps this safe to import from a vitest (node) environment. `display: block; width: 100%;` after `all: unset` intentionally wins — order inside the rule matters here.

- [ ] **Step 2: Commit**

```bash
git add mobile/src/ui/components/VoiceRecordSheet/webButtonReset.ts
git commit -m "feat(mobile): add DOM button reset for the voice record button"
```

---

### Task 3: First-download acknowledgement storage helper

**Files:**
- Modify: `mobile/src/app/lib/storage.ts`
- Create: `mobile/src/app/lib/voiceModelAck.ts`

- [ ] **Step 1: Add the storage key**

In `mobile/src/app/lib/storage.ts`, change:
```ts
export const StorageKeys = {
  current:   '@lista/current',
  history:   '@lista/history',
  favorites: '@lista/favorites'
} as const;
```
to:
```ts
export const StorageKeys = {
  current:       '@lista/current',
  history:       '@lista/history',
  favorites:     '@lista/favorites',
  voiceModelAck: '@lista/voiceModelAck'
} as const;
```

- [ ] **Step 2: Create the helper**

Create `mobile/src/app/lib/voiceModelAck.ts`:
```ts
import { getJSON, setJSON, StorageKeys } from './storage';

export async function hasAcknowledgedVoiceModelDownload(): Promise<boolean> {
  return getJSON<boolean>(StorageKeys.voiceModelAck, false);
}

export async function acknowledgeVoiceModelDownload(): Promise<void> {
  await setJSON(StorageKeys.voiceModelAck, true);
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/lib/storage.ts mobile/src/app/lib/voiceModelAck.ts
git commit -m "feat(mobile): add first-download acknowledgement storage for voice model"
```

---

### Task 4: Waveform display component

**Files:**
- Create: `mobile/src/ui/components/VoiceRecordSheet/Waveform.tsx`

A row of 18 rounded bars. While `active`, bars animate off a fixed base pattern modulated by a live `level` (0-1 amplitude), each bar phase-offset so it reads as a wave. When not active, it shows the post-recording static `waveform` data if present, otherwise the resting base pattern. This component is pure presentation — it has no dependency on `@hearsay-pwa/*` at all, it just receives numbers as props.

- [ ] **Step 1: Create the component**

Create `mobile/src/ui/components/VoiceRecordSheet/Waveform.tsx`:
```tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@ui/styles/theme';

const BASE_HEIGHTS = [6, 14, 22, 30, 18, 10, 16, 26, 32, 20, 12, 8, 14, 24, 30, 22, 14, 10];
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 32;

interface WaveformProps {
  active: boolean;
  level: number;
  waveform: number[] | null;
}

export function Waveform({ active, level, waveform }: WaveformProps) {
  const [heights, setHeights] = useState<number[]>(BASE_HEIGHTS);
  const levelRef = useRef(level);
  levelRef.current = level;
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      setHeights(
        waveform
          ? waveform.map((v) => MIN_HEIGHT + Math.round(v * (MAX_HEIGHT - MIN_HEIGHT)))
          : BASE_HEIGHTS
      );
      return;
    }
    const start = Date.now();
    const tick = () => {
      const t = (Date.now() - start) / 200;
      const lvl = levelRef.current;
      setHeights(
        BASE_HEIGHTS.map((base, idx) => {
          const wave = Math.abs(Math.sin(t + idx * 0.5));
          const amplitude = MIN_HEIGHT + (base - MIN_HEIGHT) * wave * (0.3 + lvl);
          return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(amplitude)));
        })
      );
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [active, waveform]);

  return (
    <View style={styles.row}>
      {heights.map((h, idx) => (
        <View key={idx} style={[styles.bar, { height: h }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: MAX_HEIGHT,
    flex: 1,
    justifyContent: 'center'
  },
  bar: { width: 3.5, borderRadius: 2, backgroundColor: theme.colors.ink }
});
```

- [ ] **Step 2: Verify it typechecks**

Run from `mobile/`: `pnpm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/ui/components/VoiceRecordSheet/Waveform.tsx
git commit -m "feat(mobile): add animated waveform display for voice recording"
```

---

### Task 5: Audio decode helper (Blob → 16kHz mono samples)

**Files:**
- Create: `mobile/src/app/lib/decodeAudioTo16kMono.ts`

Whisper needs 16kHz mono `Float32Array` input. `TranscriptionEngine.transcribe()` normally handles this via `@huggingface/transformers`'s `read_audio()`, but that call needs `AudioContext`, which doesn't exist inside a Worker — so this decode step has to happen on the main thread, before the samples are handed to the transcription Worker (Task 6/7).

- [ ] **Step 1: Create the helper**

Create `mobile/src/app/lib/decodeAudioTo16kMono.ts`:
```ts
const TARGET_SAMPLE_RATE = 16_000;

export async function decodeAudioTo16kMono(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    await audioCtx.close();
  }

  const frameCount = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, frameCount, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}
```

- [ ] **Step 2: Verify it typechecks**

Run from `mobile/`: `pnpm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/lib/decodeAudioTo16kMono.ts
git commit -m "feat(mobile): add main-thread audio decode helper for Whisper input"
```

---

### Task 6: Whisper transcription Worker + esbuild build step

**Files:**
- Create: `mobile/src/workers/whisperWorkerEntry.ts`
- Create: `mobile/scripts/build-whisper-worker.mjs`
- Modify: `mobile/package.json`
- Modify: `.gitignore` (repo root)

The worker mirrors `TranscriptionEngine`'s own webgpu→wasm fallback and model choice, but accepts pre-decoded `Float32Array` samples directly (skipping `TranscriptionEngine.transcribe()`'s `Blob`/`read_audio()` path, which needs `AudioContext` and can't run in a Worker). It's built by esbuild — the same tool already used for `mobile/scripts/build-sw.mjs` — because esbuild passes `onnxruntime-web`'s `import(/*webpackIgnore:true*/e)` pattern through untouched instead of erroring on it (confirmed by a working prototype before this plan was written).

- [ ] **Step 1: Add `@huggingface/transformers` as a direct dependency**

In `mobile/package.json`, add to `"dependencies"` (alphabetically, after `"@gorhom/bottom-sheet"` and before `"@hearsay-pwa/react"` if present, or otherwise near the other `@`-scoped entries):
```json
    "@huggingface/transformers": "^3.0.0",
```
This matches the version range `@hearsay-pwa/core` itself depends on, so pnpm dedupes to one resolved version. Without this, esbuild would need a manual `nodePaths` workaround to find the package (it isn't hoisted to `mobile/node_modules` on its own); declaring it directly avoids that.

Run from `mobile/`: `pnpm install`
Expected: completes with no errors, `@huggingface/transformers` now resolvable directly from `mobile/node_modules`.

- [ ] **Step 2: Write the worker entry**

Create `mobile/src/workers/whisperWorkerEntry.ts` (deliberately under `src/`, not `scripts/` — this file has zero Metro exposure regardless of location since nothing in the app imports it, but keeping it under `src/` means `mobile/tsconfig.json`'s `include` glob covers it and `pnpm run typecheck` genuinely checks it, catching typos in this file's contact with `@huggingface/transformers`'s API surface that `as unknown as Transcriber` casts would otherwise hide until a real browser run):
```ts
import { pipeline } from '@huggingface/transformers';

interface ProgressPayload {
  status: string;
  progress?: number;
}

type Transcriber = (
  audio: Float32Array,
  options?: { language?: string; task?: string }
) => Promise<{ text: string }>;

const MODEL = 'onnx-community/whisper-tiny';
const LANGUAGE = 'portuguese';

let transcriber: Transcriber | null = null;

async function loadTranscriber(onProgress: (p: ProgressPayload) => void): Promise<Transcriber> {
  if (transcriber) return transcriber;
  try {
    transcriber = (await pipeline('automatic-speech-recognition', MODEL, {
      device: 'webgpu',
      progress_callback: onProgress
    })) as unknown as Transcriber;
    return transcriber;
  } catch {
    // WebGPU unavailable or unsupported — fall back to wasm, mirroring TranscriptionEngine's own fallback.
  }
  // No dedicated error type here (unlike TranscriptionEngine's ModelLoadError) — a wasm
  // failure just propagates to the caller, which already wraps this in its own try/catch.
  transcriber = (await pipeline('automatic-speech-recognition', MODEL, {
    device: 'wasm',
    progress_callback: onProgress
  })) as unknown as Transcriber;
  return transcriber;
}

self.onmessage = async (event: MessageEvent) => {
  const { type } = event.data ?? {};

  if (type === 'preload') {
    try {
      await loadTranscriber((p) => postMessage({ type: 'progress', payload: p }));
      postMessage({ type: 'model-ready' });
    } catch (err) {
      postMessage({ type: 'error', payload: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  if (type === 'transcribe') {
    const samples = event.data.payload as Float32Array;
    try {
      const engine = await loadTranscriber((p) => postMessage({ type: 'progress', payload: p }));
      const output = await engine(samples, { language: LANGUAGE, task: 'transcribe' });
      postMessage({ type: 'transcript', payload: output.text.trim() });
    } catch (err) {
      postMessage({ type: 'error', payload: err instanceof Error ? err.message : String(err) });
    }
  }
};
```
`postMessage`/`self`/`MessageEvent` are typed via this project's `"lib": ["DOM", "ESNext"]` tsconfig setting. Because this file lives under `src/`, `pnpm run typecheck` does check it (run it now to confirm no errors) — Metro still never bundles it, since Metro only walks files actually reachable via import from the app's entry point, and nothing in the running app imports this file (only the esbuild script does, independently).

- [ ] **Step 3: Write the build script**

Create `mobile/scripts/build-whisper-worker.mjs`:
```js
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
```
This deliberately does **not** copy any onnxruntime WASM binary as a static asset — `@huggingface/transformers` fetches its ONNX runtime WASM and the model weights from their default remote locations at runtime (the same behavior `TranscriptionEngine.ts` already has, unmodified), cached by the browser's own Cache Storage. Nothing from this feature gets added to the Service Worker's precache list (see Task 12) — a ~21MB payload in the install-time precache would repeat the exact iOS install-budget failure this project already diagnosed and fixed earlier.

- [ ] **Step 4: Wire it into the build pipeline and verify**

In `mobile/package.json`, add to `"scripts"`:
```json
    "build:whisper-worker": "node scripts/build-whisper-worker.mjs",
```
and change the `"build:web"` script from:
```json
    "build:web": "pnpm run gen:splash && pnpm run build:sw && expo export -p web && node scripts/postbuild-sw.mjs && node scripts/postbuild-web.mjs",
```
to:
```json
    "build:web": "pnpm run gen:splash && pnpm run build:sw && pnpm run build:whisper-worker && expo export -p web && node scripts/postbuild-sw.mjs && node scripts/postbuild-web.mjs",
```
It must run before `expo export -p web` so `public/workers/whisper-worker.js` exists for Expo to copy into `dist/`, same ordering `build:sw` already relies on for `public/sw.js`.

Run from `mobile/`:
```bash
pnpm run build:whisper-worker
```
Expected: succeeds, produces `mobile/public/workers/whisper-worker.js` (a large minified bundle, several hundred KB — that's expected, it's the entire `@huggingface/transformers` + `onnxruntime-web` stack). This is the real proof esbuild tolerates what Metro rejects.

Then run:
```bash
pnpm run build:web
```
Expected: succeeds end to end, and `mobile/dist/workers/whisper-worker.js` exists after the export step.

- [ ] **Step 5: Add `mobile/public/workers/` to `.gitignore`**

In the repo root `.gitignore`, add a new entry near the existing `# SW generated` / `mobile/public/sw.js` lines:
```
# Whisper worker bundle, generated at build time
mobile/public/workers/
```
Without this, a future broad `git add -A`/`git add .` (or an IDE's auto-stage) could commit an ~875KB minified bundle with `@huggingface/transformers` + `onnxruntime-web` embedded in it.

- [ ] **Step 6: Commit**

```bash
git add mobile/package.json mobile/pnpm-lock.yaml mobile/src/workers/whisperWorkerEntry.ts mobile/scripts/build-whisper-worker.mjs .gitignore
git commit -m "feat(mobile): build Whisper transcription as a standalone esbuild Worker"
```
`mobile/public/workers/whisper-worker.js` and `mobile/dist/` are build output, not source — they must not be part of this commit (the `.gitignore` entry from Step 5 keeps `public/workers/` out of `git status` entirely now; `dist/` was already covered).

---

### Task 7: Worker-client wrapper

**Files:**
- Create: `mobile/src/app/lib/whisperWorkerClient.ts`

A thin `postMessage` wrapper around the Worker built in Task 6. This file lives under `src/`, so it **is** typechecked and Metro-bundled normally — it never imports `@huggingface/transformers` or anything from `@hearsay-pwa/*`, it only talks to the Worker via messages.

- [ ] **Step 1: Create the client**

Create `mobile/src/app/lib/whisperWorkerClient.ts`:
```ts
export type WhisperWorkerStatus = 'idle' | 'loading-model' | 'transcribing';

interface WhisperWorkerClientOptions {
  onStatusChange?(status: WhisperWorkerStatus): void;
}

interface WorkerMessage {
  type: 'progress' | 'model-ready' | 'transcript' | 'error';
  payload?: unknown;
}

interface PendingCall<T> {
  resolve(value: T): void;
  reject(err: Error): void;
}

export class WhisperWorkerClient {
  private worker: Worker | null = null;
  private pendingPreload: PendingCall<void> | null = null;
  private pendingTranscribe: PendingCall<string> | null = null;

  constructor(private options: WhisperWorkerClientOptions = {}) {}

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker('/workers/whisper-worker.js');
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => this.handleMessage(event.data);
    worker.onerror = (event: ErrorEvent) => {
      const err = new Error(event.message || 'Falha no worker de transcrição');
      this.rejectAll(err);
    };
    this.worker = worker;
    return worker;
  }

  private rejectAll(err: Error): void {
    this.pendingPreload?.reject(err);
    this.pendingPreload = null;
    this.pendingTranscribe?.reject(err);
    this.pendingTranscribe = null;
  }

  private handleMessage(data: WorkerMessage): void {
    if (data.type === 'progress') {
      this.options.onStatusChange?.('loading-model');
      return;
    }
    if (data.type === 'model-ready') {
      this.pendingPreload?.resolve();
      this.pendingPreload = null;
      return;
    }
    if (data.type === 'transcript') {
      this.pendingTranscribe?.resolve(data.payload as string);
      this.pendingTranscribe = null;
      return;
    }
    if (data.type === 'error') {
      this.rejectAll(new Error(String(data.payload)));
    }
  }

  preload(): Promise<void> {
    const worker = this.ensureWorker();
    this.options.onStatusChange?.('loading-model');
    return new Promise((resolve, reject) => {
      this.pendingPreload = { resolve, reject };
      worker.postMessage({ type: 'preload' });
    });
  }

  transcribe(samples: Float32Array): Promise<string> {
    const worker = this.ensureWorker();
    this.options.onStatusChange?.('transcribing');
    return new Promise((resolve, reject) => {
      this.pendingTranscribe = { resolve, reject };
      worker.postMessage({ type: 'transcribe', payload: samples }, [samples.buffer]);
    });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pendingPreload = null;
    this.pendingTranscribe = null;
  }
}
```

- [ ] **Step 2: Verify it typechecks**

Run from `mobile/`: `pnpm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/lib/whisperWorkerClient.ts
git commit -m "feat(mobile): add worker-client wrapper for Whisper transcription"
```

---

### Task 8: First-download modal

**Files:**
- Create: `mobile/src/ui/components/VoiceRecordSheet/FirstDownloadModal.tsx`

- [ ] **Step 1: Create the component**

Create `mobile/src/ui/components/VoiceRecordSheet/FirstDownloadModal.tsx`:
```tsx
import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';

interface FirstDownloadModalProps {
  visible: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export function FirstDownloadModal({ visible, onConfirm, onCancel }: FirstDownloadModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <AppText family="display" size="lg" color="ink">Primeiro uso</AppText>
          <AppText family="mono" size="xs" color="muted" style={styles.body}>
            vamos baixar ~21mb pra reconhecer sua voz. precisa de internet agora, depois funciona offline.
          </AppText>
          <View style={styles.actions}>
            <Button label="Agora não" variant="ghostDark" onPress={onCancel} style={styles.actionBtn} />
            <Button label="Entendi" variant="go" onPress={onConfirm} style={styles.actionBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[5]
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: theme.colors.paper,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    padding: theme.spacing[4]
  },
  body: { marginTop: theme.spacing[2], marginBottom: theme.spacing[4] },
  actions: { flexDirection: 'row', gap: theme.spacing[2], justifyContent: 'flex-end' },
  actionBtn: { minWidth: 96 }
});
```

- [ ] **Step 2: Verify it typechecks**

Run from `mobile/`: `pnpm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/ui/components/VoiceRecordSheet/FirstDownloadModal.tsx
git commit -m "feat(mobile): add first-download explanation modal for voice model"
```

---

### Task 9: `VoiceRecordSheet` full implementation

**Files:**
- Modify: `mobile/src/ui/components/VoiceRecordSheet/index.tsx` (replaces the Task 1 stub)

Orchestrates `AudioRecorder` (deep-imported), `computeWaveform` (deep-imported), `decodeAudioTo16kMono`, and `WhisperWorkerClient` directly — no `useVoiceCommand`, no `TranscriptionEngine` import anywhere in this file. Mirrors the same "don't open the mic / don't leave a recording orphaned if the user releases during model loading" safety the library's own `useVoiceCommand` already solved once (via a `stopRequestedDuringLoadRef`-style guard), since this task reimplements that same load-then-record sequencing itself.

- [ ] **Step 1: Replace the stub with the full component**

Replace the entire contents of `mobile/src/ui/components/VoiceRecordSheet/index.tsx`:
```tsx
import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import type BottomSheet from '@gorhom/bottom-sheet';
import { AudioRecorder } from '@hearsay-pwa/core/src/AudioRecorder';
import { computeWaveform } from '@hearsay-pwa/core/src/Waveform';
import { VoiceButton } from '@hearsay-pwa/react/src/VoiceButton';
import { Sheet } from '@ui/components/Sheet';
import { AppText } from '@ui/components/AppText';
import { Waveform } from './Waveform';
import { FirstDownloadModal } from './FirstDownloadModal';
import { ensureVoiceButtonReset } from './webButtonReset';
import { hasAcknowledgedVoiceModelDownload, acknowledgeVoiceModelDownload } from '@app/lib/voiceModelAck';
import { decodeAudioTo16kMono } from '@app/lib/decodeAudioTo16kMono';
import { WhisperWorkerClient, type WhisperWorkerStatus } from '@app/lib/whisperWorkerClient';
import { theme } from '@ui/styles/theme';
import * as haptics from '@app/lib/haptics';

ensureVoiceButtonReset();

interface VoiceRecordSheetProps {
  onSubmit(text: string): void;
  onClose(): void;
  onError(message: string): void;
}

type SheetStatus = 'idle' | 'loading-model' | 'recording' | 'transcribing';

const STATUS_LABEL: Record<SheetStatus, string> = {
  idle: 'segure pra gravar',
  'loading-model': 'preparando reconhecimento de voz...',
  recording: 'gravando — solte pra transcrever',
  transcribing: 'transcrevendo...'
};

export const VoiceRecordSheet = forwardRef<BottomSheet, VoiceRecordSheetProps>(function VoiceRecordSheet(
  { onSubmit, onClose, onError },
  ref
) {
  const [status, setStatus] = useState<SheetStatus>('idle');
  const [locked, setLocked] = useState(false);
  const [level, setLevel] = useState(0);
  const [waveform, setWaveform] = useState<number[] | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const recorderRef = useRef<AudioRecorder | null>(null);
  if (!recorderRef.current) recorderRef.current = new AudioRecorder();

  const clientRef = useRef<WhisperWorkerClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new WhisperWorkerClient({
      onStatusChange: (workerStatus: WhisperWorkerStatus) => {
        if (workerStatus === 'loading-model') setStatus('loading-model');
        if (workerStatus === 'transcribing') setStatus('transcribing');
      }
    });
  }

  const stopRequestedDuringLoadRef = useRef(false);

  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
      clientRef.current?.terminate();
    };
  }, []);

  const handleSheetChange = (index: number) => {
    if (index < 0) return;
    hasAcknowledgedVoiceModelDownload().then((ack) => {
      if (!ack) setShowDownloadModal(true);
    });
  };

  const handleConfirmDownload = async () => {
    await acknowledgeVoiceModelDownload();
    setShowDownloadModal(false);
  };

  const handleStart = async () => {
    haptics.light();
    stopRequestedDuringLoadRef.current = false;
    setStatus('loading-model');
    setWaveform(null);
    try {
      await clientRef.current!.preload();
      if (stopRequestedDuringLoadRef.current) {
        stopRequestedDuringLoadRef.current = false;
        setStatus('idle');
        return;
      }
      setStatus('recording');
      await recorderRef.current!.start((lvl) => setLevel(lvl));
    } catch (err) {
      setStatus('idle');
      setLevel(0);
      const message =
        err instanceof Error && err.name === 'MicPermissionError'
          ? 'Permita o microfone pra gravar'
          : 'Não deu pra carregar o reconhecimento de voz, tenta o ditado';
      onError(message);
    }
  };

  const handleStop = async () => {
    setLocked(false);
    if (status === 'loading-model') {
      stopRequestedDuringLoadRef.current = true;
      return;
    }
    if (status !== 'recording') return;
    setStatus('transcribing');
    setLevel(0);
    try {
      const blob = await recorderRef.current!.stop();
      const [waveformResult, samples] = await Promise.all([
        computeWaveform(blob, 18).catch(() => null),
        decodeAudioTo16kMono(blob)
      ]);
      setWaveform(waveformResult);
      const text = await clientRef.current!.transcribe(samples);
      setStatus('idle');
      onSubmit(text);
    } catch {
      setStatus('idle');
      onError('Não deu pra carregar o reconhecimento de voz, tenta o ditado');
    }
  };

  const active = status === 'recording';
  const micLabel =
    status === 'loading-model' ? 'aguarde' : active ? 'gravando' : status === 'transcribing' ? 'processando' : 'gravar';

  return (
    <Sheet
      ref={ref}
      snapPoints={['50%']}
      onClose={() => {
        recorderRef.current?.cancel();
        onClose();
      }}
      onChange={handleSheetChange}
    >
      <AppText family="display" size="lg" color="ink">Gravar por voz</AppText>
      <AppText family="mono" size="xs" color="muted" style={styles.subtitle}>
        segure o botão e fale os itens naturalmente
      </AppText>

      <AppText family="mono" size="xs" color="muted" uppercase style={styles.statusLabel}>
        {locked ? 'gravando — travado' : STATUS_LABEL[status]}
      </AppText>

      <View style={styles.panel}>
        <View style={[styles.dot, active && styles.dotActive]} />
        <Waveform active={active} level={level} waveform={waveform} />
        {locked && (
          <Pressable
            onPress={handleStop}
            style={styles.lockBadge}
            accessibilityRole="button"
            accessibilityLabel="Parar gravação travada"
          >
            <AppText family="mono" size="xs" uppercase style={styles.lockBadgeText}>travado ×</AppText>
          </Pressable>
        )}
      </View>

      <VoiceButton
        mode="press-drag-lock"
        className="hearsay-voice-btn"
        onStart={handleStart}
        onStop={handleStop}
        onLockChange={setLocked}
      >
        <View style={[styles.micBtn, active && styles.micBtnActive]}>
          <View style={styles.micIconRow}>
            {[4, 9, 7, 4].map((h, idx) => (
              <View key={idx} style={[styles.micIconBar, { height: h }, active && styles.micIconBarActive]} />
            ))}
          </View>
          <AppText family="mono" size="xs" uppercase style={active ? styles.micLabelActive : styles.micLabel}>
            {micLabel}
          </AppText>
        </View>
      </VoiceButton>

      <AppText family="mono" size="xs" color="muted" style={styles.hint}>
        arraste para cima trava sem precisar segurar
      </AppText>

      <FirstDownloadModal
        visible={showDownloadModal}
        onConfirm={handleConfirmDownload}
        onCancel={() => setShowDownloadModal(false)}
      />
    </Sheet>
  );
});

const styles = StyleSheet.create({
  subtitle: { marginTop: theme.spacing[1], marginBottom: theme.spacing[4] },
  statusLabel: { textAlign: 'center', marginBottom: theme.spacing[3] },
  panel: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    padding: theme.spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[4]
  },
  dot: { width: 8, height: 8, backgroundColor: theme.colors.ink },
  dotActive: { backgroundColor: theme.colors.go },
  lockBadge: {
    backgroundColor: theme.colors.go,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  lockBadgeText: { color: theme.colors.goInk },
  micBtn: {
    borderWidth: 1.5,
    borderColor: theme.colors.go,
    borderRadius: 4,
    backgroundColor: theme.colors.go,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2]
  },
  micBtnActive: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  micIconRow: { flexDirection: 'row', alignItems: 'center', gap: 2.5 },
  micIconBar: { width: 3, borderRadius: 2, backgroundColor: theme.colors.goInk },
  micIconBarActive: { backgroundColor: theme.colors.go },
  micLabel: { color: theme.colors.goInk },
  micLabelActive: { color: theme.colors.go },
  hint: { textAlign: 'center', marginTop: theme.spacing[2] }
});
```

- [ ] **Step 2: Verify it typechecks and bundles**

Run from `mobile/`:
```bash
pnpm run typecheck
pnpm run build:web
```
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/ui/components/VoiceRecordSheet/index.tsx
git commit -m "feat(mobile): implement VoiceRecordSheet orchestrating audio + Whisper worker"
```

---

### Task 10: Masthead icon

**Files:**
- Modify: `mobile/src/ui/screens/Home/components/Masthead.tsx`

Adds a second mic-family icon next to the existing dictation mic: a 30×30 square chip with a 4-bar mini-waveform glyph (same visual language as the recording panel), not a microphone icon.

- [ ] **Step 1: Add the new prop**

In `mobile/src/ui/screens/Home/components/Masthead.tsx`, change:
```tsx
interface MastheadProps {
  totalItems: number;
  onOpenHistory(): void;
  onOpenFavorites(): void;
  onOpenVoice(): void;
}
```
to:
```tsx
interface MastheadProps {
  totalItems: number;
  onOpenHistory(): void;
  onOpenFavorites(): void;
  onOpenVoice(): void;
  onOpenVoiceRecord(): void;
}
```
and change the function signature:
```tsx
export function Masthead({ totalItems, onOpenHistory, onOpenFavorites, onOpenVoice }: MastheadProps) {
```
to:
```tsx
export function Masthead({ totalItems, onOpenHistory, onOpenFavorites, onOpenVoice, onOpenVoiceRecord }: MastheadProps) {
```

- [ ] **Step 2: Add the new icon button**

Immediately after the existing "Adicionar por voz" `Pressable` (the one with `<Feather name="mic" ... />`), add:
```tsx
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gravar comando de voz"
            hitSlop={12}
            onPress={() => {
              haptics.light();
              onOpenVoiceRecord();
            }}
            style={styles.waveIconBtn}
          >
            <View style={styles.waveIconRow}>
              {[3, 7, 5, 3].map((h, idx) => (
                <View key={idx} style={[styles.waveIconBar, { height: h }]} />
              ))}
            </View>
          </Pressable>
```

- [ ] **Step 3: Add the new styles**

In the `StyleSheet.create` call at the bottom of the file, add after `iconBtn`:
```ts
  waveIconBtn: {
    width: 30,
    height: 30,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  waveIconRow: { flexDirection: 'row', alignItems: 'center', gap: 1.5 },
  waveIconBar: { width: 2, borderRadius: 1, backgroundColor: theme.colors.ink }
```

- [ ] **Step 4: Verify it typechecks**

Run from `mobile/`: `pnpm run typecheck`
Expected: fails until Task 11 updates the `Masthead` call site in `Home/index.tsx` — confirm the only error is the missing `onOpenVoiceRecord` prop at that call site, nothing else.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/ui/screens/Home/components/Masthead.tsx
git commit -m "feat(mobile): add voice-record icon to Masthead"
```

---

### Task 11: Wire `VoiceRecordSheet` into `HomeScreen`

**Files:**
- Modify: `mobile/src/ui/screens/Home/index.tsx`

Reuses the existing `handleVoiceSubmit` (no duplicated matching logic) and the existing `Toast` for errors.

- [ ] **Step 1: Add the import**

In `mobile/src/ui/screens/Home/index.tsx`, add after the `VoiceCommandSheet` import:
```tsx
import { VoiceRecordSheet } from '@ui/components/VoiceRecordSheet';
```

- [ ] **Step 2: Add the ref**

Change:
```tsx
  const voiceRef = useRef<BottomSheet>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
```
to:
```tsx
  const voiceRef = useRef<BottomSheet>(null);
  const voiceRecordRef = useRef<BottomSheet>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
```

- [ ] **Step 3: Pass the new prop to `Masthead`**

Change:
```tsx
        <Masthead
          totalItems={totalItems}
          onOpenHistory={() => historyRef.current?.expand()}
          onOpenFavorites={() => favoritesRef.current?.expand()}
          onOpenVoice={() => voiceRef.current?.expand()}
        />
```
to:
```tsx
        <Masthead
          totalItems={totalItems}
          onOpenHistory={() => historyRef.current?.expand()}
          onOpenFavorites={() => favoritesRef.current?.expand()}
          onOpenVoice={() => voiceRef.current?.expand()}
          onOpenVoiceRecord={() => voiceRecordRef.current?.expand()}
        />
```

- [ ] **Step 4: Render `VoiceRecordSheet`**

Change:
```tsx
      <VoiceCommandSheet
        ref={voiceRef}
        onSubmit={handleVoiceSubmit}
        onClose={() => voiceRef.current?.close()}
      />
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
```
to:
```tsx
      <VoiceCommandSheet
        ref={voiceRef}
        onSubmit={handleVoiceSubmit}
        onClose={() => voiceRef.current?.close()}
      />
      <VoiceRecordSheet
        ref={voiceRecordRef}
        onSubmit={handleVoiceSubmit}
        onClose={() => voiceRecordRef.current?.close()}
        onError={(message) => setToastMessage(message)}
      />
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
```

- [ ] **Step 5: Verify it typechecks, builds, and existing tests still pass**

Run from `mobile/`:
```bash
pnpm run typecheck
pnpm test
pnpm run build:web
```
Expected: all three succeed — `pnpm test` still shows the same 12 passing `voiceCommand.test.ts` tests (untouched by this feature).

- [ ] **Step 6: Commit**

```bash
git add mobile/src/ui/screens/Home/index.tsx
git commit -m "feat(mobile): wire VoiceRecordSheet into HomeScreen"
```

---

### Task 12: Manual device verification

No new automated tests are added beyond what already exists — this feature is UI wiring plus a Worker-isolated build step on top of an already-tested matcher (`parseVoiceCommand`) and an external library. Verify on a real device:

- [ ] **Step 1: Confirm the whisper-worker asset isn't precached**

Run from `mobile/`: `pnpm run build:web`, then check `mobile/dist/sw.js`'s injected `self.__PRECACHE_ASSETS__` list (search for `workers/whisper-worker.js`). Expected: **not present** — this file must only ever be fetched on demand, never eagerly downloaded at PWA install time. If it is present, something in `mobile/scripts/postbuild-sw.mjs`'s asset-scanning changed unexpectedly and needs to be fixed before merging (`postbuild-sw.mjs` wasn't touched by this plan — this check just confirms that stayed true).

- [ ] **Step 2: Local dev smoke test**

Run from `mobile/`: `pnpm start`, press `w` for web. Open the new mic icon in the Masthead, confirm the first-download modal appears, confirm it, hold the button, speak a few catalog item names, release, confirm the transcript gets parsed and toggled into the list with a toast — same as the dictation flow.

- [ ] **Step 3: Deploy a preview build**

This worktree has no `.vercel/` folder (it's gitignored, so a fresh worktree checkout doesn't carry it). Copy the project link from the main checkout, then deploy from the repo root:
```bash
mkdir -p .vercel
cp ../../.vercel/project.json .vercel/project.json
vercel
```
(non-`--prod`, from repo root since `vercel.json`'s `buildCommand` runs `cd mobile && ...`). Confirm the build succeeds with the git submodule present — Vercel needs to actually clone `mobile/vendor/hearsay-pwa`; if the build fails to find the submodule, enable "Automatically install Git submodules" (or equivalent) in the Vercel project's Git settings before retrying.

- [ ] **Step 4: Real-device checklist**

On an iOS Safari (and, if available, Android Chrome) device, added to the home screen as a PWA:
- [ ] Mic permission prompt appears on first recording attempt; denying it shows the "permita o microfone" toast and the sheet stays open.
- [ ] Press-and-hold shows "preparando reconhecimento..." briefly, then records with the waveform animating; releasing stops and transcribes; matched items get added with the usual toast.
- [ ] Releasing very quickly during "preparando reconhecimento..." (before recording actually starts) does not crash or produce an empty-transcript attempt — it just cancels back to idle.
- [ ] Press-and-drag-up locks; the "travado ×" badge appears and tapping it stops the recording.
- [ ] First-download modal only appears once; after confirming, later recordings skip straight to the brief `loading-model` → `recording` flow.
- [ ] After the model is cached, turn off wifi/data entirely and confirm recording + transcription still works offline, consistent with the rest of the PWA.
- [ ] The OS-dictation mic icon still opens `VoiceCommandSheet` and works exactly as before — this feature is additive, not a replacement.

- [ ] **Step 5: Report back**

Once verified, report results back before merging — this is a manual gate, not something to mark done from typecheck/build output alone.
