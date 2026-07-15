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
