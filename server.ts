import { sanitizeFirestoreData } from './src/lib/firestoreData';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { ConciergeLanguage } from './src/lib/conciergeFallback';
import { commerceCors } from './src/lib/apiCors';
import { probeCommerceDatabase } from './src/lib/commerceReadiness';
import { readBuildInfo } from './src/lib/buildInfo';
import { routeMetadata, renderRouteDocument } from './src/lib/routeDocument';
import { PRODUCTS } from './src/data/products';
import type { Product } from './src/types';
import { STORE_CONFIG } from './src/config/store';
import { CONTACT_CONFIG, buildAutomatedOrderWhatsAppUrl, buildHumanSupportWhatsAppUrl } from './src/config/contacts';
import { getN8nOrderDispatchConfig } from './src/services/n8nOrderNotification';
import { startOrderOutboxWorker } from './src/services/orderOutboxWorker';
import { askN8nConsultant, getN8nAiConfig } from './src/services/n8nAIConsultant';
import { reserveGuestAiMessage, GuestTrialLimitError } from './src/lib/aiGuestTrial';
import { createAiChatRouter } from './src/lib/aiChatRouter';
import { REWARDS } from './src/data/rewards';
import { validateAndPriceOrder, validateCustomerDetails, ValidationError } from './src/lib/orderValidation';
import crypto from 'crypto';
import {
  createDurableOrder,
  claimGuestOrder,
  updateAdminOrderStatus,
  PersistenceUnavailableError,
  QuoteChangedError,
  IdempotencyConflictError
} from './src/lib/orderDatabase';
import { getPromo } from './src/lib/couponEngine';
import { firstOrderPromoContext } from './src/server/promoEligibility';
import { sanitizeOrderForCustomer, CanonicalOrder } from './src/lib/serverOrderService';
import { claimWelcomeVoucher } from './src/lib/welcomeCouponService';
import { authenticatePatronCredentials } from './src/lib/serverAuthentication';
import { createProductMediaRouter } from './src/lib/productMediaRouter';
import { createCatalogRouter } from './src/lib/catalogRouter';
import { loadAuthoritativeCatalog, mergeAuthoritativeCatalog } from './src/lib/catalogStore';
import { buildWaProductRows, serializeWaProductsCsv } from './src/lib/waProductsExport';
import { CatalogError, unavailableProduct } from './src/lib/catalogSchema';
import { redeemPatronReward } from './src/lib/loyaltyRedemption';
import { quoteOrderForCustomer } from './src/lib/orderQuote';
import { createStoreUpdatesRouter } from './src/lib/storeUpdatesRouter';
import { createN8nCommerceRouter } from './src/lib/n8nCommerceRouter';
import { verifyN8nIntegrationSecret } from './src/lib/integrationAuthentication';
import {
  AdminOperationError, hasAdminClaim, validateAdminOrderId, validateAdminStatusInput,
  parseAdminOrderFilters, listAdminOrders, getAdminOrder, sanitizeOrderForAdmin,
  addAdminOrderNote, updateAdminOrderPayment,
} from './src/lib/adminOperations';
import { createInquiriesRouter } from './src/lib/inquiriesRouter';

// Load environment variables
if (process.env.ALLBARKA_SKIP_LOCAL_ENV !== 'true') dotenv.config({ quiet: true });

// Initialize Firebase Admin (Production or Emulator)
let db: any = null;
let adminAuth: any = null;
let firebaseAdminAuthAvailable = false;
let savedOrderVerifiedThisProcess = false;
let firebaseAdminMissingCredentialsMsg = 'Firebase Admin credentials (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not configured on the server. Please configure these environment variables.';

try {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'allbarka-live';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    const credentialOptions = cert({
      projectId,
      clientEmail: clientEmail.trim(),
      privateKey: privateKey.replace(/\\n/g, '\n'),
    });

    const adminApp = initializeApp({ credential: credentialOptions, projectId });
    adminAuth = getAuth(adminApp);
    firebaseAdminAuthAvailable = true;
    console.log(`[Firebase Admin] Authentication service initialized successfully for project '${projectId}'.`);

    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const dbId = process.env.FIRESTORE_DATABASE_ID || '(default)';
      db = getFirestore(adminApp, dbId);
      console.log(`[Firestore] Connected via emulator host (${process.env.FIRESTORE_EMULATOR_HOST}).`);
    } else {
      const dbId = process.env.FIRESTORE_DATABASE_ID;
      db = dbId && dbId !== '(default)' ? getFirestore(adminApp, dbId) : getFirestore(adminApp);
      console.log(`[Firestore] Live production database initialized successfully for project '${projectId}'.`);
    }
  } else if (process.env.FIRESTORE_EMULATOR_HOST) {
    const adminApp = initializeApp({ projectId });
    adminAuth = getAuth(adminApp);
    firebaseAdminAuthAvailable = true;
    const dbId = process.env.FIRESTORE_DATABASE_ID || '(default)';
    db = getFirestore(adminApp, dbId);
    console.log(`[Firestore] Connected via emulator host (${process.env.FIRESTORE_EMULATOR_HOST}).`);
  } else {
    adminAuth = null;
    firebaseAdminAuthAvailable = false;
    console.warn(`[Firebase Admin] ${firebaseAdminMissingCredentialsMsg}`);
  }
  if (db) db.settings({ ignoreUndefinedProperties: true });
} catch {
  adminAuth = null;
  firebaseAdminAuthAvailable = false;
  firebaseAdminMissingCredentialsMsg = 'Firebase Admin could not initialize. Verify private credentials and project configuration on the API host.';
  console.error('[Firebase Admin] FIREBASE_ADMIN_INITIALIZATION_FAILED');
}

