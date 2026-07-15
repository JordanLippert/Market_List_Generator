import { pipeline, env } from '@huggingface/transformers';

// Multi-threaded wasm needs cross-origin isolation (COOP/COEP headers) for
// SharedArrayBuffer, which this app's hosting doesn't set up. Without this,
// the wasm backend fails to initialize at all in environments that enforce
// that requirement strictly (confirmed via headless-browser testing) --
// force single-threaded, non-proxied wasm so the fallback actually works
// everywhere, not just wherever WebGPU happens to be available.
env.backends.onnx.wasm!.numThreads = 1;
env.backends.onnx.wasm!.proxy = false;

interface ProgressPayload {
  status: string;
  progress?: number;
}

type Transcriber = (
  audio: Float32Array,
  options?: { language?: string; task?: string; no_repeat_ngram_size?: number }
) => Promise<{ text: string }>;

// whisper-tiny's Portuguese accuracy proved too poor in real testing (whole
// phrases garbled, not just an occasional missed word) -- whisper-base is
// meaningfully more accurate. dtype: 'q8' is forced explicitly on both
// backends so the download stays the smaller quantized checkpoint regardless
// of device -- wasm already defaulted to q8 on its own, but webgpu defaulted
// to the much larger unquantized fp32 checkpoint unless told otherwise.
const MODEL = 'onnx-community/whisper-base';
const DTYPE = 'q8';
const LANGUAGE = 'portuguese';

let transcriber: Transcriber | null = null;

async function loadTranscriber(onProgress: (p: ProgressPayload) => void): Promise<Transcriber> {
  if (transcriber) return transcriber;
  try {
    transcriber = (await pipeline('automatic-speech-recognition', MODEL, {
      device: 'webgpu',
      dtype: DTYPE,
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
    dtype: DTYPE,
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
      // Silence-padded audio (Whisper always processes a fixed 30s window internally,
      // regardless of actual recording length) can make the model hallucinate the same
      // nonsense n-gram on loop indefinitely once it runs out of real speech to anchor
      // on. no_repeat_ngram_size doesn't fix the hallucination itself, but it forces the
      // model to stop repeating identical text once it's already said it once.
      const output = await engine(samples, { language: LANGUAGE, task: 'transcribe', no_repeat_ngram_size: 3 });
      postMessage({ type: 'transcript', payload: output.text.trim() });
    } catch (err) {
      postMessage({ type: 'error', payload: err instanceof Error ? err.message : String(err) });
    }
  }
};
