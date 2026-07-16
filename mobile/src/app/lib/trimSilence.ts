const FRAME_MS = 20;
const SILENCE_RMS_THRESHOLD = 0.01;
const PADDING_MS = 150;

// Whisper hallucinates more readily on leading/trailing silence (nothing to anchor
// generation on once real speech runs out) -- trimming it before transcription
// shrinks that surface. Doesn't help latency: the encoder always processes a fixed
// 30s window regardless of how much real audio is in it.
export function trimSilence(samples: Float32Array, sampleRate: number): Float32Array {
  const frameSize = Math.round((sampleRate * FRAME_MS) / 1000);
  const frameCount = Math.floor(samples.length / frameSize);
  if (frameCount === 0) return samples;

  const frameRms = (frameIndex: number): number => {
    const start = frameIndex * frameSize;
    let sumSq = 0;
    for (let i = start; i < start + frameSize; i++) sumSq += samples[i] * samples[i];
    return Math.sqrt(sumSq / frameSize);
  };

  let firstVoiced = -1;
  let lastVoiced = -1;
  for (let f = 0; f < frameCount; f++) {
    if (frameRms(f) >= SILENCE_RMS_THRESHOLD) {
      if (firstVoiced === -1) firstVoiced = f;
      lastVoiced = f;
    }
  }
  if (firstVoiced === -1) return samples; // all silence -- let the model handle it as-is

  const padding = Math.round((sampleRate * PADDING_MS) / 1000);
  const start = Math.max(0, firstVoiced * frameSize - padding);
  const end = Math.min(samples.length, (lastVoiced + 1) * frameSize + padding);
  return samples.slice(start, end);
}
