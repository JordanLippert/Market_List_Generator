import { pipeline, env } from '@huggingface/transformers';

// Multi-threaded wasm needs cross-origin isolation (COOP/COEP headers) for
// SharedArrayBuffer -- the Vercel deploy now sets those (see vercel.json), so
// only force the single-threaded, non-proxied fallback when isolation isn't
// actually available (e.g. a hosting environment without the headers, or an
// iframe embed). Forcing this unconditionally throttled every CPU-assigned op
// (shape ops etc.) even on the webgpu device path, not just the wasm fallback.
if (!self.crossOriginIsolated) {
  env.backends.onnx.wasm!.numThreads = 1;
  env.backends.onnx.wasm!.proxy = false;
}

// Self-hosted instead of the transformers.js default (jsDelivr CDN) so the
// wasm runtime is covered by the same-origin service worker cache -- the
// "works offline after first use" promise in FirstDownloadModal previously
// depended on the CDN's HTTP cache never being evicted, which isn't a real
// guarantee. Copied into public/workers/ by build-whisper-worker.mjs.
env.backends.onnx.wasm!.wasmPaths = '/workers/';

interface ProgressPayload {
  status: string;
  progress?: number;
}

type Transcriber = (
  audio: Float32Array,
  options?: {
    language?: string;
    task?: string;
    no_repeat_ngram_size?: number;
    chunk_length_s?: number;
    stride_length_s?: number;
    temperature?: number;
    do_sample?: boolean;
  }
) => Promise<{ text: string }>;

// whisper-tiny's Portuguese accuracy proved too poor in real testing (whole
// phrases garbled, not just an occasional missed word) -- whisper-base is
// meaningfully more accurate.
const MODEL = 'onnx-community/whisper-base';
const LANGUAGE = 'portuguese';

// 'q8'/int8 on the webgpu device was a known-broken combination in
// transformers.js v3 (huggingface/transformers.js#1317) -- produced gibberish
// regardless of audio quality, root-caused (per that issue thread) to the old
// WebGPU EP mishandling dequantize layers, not specific to the decoder. v4
// (@huggingface/transformers ^4.2.0) replaced that EP with a native one and
// fixed this -- confirmed with 4 straight correct real-audio transcriptions
// after upgrading, using plain 'q8' on both backends (~73MB total download,
// vs ~200MB for the fp32-encoder/q4-decoder workaround v3 needed). v4 also
// re-enabled SuppressTokensLogitsProcessor (verified in node_modules --
// it was commented out in the installed v3.8.1), which independently
// suppresses Whisper's ~90 standard non-speech tokens on both backends and
// was likely contributing to the multi-script garbage output seen earlier.
const DTYPE = 'q8';

