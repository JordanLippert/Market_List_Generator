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

## UI / component design

### Masthead

Two mic-family icons, matching the existing history/favorites icon row (`mobile/src/ui/screens/Home/components/Masthead.tsx`):

- Existing `Feather` `"mic"` icon → unchanged, opens `VoiceCommandSheet` (dictation).
- New icon, 28×28 chip, `1.5px solid` ink border, `border-radius: 4`, containing 4 small centered vertical bars (heights `[3,7,5,3]`, rounded caps) forming a static mini-waveform glyph — not a microphone icon. This is the library's own visual signature carried into the masthead, distinct from the dictation mic. Opens the new `VoiceRecordSheet`.

### VoiceRecordSheet (new component)

A `Sheet` (reusing the existing `Sheet` component, same as `VoiceCommandSheet`) containing:

- Title + subtitle in the established `AppText` display/mono pattern.
- A status label (mono, xs, uppercase, muted) reflecting `useVoiceCommand`'s `status`: "segure pra gravar" (idle) / "preparando reconhecimento..." (loading-model) / "gravando — solte pra transcrever" (recording) / "gravando — travado" (locked) / "transcrevendo..." (transcribing).
- A waveform panel: full-width box, `1.5px solid` ink border, containing a small square recording-state dot + a row of ~18-26 bars (rounded caps, `width: 3.5px`) driven by `useVoiceCommand`'s `level` (live, while recording) and `waveform` (static, once `done`). Bar heights follow a fixed irregular pattern as the idle/rest shape (not flat), animated from `level`/`waveform` values while active.
- A lock badge (mono, xs, uppercase, `go` background, `goInk` text, `border-radius: 4`, matching `Button`'s `go` variant chip look) shown only while `VoiceButton`'s `onLockChange` has fired `true`.
- The record control itself is `VoiceButton` (`mode="press-drag-lock"`) styled as a full-width square-cornered button: `go` background/border when idle, inverted to `ink` background with `go`-colored bars/label when active (recording or locked) — same 4-5-bar glyph as the masthead icon, centered, matching heights `[4,9,7,4]`.
- Helper caption below the button (mono, xs, muted): "arraste para cima trava sem precisar segurar".

On `useVoiceCommand`'s `status` reaching `"done"`, the transcribed text (`result.text`) is handed to the same submit handler dictation uses (see below), and the sheet closes.

### Shared submit handler

`Home/index.tsx`'s `handleVoiceSubmit(text: string)` (currently wired only to `VoiceCommandSheet.onSubmit`) is reused unchanged as the completion handler for `VoiceRecordSheet` too — both sheets end up calling the same `parseVoiceCommand` + toggle-list + toast logic. No duplication of that logic.

### First-download modal

Before the user's first-ever recording attempt, a small modal explains the one-time model download (~40MB, needs internet, cached after that). Shown once, gated by an AsyncStorage flag (`voiceModelDownloadAcknowledged`). Confirming the modal proceeds directly into `useVoiceCommand.start()`. On any later session, the modal is skipped — the `loading-model` status text alone covers the (now rare, e.g. cache evicted) re-download case.

### Errors

All surfaced through the existing `Toast` component (same one dictation's flow already uses):

- `MicPermissionError` → "permita o microfone pra gravar" — sheet stays open so the user can retry after granting permission.
- `ModelLoadError` → "não deu pra carregar o reconhecimento de voz, tenta o ditado" — explicitly points at the dictation fallback; sheet stays open, user closes it manually and taps the other mic icon.
- `WaveformError` → no toast; the library already degrades `waveform` to `null` internally and the panel simply shows the idle bar pattern.

### CommandMatcher bypass

`useVoiceCommand({ intents: [] })` — per the library's now-documented behavior, every result comes back as `{status: "no_match", text}` (or `"no_speech"`), and `result.text` carries the raw transcript regardless. We never touch `CommandMatcher`'s intent/pattern matching; `parseVoiceCommand` is the only matcher in play, same as today.

## Data flow

```
user holds VoiceButton
  -> useVoiceCommand.start()
       -> TranscriptionEngine.load() (whisper-tiny, first call downloads + caches)
       -> AudioRecorder.start() (mic capture + live level)
user releases / drags to lock
  -> useVoiceCommand.stop()
       -> AudioRecorder.stop() -> Blob
       -> computeWaveform(blob) + TranscriptionEngine.transcribe(blob) concurrently
       -> result.text
  -> Home.handleVoiceSubmit(result.text)
       -> parseVoiceCommand(text, catalog items)
       -> list.toggle(...) per matched item
       -> Toast summary
```

## Offline behavior

Once the whisper-tiny model has been downloaded and cached (transformers.js's own Cache Storage usage, on the Hugging Face CDN origin — separate from our app's own Service Worker scope and precache list), recording + transcription is expected to keep working fully offline, consistent with the rest of the PWA. This is an assumption carried over from how transformers.js caching is documented to work, not yet verified against Pracomprá's specific SW setup — real-device offline verification is a required manual task before merge, same as every other offline claim made during the earlier PWA-offline work.

## Testing

- No new pure-function logic is introduced (transcription/matching logic lives in the library and in the already-tested `parseVoiceCommand`), so no new vitest suite is planned.
- UI wiring (`VoiceRecordSheet`, masthead icon, shared submit handler, first-download modal) is verified manually on a real device, matching how the dictation feature's UI-wiring tasks were verified in the prior voice-command-selection work.
- The pnpm submodule-workspace install itself is validated as the first implementation task (`pnpm install` resolving `@hearsay-pwa/react` correctly) before any component work starts.

## Branching

Implemented on a separate branch (worktree), same pattern as the dictation feature: build and manually verify on a real device before merging to master.
