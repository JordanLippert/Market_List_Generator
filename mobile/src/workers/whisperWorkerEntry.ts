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
      // transformers.js's ASR pipeline defaults to chunk_length_s: 0 (no chunking), which
      // its own console warning flags as wrong for any audio over Whisper's 30s window
      // ("Attempting to extract features for audio longer than 30 seconds..."). Fixed here
      // by chunking into 30s windows with 5s of overlap so long recordings get transcribed
      // window-by-window instead of in one pass the pipeline itself says is unsupported.
      // Confirmed via Playwright + real audio that this silences the warning; a separate
      // real-device recording still produced garbled output even after this fix (verified
      // the decoded PCM feeding the model was correct real speech, not a decode bug), so
      // this addresses a real defect but is not a complete fix for hallucination quality.
      // no_repeat_ngram_size stays as a cheap backstop against repetition within a window.
      const output = await engine(samples, {
        language: LANGUAGE,
        task: 'transcribe',
        no_repeat_ngram_size: 3,
        chunk_length_s: 30,
        stride_length_s: 5
      });
      postMessage({ type: 'transcript', payload: output.text.trim() });
    } catch (err) {
      postMessage({ type: 'error', payload: err instanceof Error ? err.message : String(err) });
    }
  }
};