// Security & Authentication Middlewares
async function authenticateOptionalUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const sessionCookie = req.cookies.__session || '';
  const authHeader = req.headers.authorization;
  
  if (!sessionCookie && authHeader === undefined) {
    (req as any).user = null;
    return next();
  }

  if (!firebaseAdminAuthAvailable || !adminAuth) {
    return res.status(503).json({
      error: firebaseAdminMissingCredentialsMsg,
      code: 'AUTH_SERVICE_UNAVAILABLE'
    });
  }

  try {
    (req as any).user = await authenticatePatronCredentials(authHeader, sessionCookie, {
      verifyIdToken: token => adminAuth.verifyIdToken(token),
      verifySessionCookie: (cookie, checkRevoked) => adminAuth.verifySessionCookie(cookie, checkRevoked),
    });
    return next();
  } catch (err: any) {
    return res.status(401).json({
      error: 'Invalid or expired patron credentials. Please sign in again.',
      code: 'UNAUTHORIZED'
    });
  }
  
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Missing Bearer token.',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  await authenticateOptionalUser(req, res, () => {
    if (res.headersSent) return;
    if (!(req as any).user) {
      return res.status(401).json({
        error: 'Authentication credentials required.',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }
    next();
  });
}

async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  await requireAuth(req, res, () => {
    const user = (req as any).user;
    if (!hasAdminClaim(user)) {
      return res.status(403).json({
        error: 'Forbidden. Authoritative admin privileges required.',
        code: 'FORBIDDEN_ADMIN'
      });
    }
    next();
  });
}

// In-memory claims for Guest -> Account linking (Order ID -> Claim Token)
const orderClaims = new Map<string, string>();

// Initialize Google Sheets Service Account Auth
let doc: GoogleSpreadsheet | null = null;
if (process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_ID, serviceAccountAuth);
}

const app = express();
const PORT = Number(process.env.PORT || 3000);
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
}
app.set('trust proxy', trustProxyHops);

app.use((_req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(18).toString('base64');
  next();
});
app.use(helmet({
  // Firebase Google sign-in needs to communicate with its OAuth popup.
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        (_req, res) => `'nonce-${(res as express.Response).locals.cspNonce}'`,
        "'strict-dynamic'",
        "https:",
        ...(process.env.NODE_ENV !== 'production' ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
        "https://apis.google.com",
        "https://*.firebaseapp.com",
        "https://*.googleapis.com",
        "https://*.gstatic.com"
      ],
      scriptSrcElem: [
        "'self'",
        (_req, res) => `'nonce-${(res as express.Response).locals.cspNonce}'`,
        "https:",
        ...(process.env.NODE_ENV !== 'production' ? ["'unsafe-inline'"] : []),
        "https://apis.google.com",
        "https://*.firebaseapp.com",
        "https://*.googleapis.com",
        "https://*.gstatic.com"
      ],
      frameSrc: ["'self'", "https://allbarka-live.firebaseapp.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://api.fontshare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.fontshare.com"],
      connectSrc: ["'self'", "https://*.firebaseio.com", "https://*.googleapis.com", "https://*.cloudfunctions.net", "https://*.firebaseapp.com"],
      imgSrc: ["'self'", "data:", "https:*"],
      mediaSrc: ["'self'", "https:"],
    }
  }
}));

app.use('/api', commerceCors(process.env.FRONTEND_ORIGINS));

function checkN8nAuth(req: express.Request): boolean {
  const configuredSecret = process.env.N8N_INTEGRATION_SECRET;
  if (!configuredSecret || configuredSecret.trim().length < 32) {
    return true;
  }
  const headerSecret = req.headers['x-allbarka-integration-secret'];
  if (typeof headerSecret === 'string' && verifyN8nIntegrationSecret(headerSecret, configuredSecret)) {
    return true;
  }
  const querySecret = req.query.secret || req.query.key;
  if (typeof querySecret === 'string' && verifyN8nIntegrationSecret(querySecret, configuredSecret)) {
    return true;
  }
  return false;
}

