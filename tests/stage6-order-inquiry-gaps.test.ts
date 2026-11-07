import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { memoryFirestore } from './helpers/memoryFirestore';
import { PRODUCTS, BID_BOX_PRODUCTS } from '../src/data/products';
import { createDurableOrder, QuoteChangedError, IdempotencyConflictError } from '../src/lib/orderDatabase';
import { quoteOrderForCustomer } from '../src/lib/orderQuote';
import { validateAndPriceOrder, ValidationError } from '../src/lib/orderValidation';
import { getN8nOrderDispatchConfig, projectCanonicalOrderForN8n, sendOrderToN8n } from '../src/services/n8nOrderNotification';
import { invalidateCatalogCache } from '../src/lib/catalogStore';

const workflow = JSON.parse(readFileSync(new URL('../n8n/allbarka-website-integration.json', import.meta.url), 'utf8'));
const n8nConfig = getN8nOrderDispatchConfig({
  N8N_ORDER_WEBHOOK_URL: 'https://stage6-fixture.invalid/webhook/order',
  N8N_WEBHOOK_SECRET: 'stage6-local-gap-secret',
});

const defaultCustomer = {
  name: 'Ahmad Khan',
  phone: '03001234567',
  address: 'House 42, Street 5, Phase 5, DHA',
  city: 'Lahore',
  paymentMethod: 'cod',
  shippingMethodId: 'standard',
};

function initStore() {
  const initialDocs: Record<string, unknown> = {};
  for (const product of PRODUCTS) {
    initialDocs[`products/${product.id}`] = structuredClone(product);
  }
  const fixture = memoryFirestore(initialDocs);
  fixture.db.doc = (path: string) => {
    const [col, id] = path.split('/');
    return fixture.db.collection(col).doc(id);
  };
  return fixture;
}

async function executeDurableOrder(
  fixture: ReturnType<typeof initStore>,
  payload: any,
  idempotencyKey: string,
  expectedFinalTotal?: number
) {
  const prevEnv = [process.env.N8N_ORDER_WEBHOOK_URL, process.env.N8N_WEBHOOK_SECRET];
  try {
    process.env.N8N_ORDER_WEBHOOK_URL = n8nConfig.webhookUrl;
    process.env.N8N_WEBHOOK_SECRET = n8nConfig.webhookSecret;
    return await createDurableOrder({
      db: fixture.db,
      payload,
      uid: null,
      idempotencyKey,
      expectedFinalTotal,
    });
  } finally {
    if (prevEnv[0] === undefined) delete process.env.N8N_ORDER_WEBHOOK_URL;
    else process.env.N8N_ORDER_WEBHOOK_URL = prevEnv[0];
    if (prevEnv[1] === undefined) delete process.env.N8N_WEBHOOK_SECRET;
    else process.env.N8N_WEBHOOK_SECRET = prevEnv[1];
  }
}

test('Package B Gap 1: QuoteChangedError triggers when catalog price changes before checkout commit', async () => {
  const fixture = initStore();
  invalidateCatalogCache();

  const checkoutPayload = {
    ...defaultCustomer,
    items: [{ productId: 'pista', variantId: 'portion-250g', quantity: 1 }],
  };

  // 1. Customer gets initial quote for 250g pista
  const initialQuote = await quoteOrderForCustomer(fixture.db, checkoutPayload);
  const expectedTotal = initialQuote.totals.total;

  // 2. Before customer submits checkout, merchant updates pista price in Firestore
  const pistaDoc = fixture.records.get('products/pista') as any;
  pistaDoc.prices['250g'] = 1400; // was 1200
  invalidateCatalogCache();

  // 3. Submitting with stale expectedFinalTotal must fail closed with QuoteChangedError
  await assert.rejects(
    async () => {
      await executeDurableOrder(fixture, checkoutPayload, 'key-stale-quote-1', expectedTotal);
    },
    (err: any) => {
      assert.ok(err instanceof QuoteChangedError);
      assert.ok(err.totals.total > expectedTotal);
      assert.equal(err.items[0].price, 1400);
      return true;
    }
  );

  // 4. Verify no orphan order or outbox event was committed
  const orderDocs = [...fixture.records.keys()].filter(k => k.startsWith('orders/'));
  assert.equal(orderDocs.length, 0, 'No order should be created on quote change failure');
});

