import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { memoryFirestore } from './helpers/memoryFirestore';
import { createGiftRevealRouter, hashRevealToken } from '../src/lib/giftRevealRouter';
import { reviewReorderItems, getReorderItems, resolveReorderProduct, revalidateReorderWithServerQuote } from '../src/lib/orderPresentation';
import { requireCurrentAdministrator } from '../src/lib/adminAuthentication';
import { calculateMehmaanPlan, resolveBestPortion } from '../src/lib/mehmaanPlanner';
import { shoppingQualityTranslations } from '../src/contexts/shoppingQualityTranslations';
import type { Product } from '../src/types';

test('P0 & M14: Gift Reveal API enforces current authority, derives from saved order, secures tokens, and supports revocation', async () => {
  const { db } = memoryFirestore();
  const app = express();
  app.use(express.json());

  // Mock authoritative accounts in Auth service
  const authAccounts = new Map<string, any>([
    ['admin-1', { uid: 'admin-1', disabled: false, customClaims: { admin: true } }],
    ['demoted-1', { uid: 'demoted-1', disabled: false, customClaims: { admin: false } }],
    ['disabled-admin', { uid: 'disabled-admin', disabled: true, customClaims: { admin: true } }],
    ['patron-owner-123', { uid: 'patron-owner-123', disabled: false, customClaims: {} }],
    ['stranger-user-999', { uid: 'stranger-user-999', disabled: false, customClaims: {} }],
  ]);

  let authFailMode = false;
  const mockAuthService = {
    getUser: async (uid: string) => {
      if (authFailMode) throw new Error('AUTH_PROVIDER_UNAVAILABLE');
      const account = authAccounts.get(uid);
      if (!account) {
        const err: any = new Error('User not found');
        err.code = 'auth/user-not-found';
        throw err;
      }
      return account;
    },
  };

  // Mock authenticated user middleware for testing
  let currentUser: any = null;
  const mockAuth: express.RequestHandler = (req, res, next) => {
    if (!currentUser) {
      return res.status(401).json({ code: 'AUTHENTICATION_REQUIRED', error: 'Authentication required.' });
    }
    (req as any).user = currentUser;
    next();
  };

  const currentAdministrator = requireCurrentAdministrator(() => mockAuthService);
  app.use(createGiftRevealRouter({
    getDb: () => db,
    getAuth: () => mockAuthService,
    requireAuth: mockAuth,
    requireAdmin: currentAdministrator,
  }));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;

  try {
    // Seed an authoritative order in the memory database
    const orderId = 'AB-20261102-GIFT01';
    await db.collection('orders').doc(orderId).set({
      orderId,
      uid: 'patron-owner-123',
      customer: {
        name: 'Begum Salma Qureshi',
        phone: '03001234567',
        email: 'salma@secret.com',
      },
      gifting: {
        recipientName: 'Dr. Tariq & Family',
        giftMessage: 'Warmest Eid greetings to you and yours.',
      },
      items: [
        {
          id: 'pista-500g',
          productId: 'pista',
          name: 'Roasted Pistachios (Salted)',
          selectedWeight: '500g',
          quantity: 2,
          price: 4500, // Stored order price - MUST be stripped
          unitPrice: 4500,
        },
      ],
      totals: {
        subtotal: 9000,
        total: 9000,
      },
    });

    // 1. Anonymous creation rejected with 401
    currentUser = null;
    const anonRes = await fetch(`${origin}/api/gift-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    assert.equal(anonRes.status, 401);

    // 2. Stranger (non-owner without admin authority) rejected with 403
    currentUser = { uid: 'stranger-user-999', role: 'customer' };
    const forbiddenRes = await fetch(`${origin}/api/gift-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    assert.equal(forbiddenRes.status, 403);

    // 3. Demoted admin (token has cached admin:true, but auth service shows no admin claim) rejected with 403
    currentUser = { uid: 'demoted-1', admin: true, role: 'admin' };
    const demotedRes = await fetch(`${origin}/api/gift-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    assert.equal(demotedRes.status, 403);
    const demotedData = await demotedRes.json();
    assert.equal(demotedData.code, 'FORBIDDEN_ADMIN');

    // 4. Disabled admin account rejected with 403
    currentUser = { uid: 'disabled-admin', admin: true, role: 'admin' };
    const disabledRes = await fetch(`${origin}/api/gift-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    assert.equal(disabledRes.status, 403);

    // 5. Authority service failure fails closed with 503
    authFailMode = true;
    currentUser = { uid: 'admin-1', admin: true, role: 'admin' };
    const serviceFailRes = await fetch(`${origin}/api/gift-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    assert.equal(serviceFailRes.status, 503);
    const serviceFailData = await serviceFailRes.json();
    assert.equal(serviceFailData.code, 'AUTH_SERVICE_UNAVAILABLE');
    authFailMode = false;

    // 6. Current verified admin succeeds with 201 for another customer's order
    currentUser = { uid: 'admin-1', admin: true, role: 'admin' };
    const adminCreateRes = await fetch(`${origin}/api/gift-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    assert.equal(adminCreateRes.status, 201);
    const adminCreated = await adminCreateRes.json();
    assert.equal(adminCreated.ok, true);

    // 7. Authorized legitimate order owner succeeds with 201
    currentUser = { uid: 'patron-owner-123', role: 'customer' };
    const createRes = await fetch(`${origin}/api/gift-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.ok, true);
    assert.match(created.token, /^[a-f0-9]{32}$/);
    assert.equal(created.revealUrl, `/reveal/${created.token}`);

    // Verify token was stored hashed (raw token NEVER used as doc id)
    const tokenHash = hashRevealToken(created.token);
    const rawDoc = await db.collection('giftReveals').doc(created.token).get();
    assert.equal(rawDoc.exists, false, 'Raw token must never be used as document id');
    const hashedDoc = await db.collection('giftReveals').doc(tokenHash).get();
    assert.equal(hashedDoc.exists, true, 'Token hash must be document id');

    // 8. Public recipient retrieves reveal presentation (No authentication required)
    const lookupRes = await fetch(`${origin}/api/gift-reveal/${created.token}`);
    assert.equal(lookupRes.status, 200);
    assert.equal(lookupRes.headers.get('cache-control'), 'no-store, max-age=0');
    assert.equal(lookupRes.headers.get('x-robots-tag'), 'noindex, nofollow');

    const revealData = await lookupRes.json();
    assert.equal(revealData.senderName, 'Begum Salma Qureshi');
    assert.equal(revealData.recipientName, 'Dr. Tariq & Family');
    assert.equal(revealData.giftMessage, 'Warmest Eid greetings to you and yours.');
    assert.equal(revealData.items.length, 1);
    assert.equal(revealData.items[0].productId, 'pista');
    assert.equal(revealData.items[0].weight, '500g');
    assert.equal(revealData.items[0].quantity, 2);

    // CRITICAL PRIVACY: Ensure NO pricing, payment, or purchaser PII is exposed to recipient
    assert.equal('price' in revealData.items[0], false);
    assert.equal('unitPrice' in revealData.items[0], false);
    assert.equal('customer' in revealData, false);
    assert.equal('customerEmail' in revealData, false);
    assert.equal('phone' in revealData, false);
    assert.equal('subtotal' in revealData, false);
    assert.equal('total' in revealData, false);
    assert.equal('orderId' in revealData, false);

    // 9. Demoted admin cannot revoke reveal link
    currentUser = { uid: 'demoted-1', admin: true, role: 'admin' };
    const demotedRevokeRes = await fetch(`${origin}/api/gift-reveal/${created.token}/revoke`, {
      method: 'POST',
    });
    assert.equal(demotedRevokeRes.status, 403);

    // 10. Authenticated owner revocation succeeds
    currentUser = { uid: 'patron-owner-123', role: 'customer' };
    const revokeRes = await fetch(`${origin}/api/gift-reveal/${created.token}/revoke`, {
      method: 'POST',
    });
    assert.equal(revokeRes.status, 200);
    const revokeData = await revokeRes.json();
    assert.equal(revokeData.ok, true);
    assert.equal(revokeData.revoked, true);

    // 11. Post-revocation recipient lookup fails closed with 410
    const revokedLookupRes = await fetch(`${origin}/api/gift-reveal/${created.token}`);
    assert.equal(revokedLookupRes.status, 410);
    const revokedData = await revokedLookupRes.json();
    assert.equal(revokedData.code, 'REVEAL_REVOKED');

    // 12. Expired token returns 410
    const expiredToken = '0123456789abcdef0123456789abcdef';
    const expiredHash = hashRevealToken(expiredToken);
    await db.collection('giftReveals').doc(expiredHash).set({
      tokenHash: expiredHash,
      orderId: 'AB-EXPIRED',
      creatorUid: 'patron-owner-123',
      senderName: 'Past Sender',
      recipientName: 'Past Recipient',
      giftMessage: 'Expired message',
      items: [],
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      createdAt: new Date(Date.now() - 31 * 86400000).toISOString(),
      revoked: false,
    });

    const expiredRes = await fetch(`${origin}/api/gift-reveal/${expiredToken}`);
    assert.equal(expiredRes.status, 410);
    const expiredData = await expiredRes.json();
    assert.equal(expiredData.code, 'REVEAL_EXPIRED');

    // 13. Missing / invalid token returns 404
    const notFoundRes = await fetch(`${origin}/api/gift-reveal/ffffffffffffffffffffffffffffffff`);
    assert.equal(notFoundRes.status, 404);
  } finally {
    server.close();
  }
});

test('P0 & M14: Gift Reveal API with delayed asynchronous authority lookup handles production composition, preserves owner access, and prevents premature writes', async () => {
  const { db } = memoryFirestore();
  const app = express();
  app.use(express.json());

  const authAccounts = new Map<string, any>([
    ['admin-current', { uid: 'admin-current', disabled: false, customClaims: { admin: true } }],
    ['admin-demoted', { uid: 'admin-demoted', disabled: false, customClaims: { admin: false } }],
    ['admin-disabled', { uid: 'admin-disabled', disabled: true, customClaims: { admin: true } }],
    ['owner-customer', { uid: 'owner-customer', disabled: false, customClaims: {} }],
  ]);

  let providerFailing = false;
  const delayedAuthService = {
    getUser: async (uid: string) => {
      // Genuine event-loop tick asynchrony without arbitrary setTimeout sleep
      await Promise.resolve();
      await new Promise(resolve => setImmediate(resolve));
      if (providerFailing) throw new Error('FIRESTORE_OR_AUTH_OUTAGE');
      const account = authAccounts.get(uid);
      if (!account) {
        const err: any = new Error('not found');
        err.code = 'auth/user-not-found';
        throw err;
      }
      return account;
    },
  };

  let currentUser: any = null;
  const mockAuth: express.RequestHandler = (req, res, next) => {
    if (!currentUser) {
      return res.status(401).json({ code: 'AUTHENTICATION_REQUIRED' });
    }
    (req as any).user = currentUser;
    next();
  };

  const currentAdministrator = requireCurrentAdministrator(() => delayedAuthService);
  // Production-equivalent middleware composition where requireAdmin returns before currentAdministrator completes
  const productionRequireAdmin: express.RequestHandler = async (req, res, next) => {
    await mockAuth(req, res, () => {
      void currentAdministrator(req, res, next);
    });
  };

  app.use(createGiftRevealRouter({
    getDb: () => db,
    getAuth: () => delayedAuthService,
    requireAuth: mockAuth,
    requireAdmin: productionRequireAdmin,
  }));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;

  try {
    const orderId = 'AB-20261102-DELAYED-AUTH';
    await db.collection('orders').doc(orderId).set({
      orderId,
      uid: 'owner-customer',
      customer: { name: 'Owner Patron' },
      items: [{ productId: 'pista', name: 'Pistachios', selectedWeight: '250g', quantity: 1, price: 1250 }],
    });

    const getDbCount = async () => (await db.collection('giftReveals').get()).docs.length;
    assert.equal(await getDbCount(), 0, 'No records before tests begin');

    // 1. Demoted admin denied with 403, zero writes occur
    currentUser = { uid: 'admin-demoted', admin: true, role: 'admin' };
    const demotedRes = await fetch(`${origin}/api/gift-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    assert.equal(demotedRes.status, 403);
    assert.equal(await getDbCount(), 0, 'No writes occur before authorization succeeds');

    // 2. Disabled admin denied with 403, zero writes occur
    currentUser = { uid: 'admin-disabled', admin: true, role: 'admin' };
    const disabledRes = await fetch(`${origin}/api/gift-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    assert.equal(disabledRes.status, 403);
    assert.equal(await getDbCount(), 0, 'No writes occur for disabled admin');

    // 3. Provider failure fails closed with 503, zero writes occur
    providerFailing = true;
    currentUser = { uid: 'admin-current', admin: true, role: 'admin' };
    const providerFailRes = await fetch(`${origin}/api/gift-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    assert.equal(providerFailRes.status, 503);
    assert.equal(await getDbCount(), 0, 'No writes occur on provider failure');
    providerFailing = false;

    // 4. Valid current admin succeeds with 201 for another customer's order despite delayed lookup
    currentUser = { uid: 'admin-current', admin: true, role: 'admin' };
    const adminCreateRes = await fetch(`${origin}/api/gift-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, senderName: 'Corporate Admin' }),
    });
    assert.equal(adminCreateRes.status, 201);
    const adminCreateJson = await adminCreateRes.json();
    assert.equal(adminCreateJson.ok, true);
    assert.equal(await getDbCount(), 1, 'Exactly one record written on successful admin authorization');

    // 5. Demoted admin denied revoking reveal with 403
    currentUser = { uid: 'admin-demoted', admin: true, role: 'admin' };
    const demotedRevokeRes = await fetch(`${origin}/api/gift-reveal/${adminCreateJson.token}/revoke`, {
      method: 'POST',
    });
    assert.equal(demotedRevokeRes.status, 403);
    const tokenHash = hashRevealToken(adminCreateJson.token);
    const docAfterFailedRevoke = (await db.collection('giftReveals').doc(tokenHash).get()).data();
    assert.equal(docAfterFailedRevoke.revoked, false, 'Revocation flag must not change on denied attempt');

    // 6. Valid current admin revokes reveal link with 200
    currentUser = { uid: 'admin-current', admin: true, role: 'admin' };
    const adminRevokeRes = await fetch(`${origin}/api/gift-reveal/${adminCreateJson.token}/revoke`, {
      method: 'POST',
    });
    assert.equal(adminRevokeRes.status, 200);
    const docAfterSuccessRevoke = (await db.collection('giftReveals').doc(tokenHash).get()).data();
    assert.equal(docAfterSuccessRevoke.revoked, true, 'Revocation flag is updated');
    assert.equal(docAfterSuccessRevoke.revokedBy, 'admin-current');

    // 7. Legitimate order owner succeeds with 201 directly without admin checks
    currentUser = { uid: 'owner-customer', role: 'customer' };
    const ownerCreateRes = await fetch(`${origin}/api/gift-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, recipientName: 'Family Friend' }),
    });
    assert.equal(ownerCreateRes.status, 201);
    const ownerCreateJson = await ownerCreateRes.json();
    assert.equal(ownerCreateJson.ok, true);
    assert.equal(await getDbCount(), 2, 'Owner successfully creates reveal link');
  } finally {
    server.close();
  }
});

test('M29: Patron reorder resolves prefix collisions, parses past items, verifies live catalog availability, and detects price changes', () => {
  const mockCatalog: Product[] = [
    {
      id: 'gift',
      name_en: 'Standard Gift Potli',
      category: 'nuts',
      active: true,
      prices: { '250g': 1200 },
    } as any,
    {
      id: 'gift-box',
      name_en: 'Luxury Gift Box Chest',
      category: 'nuts',
      active: true,
      prices: { '250g': 2500, '500g': 4500 },
    } as any,
    {
      id: 'pista',
      name_en: 'Roasted Pistachios',
      category: 'nuts',
      active: true,
      prices: { '500g': 4800, '250g': 2500 }, // Price changed from past 4500
      variants: [{ label: '500g', available: true }, { label: '250g', available: true }, { label: '1kg', available: false }],
    } as any,
    {
      id: 'kaju',
      name_en: 'Premium Cashews',
      category: 'nuts',
      active: true,
      prices: { '500g': 3800 },
    } as any,
    {
      id: 'discontinued-snack',
      name_en: 'Discontinued Snack',
      category: 'nuts',
      active: false,
      prices: { '250g': 1000 },
    } as any,
    {
      id: 'draft-item',
      name_en: 'Draft Unpublished Item',
      category: 'nuts',
      status: 'draft',
      active: true,
      prices: { '250g': 1500 },
    } as any,
  ];

  // 1. Prefix collision test: 'gift-box' vs 'gift'
  const resolvedBox = resolveReorderProduct({ id: 'gift-box-250g' }, mockCatalog);
  assert.equal(resolvedBox.product?.id, 'gift-box', 'Prefix collision must resolve to exact longer product ID, not "gift"');
  assert.equal(resolvedBox.weight, '250g');

  const resolvedGift = resolveReorderProduct({ id: 'gift-250g' }, mockCatalog);
  assert.equal(resolvedGift.product?.id, 'gift');

  // Exact productId match takes highest priority
  const exactResolved = resolveReorderProduct({ productId: 'gift-box', id: 'arbitrary-key', selectedWeight: '500g' }, mockCatalog);
  assert.equal(exactResolved.product?.id, 'gift-box');
  assert.equal(exactResolved.weight, '500g');

  // 2. Multi-item past order analysis
  const pastItems = [
    {
      id: 'pista-500g',
      productId: 'pista',
      selectedWeight: '500g',
      quantity: 2,
      price: 4500, // Was 4500, current is 4800
    },
    {
      id: 'pista-1kg',
      productId: 'pista',
      selectedWeight: '1kg', // Variant marked available: false
      quantity: 1,
      price: 9000,
    },
    {
      id: 'kaju-500g',
      productId: 'kaju',
      selectedWeight: '500g',
      quantity: 1,
      price: 3800,
    },
    {
      id: 'discontinued-snack-250g',
      productId: 'discontinued-snack',
      selectedWeight: '250g',
      quantity: 1,
      price: 1000,
    },
    {
      id: 'draft-item-250g',
      productId: 'draft-item',
      selectedWeight: '250g',
      quantity: 1,
      price: 1500,
    },
  ];

  const review = reviewReorderItems(pastItems, mockCatalog);
  assert.equal(review.reorderable.length, 2);
  assert.equal(review.unavailable.length, 3);

  // Unavailable reasons properly categorized
  const unavail1kg = review.unavailable.find(u => u.weight === '1kg');
  assert.equal(unavail1kg?.reason, 'variant_unavailable');

  const unavailDisc = review.unavailable.find(u => u.productId === 'discontinued-snack');
  assert.equal(unavailDisc?.reason, 'inactive');

  const unavailDraft = review.unavailable.find(u => u.productId === 'draft-item');
  assert.equal(unavailDraft?.reason, 'inactive');

  // Price changes detected
  assert.equal(review.hasPriceChanges, true);
  assert.equal(review.reorderable[0].productId, 'pista');
  assert.equal(review.reorderable[0].priceChanged, true);
  assert.equal(review.reorderable[0].currentUnitPrice, 4800);
  assert.equal(review.reorderable[0].originalUnitPrice, 4500);

  // Unchanged price
  assert.equal(review.reorderable[1].productId, 'kaju');
  assert.equal(review.reorderable[1].priceChanged, false);

  // Backward-compatible getReorderItems returns reorderable items
  const reorderPayload = getReorderItems(pastItems, mockCatalog);
  assert.equal(reorderPayload.length, 2);
  assert.equal(reorderPayload[0].product.id, 'pista');
  assert.equal(reorderPayload[0].weight, '500g');
  assert.equal(reorderPayload[0].quantity, 2);
});

test('M29: Reorder revalidation with canonical server quote detects price changes, quote requirements, product unavailabilities, and requires renewed review', async () => {
  const mockProducts: Product[] = [
    {
      id: 'pista',
      name_en: 'Roasted Pistachios',
      category: 'nuts',
      active: true,
      prices: { '500g': 4500 },
      variants: [{ label: '500g', available: true }],
    } as any,
  ];

  const pastItems = [
    { id: 'pista-500g', productId: 'pista', selectedWeight: '500g', quantity: 2, price: 4000 },
  ];

  const initialAnalysis = reviewReorderItems(pastItems, mockProducts);
  assert.equal(initialAnalysis.reorderable.length, 1);
  assert.equal(initialAnalysis.estimatedSubtotal, 9000);

  // 1. Server quote returns updated prices (e.g. price increased to 5000 on server)
  const mockFetchSuccess: any = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      totals: { subtotal: 10000, isQuoteRequest: false },
      items: [{ productId: 'pista', selectedWeight: '500g', price: 5000, quantity: 2 }],
    }),
  });

  const revalidatedSuccess = await revalidateReorderWithServerQuote(initialAnalysis, { fetchFn: mockFetchSuccess });
  assert.equal(revalidatedSuccess.serverValidated, true);
  assert.equal(revalidatedSuccess.estimatedSubtotal, 10000);
  assert.equal(revalidatedSuccess.reorderable[0].currentUnitPrice, 5000);
  assert.equal(revalidatedSuccess.hasPriceChanges, true);
  assert.equal(revalidatedSuccess.requiresRenewedReview, true, 'Customer renewed review required when server rate changes');

  // 2. Server quote returns 400 QUOTE_REQUIRED
  const mockFetchQuoteReq: any = async () => ({
    ok: false,
    status: 400,
    json: async () => ({
      code: 'QUOTE_REQUIRED',
      error: 'Custom packaging requires personalized quote.',
    }),
  });

  const revalidatedQuoteReq = await revalidateReorderWithServerQuote(initialAnalysis, { fetchFn: mockFetchQuoteReq });
  assert.equal(revalidatedQuoteReq.serverValidated, true);
  assert.equal(revalidatedQuoteReq.isQuoteRequest, true);
  assert.equal(revalidatedQuoteReq.requiresRenewedReview, true);
  assert.ok(revalidatedQuoteReq.quoteRequiredNotice?.includes('Custom packaging requires personalized quote'));

  // 3. Server quote returns 400 PRODUCT_UNAVAILABLE
  const mockFetchUnavail: any = async () => ({
    ok: false,
    status: 400,
    json: async () => ({
      code: 'PRODUCT_UNAVAILABLE',
      error: 'Product "Roasted Pistachios" is currently out of harvest.',
    }),
  });

  const revalidatedUnavail = await revalidateReorderWithServerQuote(initialAnalysis, { fetchFn: mockFetchUnavail });
  assert.equal(revalidatedUnavail.serverValidated, true);
  assert.equal(revalidatedUnavail.hasUnavailableItems, true);
  assert.equal(revalidatedUnavail.requiresRenewedReview, true);
  assert.ok(revalidatedUnavail.serverNotice?.includes('out of harvest'));

  // 4. Server connection failure handles gracefully and avoids silent stale acceptance
  const mockFetchNetworkFail: any = async () => {
    throw new Error('NETWORK_TIMEOUT');
  };

  const revalidatedFail = await revalidateReorderWithServerQuote(initialAnalysis, { fetchFn: mockFetchNetworkFail });
  assert.equal(revalidatedFail.serverValidated, false);
  assert.ok(revalidatedFail.serverNotice?.includes('NETWORK_TIMEOUT'));
});

