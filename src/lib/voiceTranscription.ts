/** Bounded server-only transcription. Never import this module into the browser. */
export const VOICE_MAX_BYTES = 2 * 1024 * 1024;
export const VOICE_MAX_SECONDS = 15;
const MODELS = new Set(['whisper-large-v3', 'whisper-large-v3-turbo']);
export class VoiceError extends Error {
  constructor(public code: string, public status = 503) { super(code); }
}

/** Accept one canonical PCM WAV, so duration is verified from bytes before provider work. */
export function validateVoiceWav(audio: Buffer): number {
  if (!Buffer.isBuffer(audio)) throw new VoiceError('VOICE_INVALID_AUDIO', 400);
  if (audio.length > VOICE_MAX_BYTES) throw new VoiceError('VOICE_AUDIO_TOO_LARGE', 413);
  if (audio.length < 46 || audio.toString('ascii', 0, 4) !== 'RIFF' || audio.toString('ascii', 8, 12) !== 'WAVE' ||
      audio.readUInt32LE(4) !== audio.length - 8 || audio.toString('ascii', 12, 16) !== 'fmt ' || audio.readUInt32LE(16) !== 16 ||
      audio.readUInt16LE(20) !== 1 || audio.readUInt16LE(22) !== 1 || audio.readUInt32LE(24) !== 16000 ||
      audio.readUInt32LE(28) !== 32000 || audio.readUInt16LE(32) !== 2 || audio.readUInt16LE(34) !== 16 ||
      audio.toString('ascii', 36, 40) !== 'data' || audio.readUInt32LE(40) !== audio.length - 44 || (audio.length - 44) % 2) {
    throw new VoiceError('VOICE_INVALID_AUDIO', 400);
  }
  const seconds = (audio.length - 44) / 32000;
  if (seconds > VOICE_MAX_SECONDS) throw new VoiceError('VOICE_AUDIO_TOO_LONG', 413);
  let peak = 0;
  for (let i = 44; i < audio.length; i += 2) peak = Math.max(peak, Math.abs(audio.readInt16LE(i)));
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
  form.append('prompt', 'AllBarka, Pista, Kaju, Badam, Khajoor, Khubani, Kishmish, Chilgoza, Akhroot, Pumpkin Seeds, Tasting Flight, Daily Grind, 100g, 250g, 500g, 1kg, rupees, Lahore.');
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
  if (!text || text.length > 1000 || !Number.isFinite(body.duration) || body.duration <= 0 || body.duration > VOICE_MAX_SECONDS + 0.1 ||
      (Array.isArray(body.segments) && body.segments.length > 0 && body.segments.every((s: any) => s.no_speech_prob > 0.85 && s.avg_logprob < -0.75))) {
    throw new VoiceError('VOICE_NO_SPEECH', 422);
  }
  return text;
}
