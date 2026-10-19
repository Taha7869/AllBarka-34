import { Router, type RequestHandler } from 'express';
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
  sanitizeBuddyPrompt,
  getCustomerVisibleCatalog,
} from './aiBuddyResolution';

export interface AiChatRouterOptions {
  getDb: () => Firestore | null;
  getCatalog?: () => Product[] | Promise<Product[]>;
  askConsultant?: (params: { message: string; history?: unknown; system: string }) => Promise<any>;
  reserveGuestTrial?: (ip: string, userAgent: string) => Promise<number | null>;
  authenticateOptionalUser?: RequestHandler;
  patronChatLimiter?: RequestHandler;
  timeoutMs?: number;
}

export function createAiChatRouter(options: AiChatRouterOptions) {
  const router = Router();
  const authMiddleware = options.authenticateOptionalUser || ((_req, _res, next) => next());
  const limiterMiddleware = options.patronChatLimiter || ((_req, _res, next) => next());
  const timeoutMs = options.timeoutMs ?? 22000;

  router.post(['/api/chat', '/api/concierge/chat'], authMiddleware, limiterMiddleware, async (req, res) => {
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
      } catch (catErr) {
        console.warn('AI Buddy catalog resolution failure:', catErr);
        isCatalogFailure = true;
        mergedProducts = [];
      }

      // Public catalog restriction: filter out drafts, archived, and unpublished items
      const publicCatalog = getCustomerVisibleCatalog(mergedProducts);

      const systemInstruction = buildBuddySystemInstruction({
        catalog: publicCatalog,
        language,
        isCatalogFailure,
      });

      const sanitizedMessage = sanitizeBuddyPrompt(userText);
      const answer = await consultant({
        message: sanitizedMessage,
        history: messages,
        system: systemInstruction,
      });

      if (res.headersSent) return;
      if (!answer) {
        return res.status(503).json({ error: 'AI_UNAVAILABLE', code: 'AI_UNAVAILABLE', available: false });
      }

      // Deterministic validation of recommendations & prefill using public catalog
      const recommendations = validateAiRecommendations(publicCatalog, answer.recommendedProductIds);
      const inquiryPrefill = validateInquiryPrefill(publicCatalog, answer.inquiryPrefill);

      // Application-enforced commercial validation of prose reply
      const rawReply = answer.reply || answer.text || '';
      const sanitizedReply = validateAndSanitizeAssistantReply({
        replyText: rawReply,
        catalog: publicCatalog,
        recommendations,
        inquiryPrefill,
        isCatalogFailure,
        language,
      });

      return res.json({
        ...answer,
        reply: sanitizedReply,
        text: sanitizedReply,
        recommendations,
        inquiryPrefill,
        guestMessagesRemaining,
      });
    } catch (error) {
      if (res.headersSent) return;
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
    }
  });

  return router;
}