// --- Compression-ratio check + temperature-escalation retry --------------------------------
//
// transformers.js v4's ASR pipeline does NOT implement OpenAI Whisper's original robustness
// loop -- verified directly in node_modules/@huggingface/transformers/src/pipelines/
// automatic-speech-recognition.js and models/modeling_utils.js (the same way no_repeat_ngram_size
// and chunk_length_s were verified as real supported passthroughs earlier in this project):
//
// - No temperature fallback schedule, no compression_ratio_threshold, no logprob_threshold,
//   no no_speech_threshold, no condition_on_previous_text anywhere in the pipeline.
// - `temperature`/`do_sample` ARE real passthrough generate() kwargs, same mechanism as
//   no_repeat_ngram_size: `_call_whisper` spreads every kwarg straight into
//   `this.model.generate({ inputs, ...generation_config })`. Confirmed in
//   models/modeling_utils.js that `do_sample` gates whether a TemperatureLogitsWarper is even
//   constructed (`if (generation_config.do_sample) { if (temperature !== 1.0)
//   processors.push(new TemperatureLogitsWarper(temperature)) }`) -- temperature alone, without
//   do_sample: true, is silently inert. Both must be set together.
// - `logprob_threshold`/`no_speech_threshold` are NOT realistically implementable through this
//   pipeline() call and are deliberately skipped here (scope decision, not an oversight): the
//   ASR pipeline's return value is only `{ text, chunks? }` (see `_call_whisper`'s final
//   `toReturn.push({ text: full_text, ...optional })`) -- no per-token logprobs or no-speech
//   probability ever escape it. `output_scores` exists as a GenerationConfig field
//   (generation/configuration_utils.js) but is dead code: it's declared and never read anywhere
//   in the actual generation loop (models/modeling_utils.js), so setting it today is a silent
//   no-op. Getting real logprobs would mean bypassing pipeline() entirely and reimplementing
//   _call_whisper's chunking + decode_asr merge by hand around a raw model.generate() call --
//   a much bigger, riskier rewrite than a robustness-knob addition, so it's out of scope here.
//
// What's implemented below: OpenAI's compression-ratio check computed purely from the returned
// text, with temperature-escalation retry on failure. Temperature 0 (greedy, deterministic) is
// what the first attempt already does by omitting temperature/do_sample, so the retry schedule
// starts at the *next* tier of OpenAI's real fallback list ([0.0, 0.2, 0.4, 0.6, 0.8, 1.0]).
const TEMPERATURE_SCHEDULE = [0.2, 0.4, 0.6, 0.8, 1.0];

// OpenAI's default compression_ratio_threshold is 2.4, tuned against long-form English
// dictation where gzip's fixed container overhead is negligible relative to the payload. Our
// transcripts are short Portuguese grocery commands (a few words), where that's not true --
// spot-checked locally with Node's zlib (same DEFLATE algorithm CompressionStream uses) across
// legit short commands, natural multi-item dictation, and degenerate repeated-word text:
// using the 'gzip' *container* format, fixed header/footer overhead (~20+ bytes) swamps short
// strings so badly that even the real near-duplicate hallucination seen in testing
// ("Adicionar 3 Massas Adicioner 3 Massos") scored *under* 1.0 -- nowhere near a 2.4 cutoff.
// Using the 'deflate' format instead (zlib stream, ~6 bytes of fixed overhead: a 2-byte header
// + 4-byte Adler32 checksum, no gzip container) removes most of that fixed cost: legit short
// commands and natural longer dictation both stay in the ~0.4-1.4 ratio range, while exact/
// near-exact repeated-word degenerate output (the actual pathology this guards against, e.g.
// a word or phrase looping many times) climbs well past 2.4 within a handful of repeats. So
// OpenAI's 2.4 constant is kept as-is, but paired with 'deflate' rather than 'gzip' so the
// threshold is actually meaningful at this text length. Known limitation, inherent to the
// compression-ratio heuristic itself (not a calibration miss): a single near-duplicate
// paraphrase (one repeat, different spelling) -- as opposed to a genuine repetition *loop* --
// doesn't compress enough to trip this check. no_repeat_ngram_size + this check are
// complementary, not a complete guarantee.
const COMPRESSION_RATIO_THRESHOLD = 2.4;

async function computeCompressionRatio(text: string): Promise<number> {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length === 0) return 0;
  // CompressionStream is available in Worker global scope in modern browsers (Chrome, Firefox,
  // Safari 16.4+) -- Node's zlib isn't available here since this runs inside a Web Worker.
  const cs = new CompressionStream('deflate');
  const writer = cs.writable.getWriter();
  void writer.write(bytes);
  void writer.close();
  const compressedChunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) compressedChunks.push(value);
  }
  const compressedLength = compressedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  return bytes.length / Math.max(compressedLength, 1);
}

let transcriber: Transcriber | null = null;

