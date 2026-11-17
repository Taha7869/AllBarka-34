import crypto from 'node:crypto';
import express, { type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';

export interface WhatsAppWebhookOptions {
  getAppSecret?: () => string | undefined;
  getVerifyToken?: () => string | undefined;
  limiter?: RequestHandler;
  onWebhookReceived?: (body: any, rawBody: string) => Promise<any> | any;
}

/**
 * Validates the X-Hub-Signature-256 header sent by Meta WhatsApp Cloud API using timing-safe comparison.
 * Meta sends: `X-Hub-Signature-256: sha256=<64-char-hex-hmac>`
 */
export function verifyWhatsAppWebhookSignature(
  rawBody: string | Buffer | undefined | null,
  signatureHeader: string | string[] | undefined | null,
  appSecret: string | undefined | null
): boolean {
  if (!appSecret || typeof appSecret !== 'string' || appSecret.trim().length === 0) {
    return false;
  }
  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return false;
  }
  const header = signatureHeader.trim();
  if (!header.startsWith('sha256=')) {
    return false;
  }

  const providedHex = header.slice(7).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(providedHex)) {
    return false;
  }

  if (rawBody === undefined || rawBody === null) {
    return false;
  }

  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
  const expectedHex = crypto.createHmac('sha256', appSecret.trim()).update(bodyBuffer).digest('hex');

  const providedBuffer = Buffer.from(providedHex, 'hex');
  const expectedBuffer = Buffer.from(expectedHex, 'hex');

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * Express middleware that strictly enforces X-Hub-Signature-256 verification.
 * Returns 401 Unauthorized if missing, malformed, or mismatch.
 */
export function requireWhatsAppWebhookSignature(options: {
  getAppSecret?: () => string | undefined;
  rawBodyExtractor?: (req: Request) => string | Buffer | undefined;
}): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const appSecret = options.getAppSecret ? options.getAppSecret() : (process.env.WHATSAPP_APP_SECRET || process.env.WHATSAPP_META_APP_SECRET);
    if (!appSecret) {
      res.status(401).json({ ok: false, code: 'WEBHOOK_SECRET_UNCONFIGURED', error: 'WhatsApp webhook secret is not configured.' });
      return;
    }

    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    if (!signature) {
      res.status(401).json({ ok: false, code: 'INVALID_SIGNATURE', error: 'Missing X-Hub-Signature-256 header.' });
      return;
    }

    // Extract raw payload
    const rawBody = options.rawBodyExtractor
      ? options.rawBodyExtractor(req)
      : (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

    const isValid = verifyWhatsAppWebhookSignature(rawBody, signature, appSecret);
    if (!isValid) {
      res.status(401).json({ ok: false, code: 'INVALID_SIGNATURE', error: 'Invalid webhook signature.' });
      return;
    }

    next();
  };
}

/**
 * Express router for Meta WhatsApp Cloud API webhooks.
 * - GET /api/webhooks/whatsapp: Webhook Verification handshake (hub.mode, hub.verify_token, hub.challenge)
 * - POST /api/webhooks/whatsapp: Inbound events signed with X-Hub-Signature-256
 */
export function createWhatsAppWebhookRouter(options: WhatsAppWebhookOptions = {}) {
  const router = express.Router();

  const limiter = options.limiter || rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ ok: false, code: 'RATE_LIMITED', error: 'Too many webhook requests.' })
  });

  // 1. GET: Webhook verification handshake from Meta
  router.get('/api/webhooks/whatsapp', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = options.getVerifyToken
      ? options.getVerifyToken()
      : (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN);

    if (mode === 'subscribe' && verifyToken && token === verifyToken) {
      // Plain text only: the challenge is echoed back and must never be rendered as HTML.
      return res.status(200).type('text/plain').send(String(challenge ?? '').slice(0, 200));
    }
    return res.status(403).json({ ok: false, code: 'FORBIDDEN', error: 'Webhook verification token mismatch.' });
  });

  // 2. POST: Inbound notifications from Meta with X-Hub-Signature-256 HMAC
  router.post(
    '/api/webhooks/whatsapp',
    limiter,
    requireWhatsAppWebhookSignature({
      getAppSecret: options.getAppSecret,
    }),
    async (req: Request, res: Response) => {
      try {
        const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));
        if (options.onWebhookReceived) {
          await options.onWebhookReceived(req.body, rawBody);
        }
        res.status(200).json({ ok: true, status: 'RECEIVED' });
      } catch (err: any) {
        res.status(500).json({ ok: false, code: 'WEBHOOK_PROCESSING_ERROR', error: 'Failed to process webhook event.' });
      }
    }
  );

  return router;
}
