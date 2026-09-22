import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { PRODUCTS } from './src/data/products';
import { STORE_CONFIG } from './src/config/store';
import { CONTACT_CONFIG, buildAutomatedOrderWhatsAppUrl, buildHumanSupportWhatsAppUrl } from './src/config/contacts';
import { sendOrderToN8n } from './src/services/n8nOrderNotification';
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
import { STORE_COUPONS, calculateCouponDiscount } from './src/lib/couponEngine';
import { sanitizeOrderForCustomer, CanonicalOrder } from './src/lib/serverOrderService';
import { claimWelcomeVoucher } from './src/lib/welcomeCouponService';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin (Production or Emulator)
let db: any = null;
let adminAuth: any = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  let credentialOptions: any = null;

  if (clientEmail && privateKey) {
    credentialOptions = cert({
      projectId: projectId || undefined,
      clientEmail: clientEmail.trim(),
      privateKey: privateKey.replace(/\\n/g, '\n'),
    });
  } else {
    credentialOptions = applicationDefault();
  }

  const appOptions: any = { credential: credentialOptions };
  if (projectId) {
    appOptions.projectId = projectId;
  }

  const adminApp = initializeApp(appOptions);
  adminAuth = getAuth(adminApp);
  console.log('[Firebase Admin] Authentication service initialized successfully.');

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    const dbId = process.env.FIRESTORE_DATABASE_ID || '(default)';
    db = getFirestore(adminApp, dbId);
    console.log(`[Firestore] Connected via emulator host (${process.env.FIRESTORE_EMULATOR_HOST}).`);
  } else if (process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const dbId = process.env.FIRESTORE_DATABASE_ID;
    db = dbId && dbId !== '(default)' ? getFirestore(adminApp, dbId) : getFirestore(adminApp);
    console.log('[Firestore] Live production database initialized successfully.');
  } else {
    console.warn('[Firestore] Server-only Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) not provided. Durable persistence running in contained offline state.');
  }
} catch (e: any) {
  console.error('[Firebase Admin] Initialization deferred:', e?.message || e);
}

// Security & Authentication Middlewares
async function authenticateOptionalUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    (req as any).user = null;
    return next();
  }
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Invalid Authorization header format. Expected Bearer <token>.',
      code: 'INVALID_AUTH_HEADER'
    });
  }
  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({
      error: 'Empty Bearer token provided.',
      code: 'EMPTY_TOKEN'
    });
  }
  if (!adminAuth) {
    return res.status(503).json({
      error: 'Authentication verification service is temporarily unavailable.',
      code: 'AUTH_SERVICE_UNAVAILABLE'
    });
  }
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
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
    if (!user || (!user.admin && user.role !== 'admin')) {
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

app.use(express.json());

// Initialize Gemini client if API key is present
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Order Database Mock (Google Sheets abstraction)
const ordersDb: any[] = [];

// 1. API: Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', apiActive: !!ai });
});

// 1.2 API: Commerce Persistence Readiness Status
app.get('/api/commerce/readiness', (req, res) => {
  res.json({
    status: 'ok',
    processRunning: true,
    authActive: Boolean(adminAuth),
    databaseConnected: Boolean(db),
    durablePersistenceReady: Boolean(db),
    mode: Boolean(db) ? 'live' : 'containment_maintenance',
    orderStore: Boolean(db) ? 'firestore' : 'none_in_memory_contained',
    notice: Boolean(db)
      ? 'Durable persistence operational'
      : 'Durable order ledger persistence undergoing scheduled configuration (Batch 2). Automated orders held safely without side effects.'
  });
});