// Live n8n wa_products Single Source of Truth Sync Endpoint (Mounted before n8nCommerceRouter catch-all)
app.get('/api/integrations/n8n/wa-products', async (req, res) => {
  if (!checkN8nAuth(req)) {
    return res.status(401).json({ ok: false, error: 'Integration authentication required.', code: 'INTEGRATION_AUTH_REQUIRED' });
  }
  try {
    let authoritativeProducts = PRODUCTS;
    if (db) {
      try {
        const snapshot = await loadAuthoritativeCatalog(db);
        authoritativeProducts = mergeAuthoritativeCatalog(PRODUCTS, snapshot.products);
      } catch {
        authoritativeProducts = PRODUCTS;
      }
    }
    const rows = buildWaProductRows(authoritativeProducts);
    if (String(req.query.format || '').toLowerCase() === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(serializeWaProductsCsv(rows));
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      ok: true,
      count: rows.length,
      catalogCount: authoritativeProducts.length,
      products: rows,
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message || 'Failed to export wa_products.', code: 'SERVER_ERROR' });
  }
});

// Authenticate private integrations before parsing their JSON. Their router owns
// payload limits and safe parse errors; customer/admin bearer guards remain separate.
app.use('/api/integrations/n8n', createN8nCommerceRouter({ getDb: () => db }));
app.use(express.json({ limit: '128kb' }));
app.use(cookieParser());
app.use(createProductMediaRouter({ getDb: () => db, requireAdmin }));
app.use(createCatalogRouter({ getDb: () => db, requireAdmin }));
app.use(createStoreUpdatesRouter({ getDb: () => db, requireAuth, requireAdmin }));

// Auth & Session Endpoints
app.post('/api/auth/sessionLogin', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken || !adminAuth) {
      return res.status(401).send('UNAUTHORIZED_REQUEST');
    }

    const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const isProd = process.env.NODE_ENV === 'production';
    const options = { maxAge: expiresIn, httpOnly: true, secure: isProd, sameSite: 'lax' as const };
    
    res.cookie('__session', sessionCookie, options);
    res.json({ status: 'success' });
  } catch (error) {
    console.error('Session Login Error:', error);
    res.status(401).send('UNAUTHORIZED_REQUEST');
  }
});

app.post('/api/auth/sessionLogout', (req, res) => {
  res.clearCookie('__session');
  res.json({ status: 'success' });
});

const apiRateLimitResponse = { error: "Too many requests, please try again shortly" };
const aiRateLimitResponse = { error: 'AI_RATE_LIMITED', code: 'AI_RATE_LIMITED', available: false };
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: aiRateLimitResponse, standardHeaders: true, legacyHeaders: false });
const patronChatLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, skip: req => !(req as any).user?.uid, keyGenerator: req => (req as any).user?.uid || 'guest', message: aiRateLimitResponse, standardHeaders: true, legacyHeaders: false });
const contactLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: apiRateLimitResponse, standardHeaders: true, legacyHeaders: false });
const ordersLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: apiRateLimitResponse, standardHeaders: true, legacyHeaders: false });

app.use('/api/chat', chatLimiter);
app.use('/api/concierge', chatLimiter);
app.use('/api/ai', chatLimiter);
app.use(createInquiriesRouter({
  getDb: () => db,
  getCatalog: async () => {
    if (!db) {
      throw new Error('CATALOG_STORE_UNAVAILABLE');
    }
    const snapshot = await loadAuthoritativeCatalog(db, { fresh: true });
    return mergeAuthoritativeCatalog(PRODUCTS, snapshot.products);
  },
  requireAdmin,
  inquiryLimiter: contactLimiter,
}));
app.post('/api/newsletter/subscribe', contactLimiter);
app.post('/api/orders', ordersLimiter);

// Order Database Mock (Google Sheets abstraction)
const ordersDb: any[] = [];

// 1. API: Health Check
let orderOutboxWorker: ReturnType<typeof startOrderOutboxWorker> | null = null;
const buildInfo = readBuildInfo();
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', apiActive: Boolean(getN8nAiConfig()), aiConfigured: Boolean(getN8nAiConfig()), aiProvider: 'n8n-groq', aiConnectivityVerified: false,
    outboxWorker: orderOutboxWorker?.getState() ?? null, build: buildInfo });
});

