# Hearsay-pwa voice recording integration — design

## Context

Pracomprá already has a voice-input feature (`docs/superpowers/specs/2026-07-08-voice-command-selection-design.md`): the user taps a mic icon, an OS-level dictation sheet opens, they dictate via the iOS/Android keyboard's mic key, and the dictated text is parsed against the catalog with `parseVoiceCommand`. This works today but depends entirely on the OS keyboard's dictation quality and requires the sheet's text field to have focus.

The user has built a separate open-source library, [hearsay-pwa](https://github.com/JordanLippert/hearsay-pwa) (`@hearsay-pwa/core` + `@hearsay-pwa/react`), that does real on-device audio recording + Whisper transcription (via `@huggingface/transformers`) + live waveform data, headless and unstyled by design. This integration adds a second, real-recording-based voice input to Pracomprá using that library, **alongside** the existing dictation feature — not replacing it.

## Goals

- Add a second mic entry point that records real audio, transcribes it on-device with Whisper, and feeds the transcript through the existing `parseVoiceCommand` matcher — same downstream behavior as dictation, different input method.
- Keep the existing OS-dictation feature untouched as a fast, no-download fallback.
- Ship a UI that reads as Pracomprá's own visual language (paper/ink/go palette, square-cut borders, mono labels), not a generic voice-assistant look.

## Non-goals

- Not replacing or removing `VoiceCommandSheet` (OS dictation).
- Not changing `parseVoiceCommand` itself — it's reused as-is.
- Not publishing hearsay-pwa to npm — consumed via git submodule (see below).

## Library installation

`@hearsay-pwa/react` depends on `@hearsay-pwa/core` via `workspace:*`, and the repo isn't published to npm. The library's own README documents a Bun-workspace-based consumption path (git submodule + folding its `packages/*` into the consumer's workspace so `workspace:*` resolves without any registry). We adapt that to pnpm:

- `git submodule add https://github.com/JordanLippert/hearsay-pwa.git mobile/vendor/hearsay-pwa`
- New `mobile/pnpm-workspace.yaml`:
  ```yaml
  packages:
    - "."
    - "vendor/hearsay-pwa/packages/*"
  ```
- `mobile/package.json` gets `"@hearsay-pwa/react": "workspace:*"` as a dependency.
- `pnpm install` from `mobile/` resolves `@hearsay-pwa/react` and its internal `@hearsay-pwa/core` dependency as real workspace members, no npm registry involved.
- Updating the library later: `git submodule update --remote mobile/vendor/hearsay-pwa` (pinned to a tag) + `pnpm install`.

This is untested with pnpm specifically (the library's README only confirms Bun) — first implementation task validates it actually resolves before building anything on top.

### Metro bundler incompatibility (discovered during implementation)

`@hearsay-pwa/core`'s `TranscriptionEngine.ts` imports `@huggingface/transformers`, which pulls in `onnxruntime-web` as its WASM inference backend. Every browser bundle `onnxruntime-web` ships contains a dynamic import of the form `import(/*webpackIgnore:true*/e)` — a runtime-computed specifier with a webpack-only magic comment telling bundlers not to statically analyze it. Metro (the bundler behind `expo export -p web`) requires `import()`/`require()` specifiers to be static string literals and throws a hard `SyntaxError` on this pattern. This is structural to every distributed build of `onnxruntime-web` (there's a long-open, unresolved upstream issue about it, `microsoft/onnxruntime#22615`) — no Metro resolver config change fixes it; `unstable_enablePackageExports = false` was tried and only moved which `onnxruntime-web` file got hit, not whether the crash happens.

Two consequences for this integration:

1. **`useVoiceCommand` and `TranscriptionEngine` are never imported into the Metro-bundled app.** Both packages' `index.ts` barrels re-export the poisoned chain alongside the safe pieces (`@hearsay-pwa/core`'s barrel exports `AudioRecorder` and `TranscriptionEngine` from the same file; `@hearsay-pwa/react`'s barrel exports `VoiceButton` and `useVoiceCommand` from the same file), and Metro resolves whatever a barrel statically re-exports regardless of what's actually used — so even `import { AudioRecorder } from '@hearsay-pwa/react'` would drag `TranscriptionEngine.ts` into the graph and crash. The app imports `AudioRecorder`, `computeWaveform`, and `VoiceButton` via **deep paths directly into the submodule's source** (bypassing both barrels), and never imports `useVoiceCommand` or `TranscriptionEngine` from the app's own Metro-bundled code at all.
2. **Transcription runs in a separate Worker, built by esbuild instead of Metro.** esbuild passes the same dynamic-import pattern through untouched at build time (verified: it bundles `@huggingface/transformers` + `onnxruntime-web` without error, and the resulting bundle runs Whisper end-to-end, wasm backend included, inside a classic Worker). The main thread loads it via `new Worker('/workers/whisper-worker.js')` — a plain string literal, which Metro does not statically analyze the way it analyzes `import()`/`require()`. The worker is built by its own esbuild script (mirroring the existing `build:sw` convention) and is **not** added to the Service Worker's precache list — the model weights + ONNX WASM binary it downloads on first use (~73MB — see the model choice note below) are cached separately by the browser (Cache Storage on the Hugging Face CDN origin), exactly like the existing "Offline behavior" section below already assumed. Adding a payload that size to the SW's install-time precache would repeat the exact iOS install-budget failure this project already diagnosed and fixed earlier in the PWA's history.

One knock-on effect: `TranscriptionEngine.transcribe(blob)` decodes audio via `read_audio()`, which needs `AudioContext` — unavailable inside a Worker. So audio decoding (Blob → 16kHz mono `Float32Array`) happens on the **main thread** before the samples are transferred to the worker; the worker's own transcription logic is a small, deliberately-duplicated mirror of `TranscriptionEngine`'s webgpu→wasm fallback (same model, same language option) that accepts pre-decoded samples directly instead of a `Blob`, since `TranscriptionEngine.transcribe()` itself can't be reused as-is inside a Worker.

## UI / component design

### Masthead

Two mic-family icons, matching the existing history/favorites icon row (`mobile/src/ui/screens/Home/components/Masthead.tsx`):

- Existing `Feather` `"mic"` icon → unchanged, opens `VoiceCommandSheet` (dictation).
- New icon, 28×28 chip, `1.5px solid` ink border, `border-radius: 4`, containing 4 small centered vertical bars (heights `[3,7,5,3]`, rounded caps) forming a static mini-waveform glyph — not a microphone icon. This is the library's own visual signature carried into the masthead, distinct from the dictation mic. Opens the new `VoiceRecordSheet`.

### VoiceRecordSheet (new component)

A `Sheet` (reusing the existing `Sheet` component, same as `VoiceCommandSheet`) containing:

- Title + subtitle in the established `AppText` display/mono pattern.
- A status label (mono, xs, uppercase, muted) reflecting the sheet's own orchestrated status (see Data flow below): "segure pra gravar" (idle) / "preparando reconhecimento..." (loading-model) / "gravando — solte pra transcrever" (recording) / "gravando — travado" (locked) / "transcrevendo..." (transcribing).
- A waveform panel: full-width box, `1.5px solid` ink border, containing a small square recording-state dot + a row of ~18-26 bars (rounded caps, `width: 3.5px`) driven by `AudioRecorder`'s live level callback while recording, and `computeWaveform`'s static output once stopped. Bar heights follow a fixed irregular pattern as the idle/rest shape (not flat), animated from those values while active.
- A lock badge (mono, xs, uppercase, `go` background, `goInk` text, `border-radius: 4`, matching `Button`'s `go` variant chip look) shown only while `VoiceButton`'s `onLockChange` has fired `true`.
- The record control itself is `VoiceButton` (`mode="press-drag-lock"`) styled as a full-width square-cornered button: `go` background/border when idle, inverted to `ink` background with `go`-colored bars/label when active (recording or locked) — same 4-5-bar glyph as the masthead icon, centered, matching heights `[4,9,7,4]`.
- Helper caption below the button (mono, xs, muted): "arraste para cima trava sem precisar segurar".

Once the worker returns a transcript, that text is handed to the same submit handler dictation uses (see below), and the sheet closes.

### Shared submit handler

`Home/index.tsx`'s `handleVoiceSubmit(text: string)` (currently wired only to `VoiceCommandSheet.onSubmit`) is reused unchanged as the completion handler for `VoiceRecordSheet` too — both sheets end up calling the same `parseVoiceCommand` + toggle-list + toast logic. No duplication of that logic.

### First-download modal

Before the user's first-ever recording attempt, a small modal explains the one-time model download (~73MB, needs internet, cached after that). Shown once, gated by an AsyncStorage flag (`voiceModelDownloadAcknowledged`). Confirming the modal proceeds directly into the sheet's own `start()` orchestration (below). On any later session, the modal is skipped — the `loading-model` status text alone covers the (now rare, e.g. cache evicted) re-download case.

### Errors

All surfaced through the existing `Toast` component (same one dictation's flow already uses):

- `MicPermissionError` (thrown by `AudioRecorder.start()` directly, caught in `VoiceRecordSheet`) → "permita o microfone pra gravar" — sheet stays open so the user can retry after granting permission.
- Worker load/transcription failure (posted back as an `{type: "error"}` message, not a thrown `ModelLoadError` instance — see Data flow) → "não deu pra carregar o reconhecimento de voz, tenta o ditado" — explicitly points at the dictation fallback; sheet stays open, user closes it manually and taps the other mic icon.
- Waveform computation failure → no toast; `computeWaveform` already degrades to `null` internally (unchanged from the library's own behavior) and the panel simply shows the idle bar pattern.

### No CommandMatcher, no useVoiceCommand

The sheet never imports `useVoiceCommand` or `CommandMatcher` at all (not even with `intents: []`) — both are unreachable from Metro-bundled code per the bundler incompatibility above. The sheet orchestrates `AudioRecorder`, `computeWaveform`, its own audio-decode step, and the transcription Worker directly; `parseVoiceCommand` remains the only catalog matcher in play, same as today.

## Data flow

```
user holds VoiceButton
  -> VoiceRecordSheet.start()
       -> whisperWorkerClient.preload() (fires model load in the Worker; whisper-base q8, first call downloads + caches)
       -> AudioRecorder.start() (mic capture + live level) — deep-imported, main thread
user releases / drags to lock
  -> VoiceRecordSheet.stop()
       -> AudioRecorder.stop() -> Blob
       -> computeWaveform(blob) (main thread, deep-imported)
       -> decodeAudioTo16kMono(blob) -> Float32Array (main thread, Web Audio API)
       -> whisperWorkerClient.transcribe(samples) -> postMessage to Worker, transferable buffer
            -> Worker: TranscriptionEngine-equivalent load (webgpu -> wasm fallback) + pipeline(samples)
            -> postMessage back: transcript text, or error
  -> Home.handleVoiceSubmit(text)
       -> parseVoiceCommand(text, catalog items)
       -> list.toggle(...) per matched item
       -> Toast summary
```

## Offline behavior

Once the whisper-base model has been downloaded and cached (transformers.js's own Cache Storage usage, on the Hugging Face CDN origin — separate from our app's own Service Worker scope and precache list), recording + transcription is expected to keep working fully offline, consistent with the rest of the PWA. This is an assumption carried over from how transformers.js caching is documented to work, not yet verified against Pracomprá's specific SW setup — real-device offline verification is a required manual task before merge, same as every other offline claim made during the earlier PWA-offline work.

### Model choice (revised during implementation)

The original plan used `whisper-tiny` (smallest, fastest download). Real-device testing showed its Portuguese accuracy wasn't just occasional single-word misses (acceptable, expected) but whole phrases coming out garbled — worse than useful. Switched to `whisper-base` with `dtype: "q8"` forced explicitly on both the webgpu and wasm code paths in the transcription Worker: the wasm path already defaulted to the smaller `q8` quantized checkpoint on its own, but webgpu defaulted to the much larger unquantized `fp32` one unless told otherwise, so forcing `q8` on both keeps the download consistent regardless of which backend a given device ends up using. Net effect: a meaningfully more accurate model at a download size closer to what an unquantized `tiny` would have cost, not a full `tiny`→`base` size jump. The `~73MB` estimate is the one-time download shown in the first-use modal — it is not re-downloaded once cached.

## Testing

- No new vitest suite is planned for the UI wiring — same reasoning as before (matching logic is already covered by `parseVoiceCommand`'s existing tests).
- UI wiring (`VoiceRecordSheet`, masthead icon, shared submit handler, first-download modal) is verified manually on a real device, matching how the dictation feature's UI-wiring tasks were verified in the prior voice-command-selection work.
- The pnpm submodule-workspace install and the Metro-safe deep-import pattern are validated as the first implementation task, before any component work starts.
- The transcription Worker has its own build+verify step, independent of the main app's `typecheck`/`build:web` — esbuild bundling it successfully is the syntax check; Metro never parses this file at all, so it's the only piece of this feature that main-app verification can't catch mistakes in.

## Branching

Implemented on a separate branch (worktree), same pattern as the dictation feature: build and manually verify on a real device before merging to master.
