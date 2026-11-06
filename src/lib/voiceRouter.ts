import { Router, raw, type RequestHandler } from 'express';
import { getVoiceConfig, transcribeVoice, validateVoiceWav, VoiceError, VOICE_MAX_BYTES } from './voiceTranscription';

export function createVoiceRouter(options: {
  authenticateOptionalUser: RequestHandler;
  limiter: RequestHandler;
  getConfig?: typeof getVoiceConfig;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}) {
  const router = Router();
  const pending = new Set<string>();
  router.post('/api/concierge/transcribe', options.authenticateOptionalUser, options.limiter, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const config = (options.getConfig || getVoiceConfig)();
    if (!config) return res.status(503).json({ code: 'VOICE_PROVIDER_UNAVAILABLE' });
    if (!req.is('audio/wav')) return res.status(415).json({ code: 'VOICE_INVALID_AUDIO' });
    const identity = req.ip || req.socket.remoteAddress || 'unknown';
    if (pending.size >= 6 || pending.has(identity)) return res.status(429).json({ code: 'VOICE_QUOTA_EXCEEDED' });
    pending.add(identity);
    const controller = new AbortController();
    let cleaned = false;
    const cancel = () => controller.abort();
    const timer = setTimeout(() => {
      controller.abort();
      if (!res.headersSent && !res.destroyed) res.status(503).json({ code: 'VOICE_TIMEOUT' });
    }, options.timeoutMs ?? 20000);
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(timer); pending.delete(identity); req.off('aborted', cancel);
      if (!res.writableEnded) controller.abort();
    };
    req.once('aborted', cancel); res.once('close', cleanup); res.once('finish', cleanup);
    raw({ type: 'audio/wav', limit: VOICE_MAX_BYTES })(req, res, async error => {
      if (res.headersSent || controller.signal.aborted) return;
      if (error) return res.status((error as any).type === 'entity.too.large' ? 413 : 400).json({ code: (error as any).type === 'entity.too.large' ? 'VOICE_AUDIO_TOO_LARGE' : 'VOICE_INVALID_AUDIO' });
      try {
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new VoiceError('VOICE_INVALID_AUDIO', 400);
        validateVoiceWav(req.body);
        const text = await transcribeVoice(req.body, config, controller.signal, options.fetcher);
        if (!res.headersSent && !controller.signal.aborted) res.json({ text });
      } catch (error) {
        if (res.headersSent || controller.signal.aborted) return;
        const safe = error instanceof VoiceError ? error : new VoiceError('VOICE_PROVIDER_UNAVAILABLE');
        res.status(safe.status).json({ code: safe.code });
      }
    });
  });
  return router;
}