// 1.2 API: Commerce Persistence Readiness Status
let readinessProbe: Promise<{ connected: boolean; checked: boolean }> | null = null;
let readinessProbeExpiresAt = 0;
app.get('/api/commerce/readiness', async (_req, res) => {
  if (!readinessProbe || Date.now() >= readinessProbeExpiresAt) {
    readinessProbeExpiresAt = Date.now() + 30000;
    readinessProbe = probeCommerceDatabase(db);
  }
  const probe = await readinessProbe;
  res.json({
    status: 'ok',
    processRunning: true,
    authActive: Boolean(adminAuth),
    databaseInitialized: Boolean(db),
    databaseConnected: probe.connected,
    durablePersistenceReady: probe.connected && savedOrderVerifiedThisProcess,
    savedOrderVerifiedThisProcess,
    readinessBasis: 'read_only_database_probe_and_saved_order',
    connectivityVerified: probe.connected,
    aiConfigured: Boolean(getN8nAiConfig()),
    orderWebhookConfigured: getN8nOrderDispatchConfig().enabled,
    mode: !db ? 'containment_maintenance' : probe.connected && savedOrderVerifiedThisProcess ? 'verified_this_process' : 'configured_unverified',
    orderStore: Boolean(db) ? 'firestore' : 'none_in_memory_contained',
    notice: Boolean(db)
      ? 'Database access is checked read-only. Saved-order verification requires a durably accepted checkout in this process; authentication and n8n must be tested separately.'
      : 'The order database is not configured. Automated checkout is unavailable; use the existing WhatsApp concierge.'
  });
});

// 1.3 API: Authoritative Order Quote Calculation
app.post('/api/orders/quote', authenticateOptionalUser, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store').json(await quoteOrderForCustomer(db, req.body, (req as any).user));
  } catch (error: any) {
    if (error instanceof CatalogError) return res.status(error.httpStatus).json({ error: 'Current product pricing is temporarily unavailable.', code: error.code });
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message, code: error.code || 'VALIDATION_ERROR' });
    }
    if (error.code === 'PERSISTENCE_UNAVAILABLE') return res.status(503).json({ error: error.message, code: error.code });
    res.status(500).json({ error: 'Internal server error while calculating quote.', code: 'SERVER_ERROR' });
  }
});

// 1.5 API: Create Order (Durable, Idempotent, with Containment Readiness Gate)
app.post('/api/orders', authenticateOptionalUser, async (req, res) => {
  try {
    const authenticatedUser = (req as any).user;
    const verifiedUid = authenticatedUser?.uid || null;
    const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body.idempotencyKey || null;
    const expectedFinalTotal = typeof req.body.expectedFinalTotal === 'number' ? req.body.expectedFinalTotal : null;

    // Wholesale check
    if (req.body.isWholesale && (!authenticatedUser || !authenticatedUser.wholesaleEligible)) {
      return res.status(403).json({
        error: 'Wholesale pricing requires approved account eligibility. Please contact our wholesale concierge.',
        code: 'FORBIDDEN_WHOLESALE'
      });
    }

    // When durable persistence (db) is not configured, do NOT create fake accepted orders
    if (!db) {
      const promoContext = await firstOrderPromoContext(null, verifiedUid, req.body.discountCode);
      const customer = validateCustomerDetails(req.body, getPromo(req.body.discountCode)?.type === 'quote');
      const validatedOrder = validateAndPriceOrder({
        items: req.body.items,
        city: customer.city,
        shippingMethodId: req.body.shippingMethodId,
        discountCode: req.body.discountCode,
        giftWrapping: Boolean(req.body.giftWrapping),
        isWholesale: Boolean(req.body.isWholesale && authenticatedUser?.wholesaleEligible),
        promoContext,
      });

      const currencyFormat = (num: number) => `Rs. ${num.toLocaleString()}`;
      let itemsStr = '';
      validatedOrder.items.forEach((item, index) => {
        itemsStr += `\n${index + 1}. *${item.name}* (${item.selectedWeight}) x ${item.quantity}${validatedOrder.summary.isQuoteRequest ? '' : ` -> ${currencyFormat(item.price * item.quantity)}`}`;
      });

      const standardReceiptMessage = `👑 *ALLBARKA LUXURY BOUTIQUE ORDER* 👑\n\n*Customer:* ${customer.name}\n*Phone:* ${customer.phone}\n*Delivery Address:* ${customer.address}, ${customer.city}\n*Delivery Slot:* ${customer.deliverySlot}\n\n*Selected Items:*${itemsStr}\n\n*Subtotal:* ${currencyFormat(validatedOrder.summary.subtotal)}${validatedOrder.summary.discount > 0 ? `\n*Discount Applied:* -${currencyFormat(validatedOrder.summary.discount)}` : ''}${customer.giftWrapping ? `\n*Gift Wrapping:* +${currencyFormat(validatedOrder.summary.giftWrapFee)}` : ''}\n*Shipping:* ${validatedOrder.summary.shipping === 0 ? 'FREE' : currencyFormat(validatedOrder.summary.shipping)}\n*Total Due:* *${currencyFormat(validatedOrder.summary.total)}*\n*Payment Method:* ${customer.paymentMethod === 'bank' ? 'Bank Transfer' : 'Cash on Delivery'}`;

      const receiptMessage = validatedOrder.summary.isQuoteRequest
        ? `*ALLBARKA QUOTE ENQUIRY*\n\n*Customer:* ${customer.name}\n*Phone:* ${customer.phone}\n*Delivery Address:* ${customer.address}, ${customer.city}\n\n*Selected Items:*${itemsStr}\n\nPROMO:CANCER: quote request\nOur team will contact you with your personalized rate.`
        : standardReceiptMessage;

      return res.status(503).json({
        success: false,
        code: 'PERSISTENCE_PENDING',
        durablePersistenceReady: false,
        error: 'Automated checkout is unavailable because the order database is not configured. Your bag and details are preserved; retry later or use the WhatsApp concierge.',
        supportAction: {
          type: 'whatsapp',
          label: 'Place Order via WhatsApp Concierge',
          whatsappUrl: buildAutomatedOrderWhatsAppUrl(receiptMessage)
        },
        totals: validatedOrder.summary,
        items: validatedOrder.items
      });
    }

    const result = await createDurableOrder({
      db,
      payload: req.body,
      uid: verifiedUid,
      idempotencyKey,
      expectedFinalTotal
    });
    savedOrderVerifiedThisProcess = true;

    res.json({
      success: true,
      orderId: result.orderId,
      status: result.status,
      orderType: result.orderType,
      whatsappMessage: result.whatsappMessage,
      claimToken: result.claimToken,
      totals: result.totals,
      items: result.items,
      isDuplicate: result.isDuplicate,
      durablePersistenceReady: true,
      n8nNotification: { managedBy: 'durable-outbox', deliveryVerified: false }
    });
  } catch (error: any) {
    if (error.code === 'IDEMPOTENCY_PAYLOAD_MISMATCH') {
      return res.status(409).json({ error: error.message, code: error.code });
    }
    if (error.code === 'QUOTE_CHANGED') {
      return res.status(409).json({
        error: error.message,
        code: error.code,
        totals: error.totals,
        items: error.items,
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message, code: error.code || 'VALIDATION_ERROR' });
    }
    if (error instanceof PersistenceUnavailableError || error.code === 'PERSISTENCE_UNAVAILABLE') {
      return res.status(503).json({ error: error.message, code: error.code });
    }
    console.error('Order creation failed:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error during checkout.', code: 'SERVER_ERROR' });
  }
});