test('Package B Gap 2: Saved idempotent receipt is returned with original totals without repricing', async () => {
  const fixture = initStore();
  invalidateCatalogCache();

  const checkoutPayload = {
    ...defaultCustomer,
    items: [{ productId: 'kaju', variantId: 'portion-250g', quantity: 2 }],
  };

  // 1. Order created successfully
  const firstResult = await executeDurableOrder(fixture, checkoutPayload, 'key-idempotent-replay-1');
  assert.equal(firstResult.isDuplicate, false);
  const originalTotal = firstResult.totals.total;
  const originalOrderId = firstResult.orderId;

  // 2. Merchant changes price of kaju in database afterwards
  const kajuDoc = fixture.records.get('products/kaju') as any;
  kajuDoc.prices['250g'] = 2500;
  invalidateCatalogCache();

  // 3. Customer replays submission with same idempotency key
  const replayResult = await executeDurableOrder(fixture, checkoutPayload, 'key-idempotent-replay-1');

  // Must return saved receipt without repricing
  assert.equal(replayResult.isDuplicate, true);
  assert.equal(replayResult.orderId, originalOrderId);
  assert.equal(replayResult.totals.total, originalTotal, 'Replayed receipt must preserve original totals');
  assert.equal(replayResult.items[0].unitPrice, firstResult.items[0].unitPrice);
});

test('Package B Gap 3: Idempotency conflict returns error when payload differs under same submission key', async () => {
  const fixture = initStore();
  invalidateCatalogCache();

  const initialPayload = {
    ...defaultCustomer,
    items: [{ productId: 'badam', variantId: 'portion-250g', quantity: 1 }],
  };

  const firstResult = await executeDurableOrder(fixture, initialPayload, 'key-conflict-check-1');
  assert.equal(firstResult.isDuplicate, false);

  // Changed payload with same key (e.g. quantity changed from 1 to 3)
  const modifiedPayload = {
    ...defaultCustomer,
    items: [{ productId: 'badam', variantId: 'portion-250g', quantity: 3 }],
  };

  await assert.rejects(
    async () => {
      await executeDurableOrder(fixture, modifiedPayload, 'key-conflict-check-1');
    },
    (err: any) => err instanceof IdempotencyConflictError
  );
});

test('Package B Gap 4: Direct order creation fails closed with QUOTE_REQUIRED for incomplete hampers', async () => {
  const fixture = initStore();
  invalidateCatalogCache();

  const incompleteHamperPayload = {
    ...defaultCustomer,
    items: [
      {
        productId: 'custom-hamper',
        variantId: 'custom-hamper-v1',
        quantity: 1,
        hamperConfiguration: {
          version: 1,
          boxId: 'box-wood',
          selections: ['pista'], // Only 1 selection, but box-wood requires min 4!
        },
      },
    ],
  };

  await assert.rejects(
    async () => {
      await executeDurableOrder(fixture, incompleteHamperPayload, 'key-hamper-quote-required-1');
    },
    (err: any) => err instanceof ValidationError && (err.code === 'QUOTE_REQUIRED' || err.code === 'INVALID_HAMPER_CONFIGURATION')
  );
});

test('Package B Gap 5: Outbox retry handles mismatched acknowledgements without false delivery confirmation', async () => {
  const fixture = initStore();
  invalidateCatalogCache();

  const checkoutPayload = {
    ...defaultCustomer,
    items: [{ productId: 'badam', variantId: 'portion-500g', quantity: 1 }],
  };

  const orderResult = await executeDurableOrder(fixture, checkoutPayload, 'key-outbox-ack-1');
  assert.equal(orderResult.isDuplicate, false);

  const canonicalOrder = fixture.records.get(`orders/${orderResult.orderId}`) as any;
  const projected = projectCanonicalOrderForN8n(canonicalOrder);

  // Mock transport returning a mismatched ack (wrong orderId or mirrorStored false)
  const mismatchedFetch = async () =>
    new Response(
      JSON.stringify({
        ok: true,
        orderId: 'wrong-order-id-999',
        mirrorStored: false,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  const mismatchedResult = await sendOrderToN8n(projected, {
    config: n8nConfig,
    fetchImpl: mismatchedFetch as any,
  });
  assert.equal(mismatchedResult.sent, false, 'Mismatched order ack must reject delivery confirmation');
  assert.equal(mismatchedResult.status, 'FAILED');
  assert.equal(mismatchedResult.reason, 'ORDER_WEBHOOK_INVALID_ACK');

  // Mock transport returning correct matching ack
  const matchingFetch = async () =>
    new Response(
      JSON.stringify({
        ok: true,
        orderId: orderResult.orderId,
        mirrorStored: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  const matchingResult = await sendOrderToN8n(projected, {
    config: n8nConfig,
    fetchImpl: matchingFetch as any,
  });
  assert.equal(matchingResult.sent, true, 'Matching ack must confirm delivery');
  assert.equal(matchingResult.status, 'SUCCESS');
});
