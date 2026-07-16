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
  }
) => Promise<{ text: string }>;

// whisper-tiny's Portuguese accuracy proved too poor in real testing (whole
// phrases garbled, not just an occasional missed word) -- whisper-base is
// meaningfully more accurate.
const MODEL = 'onnx-community/whisper-base';
const LANGUAGE = 'portuguese';

// 'q8'/int8 on the webgpu device is a known-broken combination in the
// installed transformers.js v3 (huggingface/transformers.js#1317) -- produces
// gibberish regardless of audio quality. Confirmed via the issue thread that
// this isn't decoder-specific ("any q8 model... other quants work without
// issue") -- it's any int8-quantized weight on webgpu, encoder included.
//
// Tried fp16 for both parts to cut the download (~141MB vs ~206MB, and in
// theory more numerically precise than q4) -- real end-to-end testing showed
// it's actually *worse*: consistently garbled short output ("AUS" instead of
// "arroz e chia") across repeated real-audio runs, despite being faster and
// smaller. Reverted to fp32 encoder + q4 decoder, which real testing (same
// harness, same audio) confirmed correct output twice in a row. Not chasing
// a smaller download further without understanding *why* fp16 broke this
// model's output -- theoretical bit-width reasoning already proved wrong once.
const DTYPE_WEBGPU = { encoder_model: 'fp32', decoder_model_merged: 'q4' } as const;
const DTYPE_WASM = 'q8';

let transcriber: Transcriber | null = null;

async function loadTranscriber(onProgress: (p: ProgressPayload) => void): Promise<Transcriber> {
  if (transcriber) return transcriber;
  const startedAt = performance.now();
  try {
    transcriber = (await pipeline('automatic-speech-recognition', MODEL, {
      device: 'webgpu',
      dtype: DTYPE_WEBGPU,
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
    dtype: DTYPE_WASM,
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
      const startedAt = performance.now();
      const output = await engine(samples, {
        language: LANGUAGE,
        task: 'transcribe',
        no_repeat_ngram_size: 3,
        chunk_length_s: 30,
        stride_length_s: 5
      });
      console.log(
        `[whisper-worker] transcribed ${(samples.length / 16000).toFixed(1)}s of audio in ${(performance.now() - startedAt).toFixed(0)}ms`
      );
      postMessage({ type: 'transcript', payload: output.text.trim() });
    } catch (err) {
      postMessage({ type: 'error', payload: err instanceof Error ? err.message : String(err) });
    }
  }
};