// 1.6 API: Authenticated Patron Orders List (GET /api/me/orders & GET /api/orders/mine)
const handleGetMyOrders = async (req: express.Request, res: express.Response) => {
  try {
    const uid = (req as any).user.uid;
    if (!db) {
      return res.json({ success: true, orders: [] });
    }

    const snap = await db.collection('orders').where('uid', '==', uid).get();
    const orders = snap.docs.map((doc: any) => sanitizeOrderForCustomer(doc.data() as CanonicalOrder));
    orders.sort((a: any, b: any) => new Date(b.createdAt || b.createdAtMs || 0).getTime() - new Date(a.createdAt || a.createdAtMs || 0).getTime());

    res.json({ success: true, orders });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch patron orders.', code: 'SERVER_ERROR' });
  }
};

app.get('/api/me/orders', requireAuth, handleGetMyOrders);
app.get('/api/orders/mine', requireAuth, handleGetMyOrders);

// 1.7 API: Order Receipt Lookup (Owner, Admin, or Guest with Valid Claim Token)
app.get('/api/orders/:orderId', authenticateOptionalUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    const user = (req as any).user;
    const guestClaimToken = (req.headers['x-guest-claim-token'] as string) || (req.query.claimToken as string) || null;

    if (!db) {
      return res.status(404).json({ error: 'Order not found.', code: 'ORDER_NOT_FOUND' });
    }

    const doc = await db.collection('orders').doc(orderId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Order not found.', code: 'ORDER_NOT_FOUND' });
    }

    const order = doc.data() as CanonicalOrder;
    const isOwner = user && order.uid && user.uid === order.uid;
    const isAdmin = hasAdminClaim(user);
    let isGuestAuthorized = false;

    if (guestClaimToken && order.claimTokenHash) {
      const hash = crypto.createHash('sha256').update(guestClaimToken.trim()).digest('hex');
      if (hash === order.claimTokenHash && (!order.claimTokenExpiry || Date.now() < order.claimTokenExpiry)) {
        isGuestAuthorized = true;
      }
    }

    if (!isOwner && !isAdmin && !isGuestAuthorized) {
      return res.status(404).json({ error: 'Order not found.', code: 'ORDER_NOT_FOUND' });
    }

    res.setHeader('Cache-Control', 'private, no-store');
    res.json({
      success: true,
      order: { ...sanitizeOrderForCustomer(order), loyaltyPointsTotal: order.uid
        ? Number((await db.collection('users').doc(order.uid).get()).data()?.loyaltyPoints) || 0 : 0 },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error retrieving order.', code: 'SERVER_ERROR' });
  }
});

