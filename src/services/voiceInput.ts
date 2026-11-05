import { apiUrl } from '../lib/apiUrl';
import { VOICE_MAX_CAPTURE_BYTES, VOICE_MAX_SAMPLES, VOICE_MAX_SECONDS, VOICE_MAX_TRANSCRIPT_CHARS, VOICE_SAMPLE_RATE } from '../lib/voiceLimits';

/** Canonical mono 16kHz PCM16 WAV; bounded before upload, no new codec dependency. */
export function encodeVoiceWav(samples: Float32Array): Blob {
  if (!samples.length || samples.length > VOICE_MAX_SAMPLES) throw new Error('VOICE_AUDIO_TOO_LONG');
  const buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer);
  const word = (offset: number, text: string) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  word(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); word(8, 'WAVE'); word(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  word(36, 'data'); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) { const sample = Math.max(-1, Math.min(1, samples[i])); view.setInt16(44 + i * 2, sample < 0 ? sample * 32768 : sample * 32767, true); }
  return new Blob([buffer], { type: 'audio/wav' });
}

export async function prepareVoiceAudio(recording: Blob, signal: AbortSignal): Promise<{ audio: Blob; truncated: boolean }> {
  if (recording.size > VOICE_MAX_CAPTURE_BYTES) throw new Error('VOICE_AUDIO_TOO_LARGE');
  if (signal.aborted) throw new Error('VOICE_CANCELLED');
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await recording.arrayBuffer());
    if (signal.aborted) throw new Error('VOICE_CANCELLED');
    if (!Number.isFinite(decoded.duration) || decoded.duration <= 0) throw new Error('VOICE_INVALID_AUDIO');
    // Bound output allocation before rendering, including delayed stop/codec overrun.
    const truncated = decoded.duration > VOICE_MAX_SECONDS;
    const sampleCount = Math.min(VOICE_MAX_SAMPLES, Math.ceil(decoded.duration * VOICE_SAMPLE_RATE));
    const offline = new OfflineAudioContext(1, sampleCount, VOICE_SAMPLE_RATE);
    const source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination); source.start();
    const rendered = await offline.startRendering();
    if (signal.aborted) throw new Error('VOICE_CANCELLED');
    return { audio: encodeVoiceWav(rendered.getChannelData(0).subarray(0, sampleCount)), truncated };
  } finally { await context.close().catch(() => {}); }
}

export async function transcribeVoiceInput(audio: Blob, signal: AbortSignal, token?: string): Promise<string> {
  const response = await fetch(apiUrl('/api/concierge/transcribe'), {
    method: 'POST', headers: { 'Content-Type': 'audio/wav', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: audio, signal,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.code === 'string' ? result.code : 'VOICE_PROVIDER_UNAVAILABLE');
  if (typeof result.text !== 'string' || !result.text.trim() || result.text.length > VOICE_MAX_TRANSCRIPT_CHARS) throw new Error('VOICE_PROVIDER_UNAVAILABLE');
  return result.text.trim();
}