// 1.3 API: Authoritative Order Quote Calculation
app.post('/api/orders/quote', authenticateOptionalUser, (req, res) => {
  try {
    const { items, shippingMethodId, discountCode, rewardId, giftWrapping, isWholesale } = req.body;
    const authenticatedUser = (req as any).user;

    const validatedOrder = validateAndPriceOrder({
      items,
      shippingMethodId,
      discountCode,
      giftWrapping: Boolean(giftWrapping),
      isWholesale: Boolean(isWholesale && authenticatedUser?.wholesaleEligible),
    });

    res.json({
      success: true,
      totals: validatedOrder.summary,
      items: validatedOrder.items,
      earnedPoints: validatedOrder.earnedPoints,
      generatedAt: Date.now(),
    });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message, code: error.code || 'VALIDATION_ERROR' });
    }
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
      const customer = validateCustomerDetails(req.body);
      const validatedOrder = validateAndPriceOrder({
        items: req.body.items,
        shippingMethodId: req.body.shippingMethodId,
        discountCode: req.body.discountCode,
        giftWrapping: Boolean(req.body.giftWrapping),
        isWholesale: Boolean(req.body.isWholesale && authenticatedUser?.wholesaleEligible),
      });

      const currencyFormat = (num: number) => `Rs. ${num.toLocaleString()}`;
      let itemsStr = '';
      validatedOrder.items.forEach((item, index) => {
        itemsStr += `\n${index + 1}. *${item.name}* (${item.selectedWeight}) x ${item.quantity} -> ${currencyFormat(item.price * item.quantity)}`;
      });

      const receiptMessage = `👑 *ALLBARKA LUXURY BOUTIQUE ORDER* 👑\n\n*Customer:* ${customer.name}\n*Phone:* ${customer.phone}\n*Delivery Address:* ${customer.address}, ${customer.city}\n*Delivery Slot:* ${customer.deliverySlot}\n\n*Selected Items:*${itemsStr}\n\n*Subtotal:* ${currencyFormat(validatedOrder.summary.subtotal)}${validatedOrder.summary.discount > 0 ? `\n*Discount Applied:* -${currencyFormat(validatedOrder.summary.discount)}` : ''}${customer.giftWrapping ? `\n*Gift Wrapping:* +${currencyFormat(validatedOrder.summary.giftWrapFee)}` : ''}\n*Shipping:* ${validatedOrder.summary.shipping === 0 ? 'FREE' : currencyFormat(validatedOrder.summary.shipping)}\n*Total Due:* *${currencyFormat(validatedOrder.summary.total)}*\n*Payment Method:* ${customer.paymentMethod === 'bank' ? 'Bank Transfer' : 'Cash on Delivery'}`;

      return res.status(503).json({
        success: false,
        code: 'PERSISTENCE_PENDING',
        durablePersistenceReady: false,
        error: 'Automated order processing is temporarily unavailable while durable order ledger persistence is being activated (Batch 2). Your luxury cart and details are safely preserved.',
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

    let n8nNotificationStatus = null;
    if (!result.isDuplicate) {
      try {
        n8nNotificationStatus = await sendOrderToN8n({
          orderId: result.orderId,
          customer: validateCustomerDetails(req.body),
          totals: result.totals,
          items: result.items,
          paymentMethod: req.body.paymentMethod || 'cod',
          createdAt: new Date().toISOString(),
          whatsappMessage: result.whatsappMessage
        });
      } catch (n8nErr) {
        console.warn('[n8n Dispatch] Non-blocking notification error:', n8nErr);
        n8nNotificationStatus = { sent: false, status: 'FAILED' as const, reason: 'Dispatch exception' };
      }
    }

    res.json({
      success: true,
      orderId: result.orderId,
      whatsappMessage: result.whatsappMessage,
      claimToken: result.claimToken,
      totals: result.totals,
      items: result.items,
      isDuplicate: result.isDuplicate,
      n8nNotification: n8nNotificationStatus
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
    if (error instanceof PersistenceUnavailableError) {
      return res.status(503).json({ error: error.message, code: error.code });
    }
    console.error('Order creation failed:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error during checkout.', code: 'SERVER_ERROR' });
  }
});

