import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { memoryFirestore } from './helpers/memoryFirestore';
import { createGiftRevealRouter, hashRevealToken } from '../src/lib/giftRevealRouter';
import { reviewReorderItems, getReorderItems } from '../src/lib/orderPresentation';
import { PRODUCTS } from '../src/data/products';
import type { Product } from '../src/types';

test('M14: Gift Reveal API requires authentication, derives from saved order, secures tokens, and supports revocation', async () => {
  const { db } = memoryFirestore();
  const app = express();
  app.use(express.json());

  // Mock authenticated user middleware for testing
  let currentUser: any = null;
  const mockAuth: express.RequestHandler = (req, res, next) => {
    if (!currentUser) {
      return res.status(401).json({ code: 'AUTHENTICATION_REQUIRED', error: 'Authentication required.' });
    }
    (req as any).user = currentUser;
    next();
  };

  app.use(createGiftRevealRouter({ getDb: () => db, requireAuth: mockAuth }));

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

    // 2. Non-owner / unauthorized creation rejected with 403
    currentUser = { uid: 'stranger-user-999', role: 'customer' };
    const forbiddenRes = await fetch(`${origin}/api/gift-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    assert.equal(forbiddenRes.status, 403);

    // 3. Authorized owner creation succeeds with 201
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

    // 4. Public recipient retrieves reveal presentation (No authentication required)
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

    // 5. Authenticated revocation
    currentUser = { uid: 'patron-owner-123', role: 'customer' };
    const revokeRes = await fetch(`${origin}/api/gift-reveal/${created.token}/revoke`, {
      method: 'POST',
    });
    assert.equal(revokeRes.status, 200);
    const revokeData = await revokeRes.json();
    assert.equal(revokeData.ok, true);
    assert.equal(revokeData.revoked, true);

    // 6. Post-revocation recipient lookup fails closed with 410
    const revokedLookupRes = await fetch(`${origin}/api/gift-reveal/${created.token}`);
    assert.equal(revokedLookupRes.status, 410);
    const revokedData = await revokedLookupRes.json();
    assert.equal(revokedData.code, 'REVEAL_REVOKED');

    // 7. Expired token returns 410
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

    // 8. Missing / invalid token returns 404
    const notFoundRes = await fetch(`${origin}/api/gift-reveal/ffffffffffffffffffffffffffffffff`);
    assert.equal(notFoundRes.status, 404);
  } finally {
    server.close();
  }
});

test('M29: Patron reorder parses past items, verifies live catalog availability, and detects price changes', () => {
  const mockCatalog: Product[] = [
    {
      id: 'pista',
      name_en: 'Roasted Pistachios',
      category: 'nuts',
      active: true,
      prices: { '500g': 4800, '250g': 2500 }, // Price changed from past 4500
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
  ];

  const pastItems = [
    {
      id: 'pista-500g',
      productId: 'pista',
      selectedWeight: '500g',
      quantity: 2,
      price: 4500, // Was 4500, current is 4800
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
  ];

  const review = reviewReorderItems(pastItems, mockCatalog);
  assert.equal(review.reorderable.length, 2);
  assert.equal(review.unavailable.length, 1);
  assert.equal(review.unavailable[0].productId, 'discontinued-snack');
  assert.equal(review.unavailable[0].reason, 'inactive');

  assert.equal(review.hasPriceChanges, true);
  assert.equal(review.reorderable[0].productId, 'pista');
  assert.equal(review.reorderable[0].priceChanged, true);
  assert.equal(review.reorderable[0].currentUnitPrice, 4800);
  assert.equal(review.reorderable[0].originalUnitPrice, 4500);

  assert.equal(review.reorderable[1].productId, 'kaju');
  assert.equal(review.reorderable[1].priceChanged, false);

  // Backward-compatible getReorderItems returns available items
  const reorderPayload = getReorderItems(pastItems, mockCatalog);
  assert.equal(reorderPayload.length, 2);
  assert.equal(reorderPayload[0].product.id, 'pista');
  assert.equal(reorderPayload[0].weight, '500g');
  assert.equal(reorderPayload[0].quantity, 2);
});