async function loadTranscriber(onProgress: (p: ProgressPayload) => void): Promise<Transcriber> {
  if (transcriber) return transcriber;
  const startedAt = performance.now();
  try {
    transcriber = (await pipeline('automatic-speech-recognition', MODEL, {
      device: 'webgpu',
      dtype: DTYPE,
      progress_callback: onProgress
    })) as unknown as Transcriber;
    console.log(`[whisper-worker] model loaded (webgpu) in ${(performance.now() - startedAt).toFixed(0)}ms`);
    return transcriber;
  } catch {
    // WebGPU unavailable or unsupported — fall back to wasm, mirroring TranscriptionEngine's own fallback.
  }
  // No dedicated error type here (unlike TranscriptionEngine's ModelLoadError) — a wasm
  // failure just propagates to the caller, which already wraps this in its own try/catch.
  transcriber = (await pipeline('automatic-speech-recognition', MODEL, {
    device: 'wasm',
    dtype: DTYPE,
    progress_callback: onProgress
  })) as unknown as Transcriber;
  console.log(`[whisper-worker] model loaded (wasm) in ${(performance.now() - startedAt).toFixed(0)}ms`);
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
      // transformers.js's ASR pipeline defaults to chunk_length_s: 0 (no chunking), which
      // its own console warning flags as wrong for any audio over Whisper's 30s window
      // ("Attempting to extract features for audio longer than 30 seconds..."). Fixed here
      // by chunking into 30s windows with 5s of overlap so long recordings get transcribed
      // window-by-window instead of in one pass the pipeline itself says is unsupported.
      // no_repeat_ngram_size stays as a cheap backstop against repetition within a window.
      const baseOptions = {
        language: LANGUAGE,
        task: 'transcribe',
        no_repeat_ngram_size: 3,
        chunk_length_s: 30,
        stride_length_s: 5
      } as const;

      const startedAt = performance.now();

      // Attempt 1: greedy/deterministic (temperature 0, the default when temperature/do_sample
      // are omitted) -- same call this file always made. If its output's compression ratio
      // flags likely repetition, retry with escalating temperature per OpenAI's fallback
      // schedule (see the constants above), stopping at the first attempt that passes the
      // check or, failing all of them, falling back to the *last* attempt's output rather than
      // ever throwing or returning nothing.
      let output = await engine(samples, baseOptions);
      let ratio = await computeCompressionRatio(output.text);
      let attempts = 1;
      console.log(
        `[whisper-worker] attempt 1/${TEMPERATURE_SCHEDULE.length + 1} (temperature=0/greedy) compression ratio=${ratio.toFixed(2)} (threshold=${COMPRESSION_RATIO_THRESHOLD})`
      );

      for (let i = 0; i < TEMPERATURE_SCHEDULE.length && ratio > COMPRESSION_RATIO_THRESHOLD; i++) {
        const temperature = TEMPERATURE_SCHEDULE[i];
        attempts++;
        console.log(
          `[whisper-worker] compression ratio ${ratio.toFixed(2)} exceeded threshold, retrying at temperature=${temperature} (attempt ${attempts}/${TEMPERATURE_SCHEDULE.length + 1})`
        );
        output = await engine(samples, { ...baseOptions, temperature, do_sample: true });
        ratio = await computeCompressionRatio(output.text);
        console.log(`[whisper-worker] attempt ${attempts} compression ratio=${ratio.toFixed(2)}`);
      }

      if (ratio > COMPRESSION_RATIO_THRESHOLD) {
        console.log(
          `[whisper-worker] all ${attempts} attempts exceeded the compression-ratio threshold; returning the last attempt's output anyway`
        );
      } else if (attempts > 1) {
        console.log(`[whisper-worker] retry succeeded after ${attempts} attempts`);
      }

      console.log(
        `[whisper-worker] transcribed ${(samples.length / 16000).toFixed(1)}s of audio in ${(performance.now() - startedAt).toFixed(0)}ms (${attempts} attempt${attempts > 1 ? 's' : ''})`
      );
      postMessage({ type: 'transcript', payload: output.text.trim() });
    } catch (err) {
      postMessage({ type: 'error', payload: err instanceof Error ? err.message : String(err) });
    }
  }
};
