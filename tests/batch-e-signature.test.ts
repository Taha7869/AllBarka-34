import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { memoryFirestore } from './helpers/memoryFirestore';
import { createGiftRevealRouter } from '../src/lib/giftRevealRouter';
import { getReorderItems } from '../src/lib/orderPresentation';
import { PRODUCTS } from '../src/data/products';

test('M14: Gift Reveal API creates token, hides all prices/PII, and supports safe recipient unboxing', async () => {
  const { db } = memoryFirestore();
  const app = express();
  app.use(express.json());
  app.use(createGiftRevealRouter({ getDb: () => db }));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;

  try {
    // 1. Missing or invalid payload rejected
    const badRes = await fetch(`${origin}/api/gift-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientName: '' }),
    });
    assert.equal(badRes.status, 400);

    // 2. Successful creation with prices stripped
    const createRes = await fetch(`${origin}/api/gift-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderName: 'Farhan & Family',
        recipientName: 'Dr. Tariq',
        giftMessage: 'Warmest Eid greetings to you and yours.',
        items: [
          {
            productId: 'pista',
            name: 'Roasted Pistachios',
            weight: '500g',
            quantity: 2,
            price: 4500, // Stored order price - MUST be stripped
            customerEmail: 'buyer@secret.com', // MUST be stripped
          },
        ],
      }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.ok, true);
    assert.match(created.token, /^[a-f0-9]{32}$/);
    assert.equal(created.revealUrl, `/reveal/${created.token}`);

    // 3. Recipient retrieves reveal presentation
    const lookupRes = await fetch(`${origin}/api/gift-reveal/${created.token}`);
    assert.equal(lookupRes.status, 200);
    assert.equal(lookupRes.headers.get('cache-control'), 'no-store, max-age=0');
    assert.equal(lookupRes.headers.get('x-robots-tag'), 'noindex, nofollow');

    const revealData = await lookupRes.json();
    assert.equal(revealData.senderName, 'Farhan & Family');
    assert.equal(revealData.recipientName, 'Dr. Tariq');
    assert.equal(revealData.giftMessage, 'Warmest Eid greetings to you and yours.');
    assert.equal(revealData.items.length, 1);
    assert.equal(revealData.items[0].productId, 'pista');
    assert.equal(revealData.items[0].weight, '500g');
    assert.equal(revealData.items[0].quantity, 2);

    // CRITICAL: Ensure NO pricing, payment, or PII exposed to recipient
    assert.equal('price' in revealData.items[0], false);
    assert.equal('customerEmail' in revealData.items[0], false);
    assert.equal('total' in revealData, false);
    assert.equal('subtotal' in revealData, false);

    // 4. Invalid token returns 404
    const notFoundRes = await fetch(`${origin}/api/gift-reveal/ffffffffffffffffffffffffffffffff`);
    assert.equal(notFoundRes.status, 404);

    // 5. Expired token returns 410
    const expiredToken = '0123456789abcdef0123456789abcdef';
    await db.collection('giftReveals').doc(expiredToken).set({
      token: expiredToken,
      senderName: 'Past Sender',
      recipientName: 'Past Recipient',
      giftMessage: 'Expired message',
      items: [],
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      createdAt: new Date(Date.now() - 31 * 86400000).toISOString(),
    });

    const expiredRes = await fetch(`${origin}/api/gift-reveal/${expiredToken}`);
    assert.equal(expiredRes.status, 410);
  } finally {
    server.close();
  }
});

test('M29: Patron reorder parses past items and verifies current catalog availability', () => {
  const pastItems = [
    {
      id: 'pista-500g',
      productId: 'pista',
      selectedWeight: '500g',
      quantity: 2,
    },
    {
      id: 'kaju-500g',
      productId: 'kaju',
      selectedWeight: '500g',
      quantity: 1,
    },
  ];

  const reorderPayload = getReorderItems(pastItems, PRODUCTS);
  assert.equal(reorderPayload.length, 2);
  assert.equal(reorderPayload[0].product.id, 'pista');
  assert.equal(reorderPayload[0].weight, '500g');
  assert.equal(reorderPayload[0].quantity, 2);
  // Reorder payload maps to actual live catalog product definition
  assert.ok(reorderPayload[0].product.prices['500g'] > 0);
});