test('M12 & M26: Mehmaan planner respects custom assumptions, canonical eligibility, and honest packaging facts', () => {
  const mockProducts: Product[] = [
    {
      id: 'pista',
      name_en: 'Roasted Pistachios',
      category: 'nuts',
      active: true,
      prices: { '250g': 1200, '500g': 2200 },
      variants: [{ label: '250g', available: true }, { label: '500g', available: true }],
    } as any,
    {
      id: 'khajoor',
      name_en: 'Premium Dates',
      category: 'dates',
      active: true,
      prices: { '500g': 1500 },
      variants: [{ label: '500g', available: true }],
    } as any,
    {
      id: 'afghan-figs',
      name_en: 'Afghan Dried Figs',
      category: 'dry-fruits',
      active: true,
      prices: { '250g': 1400 },
      variants: [{ label: '250g', available: true }],
    } as any,
  ];

  // 1. Default boutique assumptions
  const defaultPlan = calculateMehmaanPlan(mockProducts, 10, 'dawat');
  assert.equal(defaultPlan.assumptionSource, 'Recommended boutique guidelines (editable)');
  assert.equal(defaultPlan.items.length, 3);

  // 2. Custom patron assumptions passed explicitly
  const customPlan = calculateMehmaanPlan(mockProducts, 10, 'dawat', {
    nutsGramsPerGuest: 50,
    datesGramsPerGuest: 0, // Zero assumption for dates
    driedFruitsGramsPerGuest: 30,
  });
  assert.equal(customPlan.assumptionSource, 'Custom patron configuration (editable)');
  assert.equal(customPlan.breakdown.nutsGrams, 500);
  assert.equal(customPlan.breakdown.datesGrams, 0);
  assert.equal(customPlan.breakdown.driedFruitsGrams, 300);

  // Zero dates means dates item is omitted
  assert.equal(customPlan.items.length, 2);
  assert.ok(customPlan.items.some(i => i.category === 'nuts'));
  assert.ok(customPlan.items.some(i => i.category === 'driedFruits'));
  assert.ok(!customPlan.items.some(i => i.category === 'dates'));

  // 3. Strict portion resolution rejecting unavailable variants and non-weight strings
  const resolvedStrict = resolveBestPortion(mockProducts[0], 200);
  assert.ok(resolvedStrict);
  assert.equal(resolvedStrict.weight, '250g');

  const nonWeightProduct = {
    ...mockProducts[0],
    prices: { 'Empty 1 pc': 200, 'Custom quote': 0 },
  };
  const resolvedNonWeight = resolveBestPortion(nonWeightProduct, 200);
  assert.equal(resolvedNonWeight, null, 'Non-weight variant labels must return null');

  // 4. M26 Shopping quality translations do not contain universal unverified claims
  const closedDescEn = shoppingQualityTranslations.en['pdp.closedDesc'];
  assert.ok(closedDescEn);
  assert.equal(closedDescEn.includes('magnetic closure'), false, 'pdp.closedDesc must not claim magnetic closure universally');
  assert.equal(closedDescEn.includes('gold foil'), false, 'pdp.closedDesc must not claim gold foil universally');

  const airtightEn = shoppingQualityTranslations.en['pdp.airtightSeal'];
  assert.ok(airtightEn);
  assert.equal(airtightEn.includes('nitrogen-flushed'), false, 'pdp.airtightSeal must not claim nitrogen flushed universally');

  const calligraphyEn = shoppingQualityTranslations.en['pdp.calligraphyEnvelope'];
  assert.ok(calligraphyEn);
  assert.equal(calligraphyEn.includes('wax seal'), false, 'pdp.calligraphyEnvelope must not claim wax seal universally');

  const sizeComparisonEn = shoppingQualityTranslations.en['pdp.sizeComparison'];
  assert.ok(sizeComparisonEn);
  assert.equal(sizeComparisonEn.includes('22×16×6'), false, 'pdp.sizeComparison must not claim fixed 22x16x6 cm universally');
});
