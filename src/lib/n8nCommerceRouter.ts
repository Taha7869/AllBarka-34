import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import type { Firestore } from 'firebase-admin/firestore';
import { requireN8nIntegration } from './integrationAuthentication';
import { applySheetStatusCommand, validateSheetStatusCommand } from './orderDatabase';
import {
  WhatsAppIntegrationError, getWhatsAppIntegrationConfig, ingestMetaWebhook, getWhatsAppReceiptForMessage,
  claimWhatsAppNotification, authorizeWhatsAppSend, completeWhatsAppSend, type WhatsAppIntegrationConfig,
} from './whatsappCommerce';

export interface N8nCommerceRouterOptions {
  getDb: () => Firestore | null;
  getIntegrationSecret?: () => string | undefined;
  metaConfig?: WhatsAppIntegrationConfig | (() => WhatsAppIntegrationConfig);
  /** Only an in-process fixture seam; production uses the shared canonical Firestore transaction. */
  statusService?: {
    validate: (raw: unknown) => any;
    apply: (input: { db: Firestore; command: any }) => Promise<any>;
  };
}

function exactBody(req: Request, allowed: string[], required: string[]) {
  if (!req.is('application/json')) throw new WhatsAppIntegrationError('JSON_CONTENT_TYPE_REQUIRED', 415);
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some(key => !allowed.includes(key)) || required.some(key => !Object.prototype.hasOwnProperty.call(body, key))) {
    throw new WhatsAppIntegrationError('INVALID_INTEGRATION_PAYLOAD');
  }
  return body;
}

const statusNames = new Set(['NEW', 'ORDER_RECEIVED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']);

function safeError(res: Response, error: any) {
  const typed = error instanceof WhatsAppIntegrationError || error?.name === 'SheetStatusError' || error?.name === 'PersistenceUnavailableError';
  const code = typed && typeof error.code === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(error.code) ? error.code : 'INTEGRATION_FAILED';
  const requestedStatus = error?.statusCode ?? error?.httpStatus;
  const status = typed && [400, 401, 403, 404, 409, 415, 429, 503].includes(requestedStatus) ? requestedStatus
    : code === 'PERSISTENCE_UNAVAILABLE' ? 503 : 500;
  const canonical = status === 409 && statusNames.has(error?.canonical?.status)
    && typeof error?.canonical?.updatedAt === 'string' && !Number.isNaN(Date.parse(error.canonical.updatedAt))
    ? { status: error.canonical.status, updatedAt: error.canonical.updatedAt } : undefined;
  res.status(status).json({ ok: false, code, error: status >= 500 ? 'Integration request could not be completed.' : 'Integration request was rejected.', ...(canonical ? { canonical } : {}) });
}

/** Mount only at /api/integrations/n8n. Integration auth never replaces customer/admin bearer guards. */
export function createN8nCommerceRouter(options: N8nCommerceRouterOptions) {
  const router = express.Router();
  router.use(rateLimit({
    windowMs: 60000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ ok: false, code: 'INTEGRATION_RATE_LIMITED', error: 'Integration request limit reached.' }),
  }));
  router.use(requireN8nIntegration(options.getIntegrationSecret));
  router.use(express.json({ limit: '128kb' }));
  const db = () => {
    const database = options.getDb();
    if (!database) throw new WhatsAppIntegrationError('PERSISTENCE_UNAVAILABLE', 503);
    return database;
  };
  const metaConfig = () => {
    const config = typeof options.metaConfig === 'function' ? options.metaConfig() : options.metaConfig ?? getWhatsAppIntegrationConfig();
    if (!config.enabled) throw new WhatsAppIntegrationError(config.disabledReason || 'WHATSAPP_INTEGRATION_DISABLED', 503);
    return config;
  };
  const route = (path: string, handler: (req: Request) => Promise<any>) => router.post(path, (req, res) => {
    void handler(req).then(result => res.json(result)).catch(error => safeError(res, error));
  });
  const metaBody = (req: Request, fields: string[] = []) => {
    const body = exactBody(req, ['source', ...fields], ['source', ...fields.filter(field => field !== 'providerMessageId')]);
    if (body.source !== 'meta_parent') throw new WhatsAppIntegrationError('INTEGRATION_SOURCE_INVALID', 403);
    return body;
  };

  route('/order-status', async req => {
    const body = exactBody(req, ['source', 'eventId', 'orderId', 'status', 'expectedStatus', 'expectedUpdatedAt', 'reason'], ['source', 'eventId', 'orderId', 'status', 'expectedStatus', 'expectedUpdatedAt', 'reason']);
    if (body.source !== 'google_sheet') throw new WhatsAppIntegrationError('INTEGRATION_SOURCE_INVALID', 403);
    const service = options.statusService ?? { validate: validateSheetStatusCommand, apply: applySheetStatusCommand };
    const command = service.validate(body);
    return service.apply({ db: db(), command });
  });
  route('/whatsapp/inbound', async req => {
    const body = metaBody(req, ['rawMetaBody', 'metaSignature']);
    return ingestMetaWebhook(db(), body, metaConfig());
  });
  route('/whatsapp/receipt', async req => {
    const body = metaBody(req, ['messageId']);
    return getWhatsAppReceiptForMessage(db(), body.messageId, metaConfig());
  });
  route('/whatsapp/notifications/claim', async req => {
    metaBody(req);
    return claimWhatsAppNotification(db(), { config: metaConfig() });
  });
  route('/whatsapp/notifications/authorize', async req => {
    const body = metaBody(req, ['jobId', 'leaseToken']);
    return authorizeWhatsAppSend(db(), { jobId: body.jobId, leaseToken: body.leaseToken }, { config: metaConfig() });
  });
  route('/whatsapp/notifications/result', async req => {
    const body = metaBody(req, ['jobId', 'leaseToken', 'outcome', 'providerMessageId']);
    metaConfig();
    return completeWhatsAppSend(db(), { jobId: body.jobId, leaseToken: body.leaseToken, outcome: body.outcome,
      ...(body.providerMessageId === undefined ? {} : { providerMessageId: body.providerMessageId }) });
  });
  // These integration surfaces are JSON POST-only, and no undocumented phone/order lookup exists.
  router.use((_req, res) => res.status(404).json({ ok: false, code: 'INTEGRATION_ROUTE_NOT_FOUND', error: 'Integration route not found.' }));
  router.use((error: any, _req: Request, res: Response, _next: any) => {
    if (error?.type === 'entity.too.large') res.status(413).json({ ok: false, code: 'INTEGRATION_PAYLOAD_TOO_LARGE', error: 'Integration payload is too large.' });
    else if (error instanceof SyntaxError) res.status(400).json({ ok: false, code: 'INVALID_INTEGRATION_JSON', error: 'Integration JSON is invalid.' });
    else safeError(res, error);
  });
  return router;
}
