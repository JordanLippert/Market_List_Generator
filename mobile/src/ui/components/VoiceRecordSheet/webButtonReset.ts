const STYLE_ID = 'hearsay-voice-btn-reset';

export function ensureVoiceButtonReset(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = '.hearsay-voice-btn { all: unset; cursor: pointer; display: block; width: 100%; }';
  document.head.appendChild(style);
}