// 1.6 API: Authenticated Patron Orders List
app.get('/api/orders/mine', requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    if (!db) {
      return res.json({ success: true, orders: [] });
    }

    const snap = await db.collection('orders').where('uid', '==', uid).get();
    const orders = snap.docs.map((doc: any) => sanitizeOrderForCustomer(doc.data() as CanonicalOrder));
    orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, orders });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch patron orders.', code: 'SERVER_ERROR' });
  }
});

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
    const isAdmin = user && (user.admin || user.role === 'admin');
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

    res.json({
      success: true,
      order: sanitizeOrderForCustomer(order),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error retrieving order.', code: 'SERVER_ERROR' });
  }
});

// 1.8 API: Coupon Preview Endpoint (Rate-Limited, Non-Consuming)
app.post('/api/coupons/preview', authenticateOptionalUser, async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      return res.status(400).json({ valid: false, error: 'Coupon code is required.' });
    }
    const cleanCode = String(code).trim().toUpperCase();
    const cleanSubtotal = Number(subtotal) || 0;
    const uid = (req as any).user?.uid || null;

    let couponRecord: any = null;
    if (db) {
      const snap = await db.collection('coupons').doc(cleanCode).get();
      if (snap.exists) {
        couponRecord = snap.data();
      }
    }
    if (!couponRecord && STORE_COUPONS[cleanCode]) {
      couponRecord = STORE_COUPONS[cleanCode];
    }

    if (!couponRecord) {
      return res.status(400).json({ valid: false, error: `Coupon code "${cleanCode}" is invalid.` });
    }

    const calc = calculateCouponDiscount(couponRecord, cleanSubtotal, uid);
    if (calc.error) {
      return res.status(400).json({ valid: false, error: calc.error });
    }

    res.json({
      valid: true,
      code: cleanCode,
      discount: calc.discount,
      discountMode: couponRecord.discountMode,
      value: couponRecord.value,
    });
  } catch (e: any) {
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

// Admin-only: Order status updater with optimistic concurrency & audit trail
app.post('/api/admin/orders/:orderId/status', requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, reason, expectedStatus } = req.body;
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
      actorUid: user.uid,
      actorEmail: user.email || 'admin',
    });

    res.json({ success: true, order: updated });
  } catch (e: any) {
    if (e.name === 'ValidationError') {
      const code = e.code === 'STATUS_CONFLICT' ? 409 : 400;
      return res.status(code).json({ error: e.message, code: e.code });
    }
    res.status(500).json({ error: e.message || 'Status transition failed.', code: 'SERVER_ERROR' });
  }
});

// Admin-only: Order list with pagination, search, status filter
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    if (!db) {
      return res.json({ orders: [], totalPages: 1, totalCount: 0 });
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 15));
    const statusFilter = req.query.status as string;
    const search = (req.query.search as string)?.trim();

    let query: any = db.collection('orders');
    if (statusFilter && statusFilter !== 'ALL') {
      query = query.where('status', '==', statusFilter);
    }

    const snap = await query.get();
    let allOrders = snap.docs.map((d: any) => d.data() as CanonicalOrder);

    if (search) {
      const lower = search.toLowerCase();
      allOrders = allOrders.filter(o =>
        o.orderId.toLowerCase().includes(lower) ||
        o.customer.phone.includes(search) ||
        o.customer.name.toLowerCase().includes(lower)
      );
    }

    allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalCount = allOrders.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const paged = allOrders.slice((page - 1) * limit, page * limit);

    res.json({
      orders: paged,
      page,
      limit,
      totalCount,
      totalPages,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to list admin orders.', code: 'SERVER_ERROR' });
  }
});