// 1.8 API: Coupon Preview Endpoint (Rate-Limited, Non-Consuming)
app.post('/api/coupons/preview', authenticateOptionalUser, async (req, res) => {
  try {
    const { code, items, city = 'Lahore', shippingMethodId = 'standard', giftWrapping, isWholesale } = req.body;
    if (!code) {
      return res.status(400).json({ valid: false, error: 'Coupon code is required.' });
    }
    const promo = getPromo(code);
    if (!promo) throw new ValidationError('Promo code is required.', 'PROMO_REQUIRED');
    const user = (req as any).user;
    const promoContext = await firstOrderPromoContext(db, user?.uid || null, promo.code);
    const catalog = await loadAuthoritativeCatalog(db, { fresh: true });
    const validated = validateAndPriceOrder({ items, city, shippingMethodId, discountCode: promo.code,
      giftWrapping: Boolean(giftWrapping), isWholesale: Boolean(isWholesale && user?.wholesaleEligible), promoContext,
      products: catalog.products, hamperBoxes: catalog.hamperBoxes });

    res.json({
      valid: true,
      code: promo.code,
      discount: validated.summary.discount,
      discountMode: promo.type,
      value: promo.value ?? null,
      totals: validated.summary,
    });
  } catch (e: any) {
    if (e instanceof CatalogError) return res.status(e.httpStatus).json({ valid: false, error: 'Current product pricing is temporarily unavailable.', code: e.code });
    if (e.name === 'ValidationError') return res.status(400).json({ valid: false, error: e.message, code: e.code });
    if (e.code === 'PERSISTENCE_UNAVAILABLE') return res.status(503).json({ valid: false, error: e.message, code: e.code });
    res.status(500).json({ valid: false, error: 'Failed to preview coupon.' });
  }
});

// 1.9 API: Deterministic Welcome Voucher Claim
app.post('/api/coupons/welcome/claim', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const result = await claimWelcomeVoucher(db, uid);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ eligible: false, message: 'Server error processing welcome voucher.' });
  }
});

function adminOperationFailure(res: express.Response, error: any) {
  if (error instanceof AdminOperationError) {
    return res.status(error.httpStatus).json({ error: error.message, code: error.code });
  }
  if (error instanceof PersistenceUnavailableError || error?.code === 14) {
    return res.status(503).json({ error: 'Durable database unavailable.', code: 'DB_UNAVAILABLE' });
  }
  if (error?.name === 'ValidationError') {
    const status = error.code === 'ORDER_NOT_FOUND' ? 404 : ['STATUS_CONFLICT', 'ORDER_CONFLICT'].includes(error.code) ? 409 : 400;
    return res.status(status).json({ error: error.message, code: error.code });
  }
  console.error('[Admin orders] operation failed:', error?.message || error);
  return res.status(500).json({ error: 'The order operation failed. Please retry.', code: 'SERVER_ERROR' });
}

// Admin-only: Order status updater with optimistic concurrency & audit trail
app.post('/api/admin/orders/:orderId/status', requireAdmin, async (req, res) => {
  try {
    const orderId = validateAdminOrderId(req.params.orderId);
    const { status, reason, expectedStatus, expectedUpdatedAt } = validateAdminStatusInput(req.body);
    const user = (req as any).user;

    if (!db) {
      return res.status(503).json({ error: 'Durable database unavailable.', code: 'DB_UNAVAILABLE' });
    }

    const updated = await updateAdminOrderStatus({
      db,
      orderId,
      status,
      reason,
      expectedStatus,
      expectedUpdatedAt,
      actorUid: user.uid,
      actorEmail: user.email || 'admin',
    });

    res.json({ success: true, order: sanitizeOrderForAdmin(updated) });
  } catch (e: any) {
    adminOperationFailure(res, e);
  }
});

// Register export before the dynamic order ID route. The frontend handles CSV formatting.
app.get('/api/admin/orders/export', requireAdmin, async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await listAdminOrders(db, parseAdminOrderFilters(req.query), true));
  } catch (error) { adminOperationFailure(res, error); }
});

// Admin-only: newest-order bounded scan, matching-filter metrics, and pagination.
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await listAdminOrders(db, parseAdminOrderFilters(req.query)));
  } catch (error) { adminOperationFailure(res, error); }
});

