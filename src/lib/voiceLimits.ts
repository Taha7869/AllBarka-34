/** Public audio/input bounds only. Provider credentials and configuration stay server-side. */
export const VOICE_MAX_CAPTURE_SECONDS = 45;
export const VOICE_MAX_SECONDS = 60;
export const VOICE_SAMPLE_RATE = 16000;
export const VOICE_MAX_SAMPLES = VOICE_MAX_SECONDS * VOICE_SAMPLE_RATE;
export const VOICE_MAX_BYTES = 2 * 1024 * 1024;
export const VOICE_MAX_CAPTURE_BYTES = 4 * 1024 * 1024;
export const VOICE_MAX_TRANSCRIPT_CHARS = 4000;
export const VOICE_INPUT_MAX_CHARS = 1000;
