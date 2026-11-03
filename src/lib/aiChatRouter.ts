import { Router, type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { Product } from '../types';
import { PRODUCTS } from '../data/products';
import { loadAuthoritativeCatalog, mergeAuthoritativeCatalog } from './catalogStore';
import { askN8nConsultant, getN8nAiConfig } from '../services/n8nAIConsultant';
import { reserveGuestAiMessage, GuestTrialLimitError } from './aiGuestTrial';
import {
  buildBuddySystemInstruction,
  validateAiRecommendations,
  validateInquiryPrefill,
  validateAndSanitizeAssistantReply,
  renderDeterministicCommercialAnswer,
  sanitizeBuddyPrompt,
  getCustomerVisibleCatalog,
} from './aiBuddyResolution';

export interface AiChatDiagnostic {
  requestId: string;
  status: number;
  outcome: 'completed' | 'timeout' | 'cancelled';
  totalMs: number;
  catalogMs: number | null;
  providerMs: number | null;
}

export interface AiChatRouterOptions {
  getDb: () => Firestore | null;
  getCatalog?: () => Product[] | Promise<Product[]>;
  askConsultant?: (params: { message: string; history?: unknown; system: string; signal?: AbortSignal }) => Promise<any>;
  reserveGuestTrial?: (ip: string, userAgent: string) => Promise<number | null>;
  authenticateOptionalUser?: RequestHandler;
  patronChatLimiter?: RequestHandler;
  timeoutMs?: number;
  recordDiagnostic?: (event: AiChatDiagnostic) => void;
}

export function createAiChatRouter(options: AiChatRouterOptions) {
  const router = Router();
  const authMiddleware = options.authenticateOptionalUser || ((_req, _res, next) => next());
  const limiterMiddleware = options.patronChatLimiter || ((_req, _res, next) => next());
  const timeoutMs = options.timeoutMs ?? 22000;

  router.post(['/api/chat', '/api/concierge/chat'], authMiddleware, limiterMiddleware, async (req, res) => {
    const requestStartTime = Date.now();
    const requestId = randomUUID();
    const controller = new AbortController();
    let outcome: AiChatDiagnostic['outcome'] = 'completed';
    let catalogMs: number | null = null;
    let providerMs: number | null = null;
    let recorded = false;
    const record = () => {
      if (recorded) return;
      recorded = true;
      const event: AiChatDiagnostic = {
        requestId, status: res.statusCode, outcome,
        totalMs: Date.now() - requestStartTime, catalogMs, providerMs,
      };
      // Fixed metadata allowlist: never log prompts, history, identities, provider payloads or secrets.
      try {
        if (options.recordDiagnostic) options.recordDiagnostic(event);
        else console.info('AI_CHAT_DIAGNOSTIC', JSON.stringify(event));
      } catch { /* Diagnostics must not affect the customer response. */ }
    };
    const cancel = () => { outcome = 'cancelled'; controller.abort(); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-AllBarka-Request-Id', requestId);
    req.once('aborted', cancel);
    res.once('finish', record);
    res.once('close', () => {
      req.removeListener('aborted', cancel);
      if (!res.writableEnded) cancel();
      record();
    });
    const userText = req.body?.userText ?? req.body?.message;
    const rawLang = req.body?.language;
    const language: 'en' | 'ur' | 'ar' = ['ur', 'ar'].includes(rawLang) ? rawLang : 'en';
    const messages = req.body?.messages ?? req.body?.history;

    if (typeof userText !== 'string' || !userText.trim() || userText.length > 1000) {
      return res.status(400).json({ error: 'INVALID_MESSAGE', code: 'INVALID_MESSAGE', available: false });
    }

    const consultant = options.askConsultant ?? askN8nConsultant;
    if (!options.askConsultant && !getN8nAiConfig()) {
      return res.status(503).json({ error: 'AI_UNAVAILABLE', code: 'AI_UNAVAILABLE', available: false });
    }

    const deadline = setTimeout(() => {
      outcome = 'timeout';
      controller.abort();
      if (!res.headersSent) {
        res.status(503).json({ error: 'AI_UNAVAILABLE', code: 'AI_TIMEOUT', available: false });
      }
    }, timeoutMs);

    try {
      const isGooglePatron = (req as any).user?.firebase?.sign_in_provider === 'google.com';
      let guestMessagesRemaining: number | null = null;

      if (!isGooglePatron) {
        try {
          if (options.reserveGuestTrial) {
            guestMessagesRemaining = await options.reserveGuestTrial(
              req.ip || req.socket?.remoteAddress || '',
              String(req.headers['user-agent'] || '')
            );
          } else {
            const db = options.getDb();
            guestMessagesRemaining = await reserveGuestAiMessage(
              db,
              req.ip || req.socket?.remoteAddress || '',
              String(req.headers['user-agent'] || ''),
              process.env.AI_GUEST_HASH_SECRET || ''
            );
          }
        } catch (error) {
          if (res.headersSent) return;
          if (error instanceof GuestTrialLimitError) {
            return res.status(429).json({
              error: 'AI_GUEST_TRIAL_EXHAUSTED',
              code: 'AI_GUEST_TRIAL_EXHAUSTED',
              available: false,
              guestMessagesRemaining: 0,
            });
          }
          return res.status(503).json({
            error: 'AI_UNAVAILABLE',
            code: 'AI_GUEST_TRIAL_UNAVAILABLE',
            available: false,
          });
        }
      }

      if (res.headersSent) return;

      // Authoritative catalog resolution
      let mergedProducts: Product[] = [];
      let isCatalogFailure = false;

      try {
        const catalogStarted = Date.now();
        if (options.getCatalog) {
          mergedProducts = await options.getCatalog();
        } else {
          const db = options.getDb();
          if (!db) {
            throw new Error('DATABASE_OFFLINE');
          }
          const snapshot = await loadAuthoritativeCatalog(db, { fresh: true });
          mergedProducts = mergeAuthoritativeCatalog(PRODUCTS, snapshot.products);
        }
        catalogMs = Date.now() - catalogStarted;
      } catch (catErr) {
        isCatalogFailure = true;
        mergedProducts = [];
      }

      // A slow catalog must not start a billable provider call after the HTTP deadline or disconnect.
      if (res.headersSent || controller.signal.aborted) return;

      // Public catalog restriction: filter out drafts, archived, and unpublished items
      const publicCatalog = getCustomerVisibleCatalog(mergedProducts);

      const systemInstruction = buildBuddySystemInstruction({
        catalog: publicCatalog,
        language,
        isCatalogFailure,
      });

      const sanitizedMessage = sanitizeBuddyPrompt(userText);
      const providerStarted = Date.now();
      const answer = await consultant({
        message: sanitizedMessage,
        history: messages,
        system: systemInstruction,
        signal: controller.signal,
      });
      providerMs = Date.now() - providerStarted;

      if (res.headersSent || controller.signal.aborted) return;
      if (!answer) {
        return res.status(503).json({ error: 'AI_UNAVAILABLE', code: 'AI_UNAVAILABLE', available: false });
      }

      // Deterministic validation of recommendations & prefill using public catalog
      const candidateProductIds = [
        ...(Array.isArray(answer.selectedProducts) ? answer.selectedProducts.map((p: any) => p?.productId) : []),
        ...(Array.isArray(answer.recommendedProductIds) ? answer.recommendedProductIds : []),
        ...(answer.inquiryPrefill?.productId ? [answer.inquiryPrefill.productId] : []),
      ].filter(Boolean);
      const recommendations = validateAiRecommendations(publicCatalog, candidateProductIds);
      const inquiryPrefill = validateInquiryPrefill(publicCatalog, answer.inquiryPrefill);

      // Render deterministic commercial answer from structured references & public catalog
      const deterministicReply = renderDeterministicCommercialAnswer({
        answer,
        catalog: publicCatalog,
        recommendations,
        inquiryPrefill,
        isCatalogFailure,
        userText,
        language,
      });

      const totalElapsedMs = Date.now() - requestStartTime;

      return res.json({
        ...answer,
        reply: deterministicReply,
        text: deterministicReply,
        recommendations,
        inquiryPrefill,
        guestMessagesRemaining,
        timing: {
          bridgeMs: (answer as any).latencyMs ?? null,
          totalMs: totalElapsedMs,
          catalogMs,
          providerMs,
        },
      });
    } catch (error) {
      if (res.headersSent || controller.signal.aborted) return;
      const code =
        error instanceof Error && error.message === 'AI_RATE_LIMITED'
          ? 'AI_RATE_LIMITED'
          : error instanceof Error && error.message === 'AI_TIMEOUT'
          ? 'AI_TIMEOUT'
          : 'AI_UNAVAILABLE';
      return res
        .status(code === 'AI_RATE_LIMITED' ? 429 : 503)
        .json({ error: code === 'AI_RATE_LIMITED' ? code : 'AI_UNAVAILABLE', code, available: false });
    } finally {
      clearTimeout(deadline);
      req.removeListener('aborted', cancel);
    }
  });

  return router;
}