// Admin-only: Single order details with audit trail
app.get('/api/admin/orders/:orderId', requireAdmin, async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, ...await getAdminOrder(db, req.params.orderId) });
  } catch (error) { adminOperationFailure(res, error); }
});

app.post('/api/admin/orders/:orderId/notes', requireAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const order = await addAdminOrderNote({ db, orderId: req.params.orderId, note: req.body?.note,
      expectedUpdatedAt: req.body?.expectedUpdatedAt, actorUid: user.uid, actorEmail: user.email });
    res.json({ success: true, order });
  } catch (error) { adminOperationFailure(res, error); }
});

app.post('/api/admin/orders/:orderId/payment', requireAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const order = await updateAdminOrderPayment({ db, orderId: req.params.orderId,
      paymentStatus: req.body?.paymentStatus, expectedPaymentStatus: req.body?.expectedPaymentStatus,
      reason: req.body?.reason, expectedUpdatedAt: req.body?.expectedUpdatedAt,
      actorUid: user.uid, actorEmail: user.email });
    res.json({ success: true, order });
  } catch (error) { adminOperationFailure(res, error); }
});

// Authenticated customer loyalty profile
app.get('/api/loyalty/profile', requireAuth, async (req, res) => {
    try {
        const uid = (req as any).user.uid;
        if (!db) {
          return res.json({
            loyaltyPoints: 0,
            transactions: [],
            activeRewards: []
          });
        }

        const userDoc = await db.collection("users").doc(uid).get();
        const loyaltyPoints = userDoc.exists ? (userDoc.data()?.loyaltyPoints || 0) : 0;

        const txSnap = await db.collection("users").doc(uid).collection("loyaltyTransactions").orderBy("createdAt", "desc").limit(10).get();
        const transactions = txSnap.docs.map((d: any) => d.data());

        const arSnap = await db.collection("users").doc(uid).collection("activeRewards").where("status", "==", "ACTIVE").get();
        const activeRewards = arSnap.docs.map((d: any) => ({ ...d.data(), id: d.id }))
          .filter((reward: any) => Number.isFinite(reward.expiresAt) && reward.expiresAt > Date.now());

        res.set('Cache-Control', 'no-store').json({
            loyaltyPoints,
            transactions,
            activeRewards
        });
    } catch(err: any) {
        res.status(500).json({ error: err.message, code: 'SERVER_ERROR' });
    }
});

app.get('/api/loyalty/rewards', (req, res) => {
    res.json(REWARDS);
});

// Authenticated customer loyalty redeem
app.post('/api/loyalty/redeem', requireAuth, async (req, res) => {
    try {
        const result = await redeemPatronReward({ db, uid: (req as any).user.uid,
          rewardId: req.body?.rewardId, requestId: req.body?.requestId });
        res.set('Cache-Control', 'no-store').json(result);
    } catch(err: any) {
        res.status(err.code === 'PERSISTENCE_UNAVAILABLE' ? 503 : 400)
          .json({ error: err.code ? err.message : 'Reward redemption is temporarily unavailable.', code: err.code || 'REDEEM_FAILED' });
    }
});

// Authenticated guest order claim
app.post('/api/orders/claim', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const { orderId, claimToken } = req.body;
    if (!orderId || !claimToken) {
      return res.status(400).json({ error: 'Missing required claim parameters.', code: 'MISSING_PARAMS' });
    }
    if (!db) {
      return res.status(503).json({ error: 'Durable order database is currently unavailable.', code: 'PERSISTENCE_UNAVAILABLE' });
    }

    const result = await claimGuestOrder({
      db,
      uid,
      orderId,
      claimToken,
    });

    res.json({
      success: true,
      message: result.message,
      order: sanitizeOrderForCustomer(result.order),
    });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const statusCode = error.code === 'INVALID_CLAIM_TOKEN' ? 403 : error.code === 'ORDER_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: error.message || 'Server error claiming order.', code: 'SERVER_ERROR' });
  }
});