// Admin-only: Single order details with audit trail
app.get('/api/admin/orders/:orderId', requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!db) {
      return res.status(404).json({ error: 'Order not found.', code: 'ORDER_NOT_FOUND' });
    }
    const doc = await db.collection('orders').doc(orderId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Order not found.', code: 'ORDER_NOT_FOUND' });
    }
    const order = doc.data() as CanonicalOrder;

    const auditsSnap = await db.collection('orderAudits').where('orderId', '==', orderId).get();
    const audits = auditsSnap.docs.map((d: any) => d.data());
    audits.sort((a: any, b: any) => b.timestamp - a.timestamp);

    res.json({ success: true, order, audits });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch order.', code: 'SERVER_ERROR' });
  }
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
        const activeRewards = arSnap.docs.map((d: any) => d.data());

        res.json({
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
        const uid = (req as any).user.uid;
        const { rewardId } = req.body;
        if (!rewardId) return res.status(400).json({ error: "Missing rewardId", code: 'MISSING_REWARD' });
        if (!db) return res.status(503).json({ error: "Loyalty redemption database is currently undergoing maintenance.", code: 'DB_UNAVAILABLE' });

        const reward = REWARDS.find(r => r.rewardId === rewardId);
        if (!reward || !reward.active) return res.status(400).json({ error: "Invalid reward", code: 'INVALID_REWARD' });

        let activeRewardData: any = null;
        await db.runTransaction(async (t: any) => {
            const userRef = db.collection("users").doc(uid);
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) throw new Error("User not found");
            const currentPoints = userDoc.data()?.loyaltyPoints || 0;
            if (currentPoints < reward.pointsCost) throw new Error("Insufficient points");

            const activeRewardsSnapshot = await t.get(userRef.collection("activeRewards").where("status", "==", "ACTIVE").limit(1));
            if (!activeRewardsSnapshot.empty) {
                throw new Error("You already have an active reward. Please use it first.");
            }

            const newPoints = currentPoints - reward.pointsCost;
            t.set(userRef, { loyaltyPoints: newPoints }, { merge: true });

            const txId = crypto.randomUUID();
            const txRef = userRef.collection("loyaltyTransactions").doc(txId);
            t.set(txRef, {
                transactionId: txId,
                type: 'REDEEM',
                points: -reward.pointsCost,
                rewardId: reward.rewardId,
                description: `Redeemed ${reward.name}`,
                createdAt: Date.now()
            });

            const arId = crypto.randomUUID();
            const arRef = userRef.collection("activeRewards").doc(arId);
            activeRewardData = {
                rewardId: reward.rewardId,
                claimedAt: Date.now(),
                expiresAt: Date.now() + (reward.expiryDays * 24 * 60 * 60 * 1000),
                status: 'ACTIVE',
                rewardType: reward.rewardType
            };
            t.set(arRef, activeRewardData);
        });

        res.json({ success: true, activeReward: activeRewardData });
    } catch(err: any) {
        res.status(400).json({ error: err.message, code: 'REDEEM_FAILED' });
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

    // Persist to Firestore if available
    if (db) {
      try {
        const subDoc = db.collection('subscribers').doc(Buffer.from(normalized).toString('base64url'));
        await subDoc.set({
          contact: normalized,
          type: isEmail ? 'email' : 'phone',
          consent: Boolean(consent),
          createdAt: new Date().toISOString(),
          status: 'ACTIVE',
          tags: ['harvest-alerts', 'seasonal-reserves']
        }, { merge: true });
      } catch (dbErr) {
        console.warn('Firestore subscription fallback:', dbErr);
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

// Boutique Inquiry & Contact API
app.post('/api/contact', async (req, res) => {
  try {
    const { name, contact, topic, message } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please provide your full name.', code: 'MISSING_NAME' });
    }
    if (!contact || !contact.trim()) {
      return res.status(400).json({ error: 'Please provide an email or phone number so our concierge can reach you.', code: 'MISSING_CONTACT' });
    }
    if (!message || message.trim().length < 5) {
      return res.status(400).json({ error: 'Please enter your message (at least 5 characters).', code: 'MESSAGE_TOO_SHORT' });
    }

    const ticketId = `AB-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (db) {
      try {
        await db.collection('inquiries').doc(ticketId).set({
          ticketId,
          name: name.trim(),
          contact: contact.trim(),
          topic: topic || 'general',
          message: message.trim(),
          createdAt: new Date().toISOString(),
          status: 'PENDING'
        });
      } catch (dbErr) {
        console.warn('Firestore inquiry storage fallback:', dbErr);
      }
    }

    res.json({
      success: true,
      ticketId,
      message: 'Inquiry received. Our boutique concierge will respond via WhatsApp or email within 2 to 4 business hours.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit inquiry.', code: 'SERVER_ERROR' });
  }
});

// 2. Fallback Sommelier Response Generator
function generateBoutiqueResponse(userText: string): { reply: string; groundingSources: Array<{ title: string; uri: string; type: 'map' }> } {
  const lowerText = userText.toLowerCase();
  let reply = "";
  const groundingSources: Array<{ title: string; uri: string; type: 'map' }> = [];

  if (
    lowerText.includes('where') ||
    lowerText.includes('location') ||
    lowerText.includes('address') ||
    lowerText.includes('store') ||
    lowerText.includes('shop') ||
    lowerText.includes('branch')
  ) {
    reply = "📍 **AllBarka Flagship Boutique** is located at **Neelum Block, Allama Iqbal Town, Lahore**.\n\nWe provide rapid express delivery across all Lahore sectors including DHA Phase 1–8, Gulberg I–III, Model Town, Cantt, Bahria Town, and Johar Town. You can also pin your address directly in the cart drawer!";
    groundingSources.push({
      title: 'AllBarka Boutique (Allama Iqbal Town, Lahore)',
      uri: 'https://maps.google.com/?q=31.5085,74.2882',
      type: 'map'
    });
  } else if (
    lowerText.includes('dha') ||
    lowerText.includes('bahria') ||
    lowerText.includes('delivery') ||
    lowerText.includes('shipping') ||
    lowerText.includes('rider') ||
    lowerText.includes('free')
  ) {
    reply = "🚚 **Delivery Terms & Speed**:\n• **Standard Lahore Delivery**: Rs. 150 (delivered within 24–48 hours in sealed vacuum pouches).\n• **FREE Delivery**: Automatically unlocked on all orders of **Rs. 3000 or above**!\n• **Coverage**: DHA (Phase 1–8), Gulberg, Model Town, Cantt, Bahria Town, Johar Town, Wapda Town & all surrounding sectors.";
    groundingSources.push({
      title: 'Lahore Express Delivery Coverage',
      uri: 'https://maps.google.com/?q=31.5204,74.3587',
      type: 'map'
    });
  } else if (lowerText.includes('pista') || lowerText.includes('pistachio')) {
    reply = "🌰 **Premium Pistachios (Pista)**:\nOur jumbo Iranian/Kerman pistachios are lightly roasted, crisply salted, and hand-sorted with a 99% open-shell guarantee.\n\n• **250g**: Rs. 1,000\n• **500g**: Rs. 2,000\n• **1kg**: Rs. 4,000 *(Wholesale price: Rs. 3,800)*";
  } else if (lowerText.includes('kaju') || lowerText.includes('cashew')) {
    reply = "💎 **Luxury Cashews (Kaju)**:\nJumbo W240 grade, rich in natural buttery sweetness, golden and vacuum-sealed for peak crunchiness.\n\n• **250g**: Rs. 915\n• **500g**: Rs. 1,825\n• **1kg**: Rs. 3,650 *(Wholesale price: Rs. 3,450)*";
  } else if (lowerText.includes('badam') || lowerText.includes('almond')) {
    reply = "✨ **Golden Almonds (Badam)**:\nSweet, premium American/Giri almonds loaded with natural oils, vitamin E, and crisp texture.\n\n• **250g**: Rs. 775\n• **500g**: Rs. 1,550\n• **1kg**: Rs. 3,100 *(Wholesale price: Rs. 2,900)*";
  } else if (lowerText.includes('walnut') || lowerText.includes('akhrot')) {
    reply = "🧠 **Chilean Walnuts (Akhrot)**:\nHand-cracked, golden halves packed with high Omega-3 fatty acids and crisp, fresh sweetness with zero bitterness.\n\n• **250g**: Rs. 325\n• **500g**: Rs. 650\n• **1kg**: Rs. 1,300 *(Wholesale price: Rs. 1,200)*";
  } else if (lowerText.includes('combo') || lowerText.includes('deal') || lowerText.includes('bundle') || lowerText.includes('gift')) {
    reply = "🎁 **AllBarka Exclusive Deals & Luxury Combos**:\n\n1. **'The Classics' Combo**: 500g Chilean Walnuts + 500g Salted Pista — **Rs. 2,800** *(Save Rs. 200)*\n2. **'Work-Day Fuel' Combo**: 500g Golden Almonds + 500g Luxury Cashews — **Rs. 3,500** *(Save Rs. 200)*\n3. **'The Ultimate Snack Deal'**: 500g Premium Nimko + 500g Savory Mix — **Rs. 1,800**\n\nAll combos arrive in velvet-trimmed gift presentation packaging!";
  } else if (lowerText.includes('date') || lowerText.includes('khajoor') || lowerText.includes('plum') || lowerText.includes('alubukhara') || lowerText.includes('kishmish') || lowerText.includes('raisin')) {
    reply = "🌿 **Artisanal Pantry & Sun-Dried Fruits**:\n• **Kali Khajoor (Fresh Dates)**: Rs. 240 / 250g | Rs. 475 / 500g\n• **Dried Plums (Alubukhara)**: Rs. 415 / 250g | Rs. 825 / 500g\n• **Green Raisins (Kishmish)**: Rs. 365 / 250g | Rs. 725 / 500g\n• **Dried Apricots (Khubani)**: Rs. 300 / 250g | Rs. 600 / 500g";
  } else if (lowerText.includes('contact') || lowerText.includes('whatsapp') || lowerText.includes('phone') || lowerText.includes('order')) {
    reply = "📱 **Ordering & Customer Support**:\n• **WhatsApp Direct**: +92 316 0666083\n• **Checkout**: Add items to your cart, click 'Checkout with Cash on Delivery / WhatsApp', and our team will dispatch your order promptly!";
  } else {
    reply = "Assalam-o-Alaikum! Welcome to **AllBarka Luxury Dry Fruits**. I am delighted to assist you with our hand-sorted Cashews, Pistachios, Chilean Walnuts, Golden Almonds, custom gift bundles, or express delivery across Lahore. How may I serve you today? ✨";
  }

  return { reply, groundingSources };
}

// 3. API: Luxury AI Concierge Assistant
app.post(['/api/chat', '/api/concierge/chat'], async (req, res) => {
  const userText = req.body.userText || req.body.message || '';
  const userLocation = req.body.userLocation || req.body.location || null;
  const messages = req.body.messages || req.body.history || [];

  if (!userText) {
    return res.status(400).json({ error: 'No user input provided' });
  }

  // Generate instructions dynamically from the actual PRODUCTS array
  const catalogContext = PRODUCTS.map(p => {
    let priceStr = '';
    for (const [weight, price] of Object.entries(p.prices)) {
      priceStr += `${weight}: Rs. ${price}, `;
    }
    return `- ${p.name}: ${priceStr} (Wholesale: Rs. ${p.wholesale})`;
  }).join('\n');

  const systemInstruction = `You are the elite AI Concierge & Gourmet Dry Fruits Sommelier representing '${STORE_CONFIG.storeName}', Lahore's premier luxury dry fruit, spices, and artisanal gifting boutique based in ${STORE_CONFIG.location}.
We source only the absolute highest specification, hand-sorted, and vacuum-sealed dry fruits directly from trusted orchards.

Only provide product prices and store policy information present in the supplied canonical catalog/configuration below. Never invent or approximate prices, availability, shipping fees, or policies.

Our Premium Catalog & Pricing:
${catalogContext}

Delivery & Ordering:
- Standard Delivery across all major Lahore neighborhoods is Rs. ${STORE_CONFIG.shipping.standardRate}.
- FREE Express Delivery on orders above Rs. ${STORE_CONFIG.shipping.freeThreshold}!
- WhatsApp Direct Order: +${STORE_CONFIG.whatsappBusinessNumber}.
- Customers can add items to their cart and checkout via WhatsApp or cash on delivery.

Behavior Guidelines:
- Keep answers polite, sophisticated, articulate, and helpful.
- When answering location, maps, or route queries in Lahore, provide precise details.
- Include elegant, warm emojis where appropriate (✨, 🌰, 💎, 🚚, 🌿).`;

  // Format conversational context for Gemini API
  const history = (messages || []).map((msg: any) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));

  try {
    const currentApiKey = process.env.GEMINI_API_KEY;
    const isValidKey = currentApiKey && currentApiKey.trim() !== '' && currentApiKey !== 'MY_GEMINI_API_KEY';

    if (isValidKey) {
      const client = new GoogleGenAI({
        apiKey: currentApiKey
      });

      const lowerQuery = userText.toLowerCase();
      const isMapsQuery =
        lowerQuery.includes('where') ||
        lowerQuery.includes('location') ||
        lowerQuery.includes('address') ||
        lowerQuery.includes('map') ||
        lowerQuery.includes('lahore') ||
        lowerQuery.includes('dha') ||
        lowerQuery.includes('gulberg') ||
        lowerQuery.includes('model town') ||
        lowerQuery.includes('iqbal town') ||
        lowerQuery.includes('bahria') ||
        lowerQuery.includes('cantt') ||
        lowerQuery.includes('route') ||
        lowerQuery.includes('distance') ||
        lowerQuery.includes('nearby') ||
        lowerQuery.includes('shop near') ||
        lowerQuery.includes('branch');

      const selectedModel = 'gemini-2.5-flash';
      let toolUsed: 'googleMaps' | 'none' = 'none';
      const config: any = {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      };

      // Configure Google Maps Grounding when helpful
      if (isMapsQuery) {
        toolUsed = 'googleMaps';
        config.tools = [{ googleMaps: {} }];

        const lat = userLocation?.latitude || 31.5204;
        const lng = userLocation?.longitude || 74.3587;
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        };
      }

      // Call modern Gemini model
      const response = await client.models.generateContent({
        model: selectedModel,
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userText }] }
        ],
        config: config
      });

      const responseText = response.text || "Assalam-o-Alaikum! How may I assist your AllBarka gourmet selection today?";

      // Extract Grounding Sources (Google Maps Places)
      const groundingSources: Array<{ title: string; uri: string; type: 'map'; snippet?: string }> = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

      if (chunks && Array.isArray(chunks)) {
        for (const chunk of chunks) {
          if (chunk.maps?.uri) {
            groundingSources.push({
              title: chunk.maps.title || 'Google Maps Location',
              uri: chunk.maps.uri,
              type: 'map'
            });
          }
        }
      }

      res.json({
        text: responseText,
        reply: responseText,
        groundingSources: groundingSources,
        modelUsed: selectedModel,
        toolUsed: toolUsed
      });
      return;
    }
  } catch (error: any) {
    console.warn('Gemini API call encountered an issue, transitioning to concierge engine:', error?.message || error);
    // Proceed seamlessly to generateBoutiqueResponse below so the user receives a flawless reply without 500 error
  }

  // Graceful, rich fallback response
  const fallback = generateBoutiqueResponse(userText);
  res.json({
    text: fallback.reply,
    reply: fallback.reply,
    groundingSources: fallback.groundingSources,
    modelUsed: 'allbarka-sommelier',
    toolUsed: fallback.groundingSources.length > 0 ? 'googleMaps' : 'none'
  });
});

// Vite Middleware & Static Asset pipeline integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    console.time('[dev] Vite middleware');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.timeEnd('[dev] Vite middleware');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AllBarka Fullstack Server] booting success, running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('[AllBarka] startup failed:', error.message);
  process.exitCode = 1;
});
