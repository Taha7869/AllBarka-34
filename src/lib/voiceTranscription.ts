/** Bounded server-only transcription. Never import this module into the browser. */
import { VOICE_MAX_BYTES, VOICE_MAX_SECONDS, VOICE_MAX_TRANSCRIPT_CHARS } from './voiceLimits';
export { VOICE_MAX_BYTES, VOICE_MAX_SECONDS } from './voiceLimits';
const MODELS = new Set(['whisper-large-v3', 'whisper-large-v3-turbo']);
export class VoiceError extends Error {
  constructor(public code: string, public status = 503) { super(code); }
}

/** Scan bounded RIFF chunks; metadata does not count as PCM duration or speech. */
export function validateVoiceWav(audio: Buffer): number {
  if (!Buffer.isBuffer(audio)) throw new VoiceError('VOICE_INVALID_AUDIO', 400);
  if (audio.length > VOICE_MAX_BYTES) throw new VoiceError('VOICE_AUDIO_TOO_LARGE', 413);
  if (audio.length < 46 || audio.toString('ascii', 0, 4) !== 'RIFF' || audio.toString('ascii', 8, 12) !== 'WAVE' ||
      audio.readUInt32LE(4) !== audio.length - 8) {
    throw new VoiceError('VOICE_INVALID_AUDIO', 400);
  }
  let hasFormat = false, dataOffset = 0, dataBytes = 0;
  for (let offset = 12; offset < audio.length;) {
    if (audio.length - offset < 8) throw new VoiceError('VOICE_INVALID_AUDIO', 400);
    const id = audio.toString('ascii', offset, offset + 4), size = audio.readUInt32LE(offset + 4);
    const start = offset + 8, end = start + size, paddedEnd = end + size % 2;
    if (paddedEnd > audio.length) throw new VoiceError('VOICE_INVALID_AUDIO', 400);
    if (id === 'fmt ') {
      if (hasFormat || (size !== 16 && size !== 18) ||
          audio.readUInt16LE(start) !== 1 || audio.readUInt16LE(start + 2) !== 1 ||
          audio.readUInt32LE(start + 4) !== 16000 || audio.readUInt32LE(start + 8) !== 32000 ||
          audio.readUInt16LE(start + 12) !== 2 || audio.readUInt16LE(start + 14) !== 16 ||
          (size === 18 && audio.readUInt16LE(start + 16) !== 0)) throw new VoiceError('VOICE_INVALID_AUDIO', 400);
      hasFormat = true;
    } else if (id === 'data') {
      if (!hasFormat || dataOffset || !size || size % 2) throw new VoiceError('VOICE_INVALID_AUDIO', 400);
      dataOffset = start; dataBytes = size;
    }
    offset = paddedEnd;
  }
  if (!hasFormat || !dataOffset) throw new VoiceError('VOICE_INVALID_AUDIO', 400);
  const seconds = dataBytes / 32000;
  if (seconds > VOICE_MAX_SECONDS) throw new VoiceError('VOICE_AUDIO_TOO_LONG', 413);
  let peak = 0;
  for (let i = dataOffset; i < dataOffset + dataBytes; i += 2) peak = Math.max(peak, Math.abs(audio.readInt16LE(i)));
  if (seconds < 0.2 || peak < 16) throw new VoiceError('VOICE_NO_SPEECH', 422);
  return seconds;
}

export function getVoiceConfig(env: NodeJS.ProcessEnv = process.env) {
  // This acknowledgement is an operational gate, not an API-based proof of the account's billing plan.
  const model = env.GROQ_VOICE_MODEL || 'whisper-large-v3';
  if (env.VOICE_GROQ_FREE_TIER_CONFIRMED !== 'true' || !env.GROQ_API_KEY?.trim() || !MODELS.has(model)) return null;
  return { key: env.GROQ_API_KEY.trim(), model };
}

export async function transcribeVoice(audio: Buffer, config: { key: string; model: string }, signal: AbortSignal,
  fetcher: typeof fetch = fetch): Promise<string> {
  validateVoiceWav(audio);
  if (signal.aborted) throw new VoiceError('VOICE_CANCELLED');
  const form = new FormData();
  form.append('file', new Blob([Uint8Array.from(audio)], { type: 'audio/wav' }), 'speech.wav');
  form.append('model', config.model);
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');
  form.append('prompt', 'AllBarka, Pista, Kaju, Badam, Khajoor, Khubani, Kishmish, Chilgoza, Akhroot, Pumpkin Seeds, Tasting Flight, Daily Grind, 100g, 250g, 500g, 1kg, Rs, rupees, Lahore.');
  const response = await fetcher('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${config.key}` }, body: form, signal,
  });
  if (!response.ok) {
    void response.body?.cancel().catch(() => {});
    throw new VoiceError(response.status === 429 ? 'VOICE_QUOTA_EXCEEDED' : 'VOICE_PROVIDER_UNAVAILABLE', response.status === 429 ? 429 : 503);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new VoiceError('VOICE_PROVIDER_UNAVAILABLE');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 65536 || signal.aborted) { void reader.cancel().catch(() => {}); throw new VoiceError('VOICE_PROVIDER_UNAVAILABLE'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let body: any;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new VoiceError('VOICE_PROVIDER_UNAVAILABLE'); }
  if (signal.aborted) throw new VoiceError('VOICE_CANCELLED');
  const text = typeof body?.text === 'string' ? body.text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim() : '';
  if (!text || text.length > VOICE_MAX_TRANSCRIPT_CHARS || !Number.isFinite(body.duration) || body.duration <= 0 || body.duration > VOICE_MAX_SECONDS + 0.1 ||
      (Array.isArray(body.segments) && body.segments.length > 0 && body.segments.every((s: any) => s.no_speech_prob > 0.85 && s.avg_logprob < -0.75))) {
    throw new VoiceError('VOICE_NO_SPEECH', 422);
  }
  return text;
}