// Newsletter Subscription API
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { contact, email, phone, consent } = req.body;
    const target = (email || phone || contact || '').trim();

    if (!target) {
      return res.status(400).json({
        error: 'Please provide a valid email address or Pakistani mobile number.',
        code: 'MISSING_CONTACT'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(\+92|0)?3[0-9]{9}$/;

    const isEmail = emailRegex.test(target);
    const isPhone = phoneRegex.test(target.replace(/[\s-]/g, ''));

    if (!isEmail && !isPhone) {
      return res.status(400).json({
        error: 'Please provide a valid email format (e.g. patron@domain.com) or Pakistan phone number (03XX-XXXXXXX).',
        code: 'INVALID_FORMAT'
      });
    }

    const normalized = isEmail ? target.toLowerCase() : target.replace(/[\s-]/g, '');

    if (!db) return res.status(503).json({ error: 'Newsletter is temporarily unavailable.', code: 'PERSISTENCE_UNAVAILABLE' });
    {
      try {
        const subDoc = db.collection('subscribers').doc(Buffer.from(normalized).toString('base64url'));
        await subDoc.set(sanitizeFirestoreData({
          contact: normalized,
          type: isEmail ? 'email' : 'phone',
          consent: Boolean(consent),
          createdAt: new Date().toISOString(),
          status: 'ACTIVE',
          tags: ['harvest-alerts', 'seasonal-reserves']
        }), { merge: true });
      } catch (dbErr) {
        console.warn('Firestore subscription failed:', dbErr);
        return res.status(503).json({ error: 'Newsletter is temporarily unavailable.', code: 'PERSISTENCE_UNAVAILABLE' });
      }
    }

    res.json({
      success: true,
      message: 'Welcome to the AllBarka Private Reserve list. You will receive seasonal harvest drop alerts, private previews, and boutique reserve arrivals.',
      contact: normalized,
      type: isEmail ? 'email' : 'phone'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Subscription failed.', code: 'SERVER_ERROR' });
  }
});


// 3. API: Private n8n/Groq concierge; no simulated assistant responses.
app.use(createAiChatRouter({
  getDb: () => db,
  authenticateOptionalUser,
  patronChatLimiter,
}));

// Vite Middleware & Static Asset pipeline integration
async function startServer() {
  // API failures must never fall through to the SPA document.
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found', code: 'NOT_FOUND' }));
  if (process.env.NODE_ENV !== 'production') {
    console.time('[dev] Vite middleware');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.timeEnd('[dev] Vite middleware');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const publicOrigin = new URL(process.env.APP_URL || (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${PORT}`)).origin;
    const html = readFileSync(path.join(distPath, 'index.html'), 'utf8')
      .replaceAll('https://allbarka.com', publicOrigin)
      .replaceAll('content="/images/generated/og-image.jpg"', `content="${publicOrigin}/images/generated/og-image.jpg"`);
    const pageCatalog = async () => {
      try {
        const snap = await loadAuthoritativeCatalog(db);
        return mergeAuthoritativeCatalog(PRODUCTS, snap.products);
      }
      catch { return PRODUCTS.map(unavailableProduct); }
    };
    app.get('/robots.txt', (_req, res) => res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /checkout\nDisallow: /cart\nDisallow: /success\nDisallow: /admin\nSitemap: ${publicOrigin}/sitemap.xml\n`
    ));
    app.get('/sitemap.xml', async (_req, res) => {
      const products = await pageCatalog();
      const routes = ['/', '/shop', '/gifting', '/wholesale', '/journal', '/faq', '/contact',
        ...products.filter(product => product.active !== false).map(product => `/product/${encodeURIComponent(product.id)}`)];
      res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(route => `<url><loc>${publicOrigin}${route}</loc></url>`).join('')}</urlset>`);
    });
    app.get('/index.html', async (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.type('html').send(renderRouteDocument(html, routeMetadata('/', publicOrigin, await pageCatalog()), publicOrigin, res.locals.cspNonce));
    });
    app.use(express.static(distPath, {
      index: false,
      setHeaders(res, filePath) {
        res.setHeader('Cache-Control', filePath.startsWith(path.join(distPath, 'assets') + path.sep)
          ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
      },
    }));
    // Assets that do not exist on disk must immediately return 404, never falling through to SPA index.html
    app.use('/assets', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.status(404).type('text/plain').send('Asset not found');
    });
    app.get('*', async (req, res) => {
      if (req.path.startsWith('/assets/') || path.extname(req.path)) {
        return res.status(404).type('text/plain').send('Not found');
      }
      const metadata = routeMetadata(req.path, publicOrigin, await pageCatalog());
      if (metadata.noindex) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(metadata.status).type('html').send(renderRouteDocument(html, metadata, publicOrigin, res.locals.cspNonce));
    });
  }

  const worker = startOrderOutboxWorker({ getDb: () => db, logger: (message, metadata) => {
    const line = `[Order outbox] ${message} ${JSON.stringify(metadata || {})}`;
    if (message === 'ORDER_OUTBOX_WORKER_ERROR') console.error(line);
    else console.info(line);
  } });
  orderOutboxWorker = worker;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AllBarka Fullstack Server] booting success, running on port ${PORT}`);
  });
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    const timer = setTimeout(() => process.exit(1), 40000);
    timer.unref();
    await worker.stop();
    server.close(() => { clearTimeout(timer); process.exitCode = 0; });
    server.closeIdleConnections();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

startServer().catch((error) => {
  console.error('[AllBarka] startup failed:', error.message);
  process.exitCode = 1;
});
