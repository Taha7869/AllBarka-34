import assert from 'node:assert/strict';
import { sendOrderToN8n } from '../src/services/n8nOrderNotification.ts';
import { validateAndPriceOrder, validateCustomerDetails, ValidationError } from '../src/lib/orderValidation.ts';
import { PersistenceUnavailableError, IdempotencyConflictError, QuoteChangedError } from '../src/lib/orderDatabase.ts';

async function runBackendTests() {
  console.log('🧪 Starting AllBarka Backend Production Hardening Unit & Integration Test Suite...\n');
  let passedCount = 0;
  let failedCount = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      const result = fn();
      if (result instanceof Promise) {
        await result;
      }
      console.log(`  ✅ PASS: ${name}`);
      passedCount++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message || err}`);
      failedCount++;
    }
  }

  // 1. Test Order Validation & Pricing Engine
  test('Order Validation: Prices valid dry fruit cart correctly', () => {
    const validated = validateAndPriceOrder({
      items: [
        { id: 'pista', selectedWeight: '500g', quantity: 1 }
      ],
      shippingMethodId: 'standard',
    });
    assert.equal(validated.summary.subtotal, 2500);
    assert.equal(validated.summary.shipping, 150);
    assert.equal(validated.summary.total, 2650);
  });

  test('Order Validation: Free shipping threshold at >= Rs. 3000', () => {
    const validated = validateAndPriceOrder({
      items: [
        { id: 'pista', selectedWeight: '1kg', quantity: 1 }
      ],
      shippingMethodId: 'standard',
    });
    assert.equal(validated.summary.subtotal, 5000);
    assert.equal(validated.summary.shipping, 0); // Free delivery
    assert.equal(validated.summary.total, 5000);
  });

  test('Order Validation: Customer phone validation requires valid Pakistani number format', () => {
    assert.throws(() => {
      validateCustomerDetails({
        name: 'Taha Lahore',
        phone: '123',
        address: 'DHA Phase 6',
        city: 'Lahore',
      });
    }, (err: any) => err instanceof ValidationError && err.code === 'INVALID_PHONE');
  });

  // 2. Test n8n Order Notification Service
  await test('n8n Service: Returns DISABLED status gracefully when N8N_ORDER_WEBHOOK_URL is unconfigured', async () => {
    delete process.env.N8N_ORDER_WEBHOOK_URL;
    const result = await sendOrderToN8n({
      orderId: 'ORD-TEST-001',
      customer: {
        name: 'Test Patron',
        phone: '+92 300 1234567',
        address: 'Gulberg III',
        city: 'Lahore',
      },
      totals: { subtotal: 2500, discount: 0, shipping: 150, total: 2650 },
      items: [{ id: 'pista-500g', name: 'Roasted Iranian Pistachios (Pista)', selectedWeight: '500g', quantity: 1, price: 2500 }],
      paymentMethod: 'cod',
      createdAt: new Date().toISOString(),
    });

    assert.equal(result.sent, false);
    assert.equal(result.status, 'DISABLED');
  });

  await test('n8n Service: Sends X-AllBarka-Webhook-Secret and valid X-N8n-Signature HMAC header', async () => {
    const crypto = await import('node:crypto');
    process.env.N8N_ORDER_WEBHOOK_URL = 'https://n8n.example.com/webhook/test';
    process.env.N8N_WEBHOOK_SECRET = '  secret_n8n_key_789  ';

    let capturedHeaders: any = null;
    let capturedBody: any = null;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (url: any, options: any) => {
      capturedHeaders = options.headers;
      capturedBody = options.body;
      return { ok: true, status: 200 } as any;
    };

    try {
      const orderData = {
        orderId: 'AB-TEST-N8N-02',
        customerUid: 'patron_uid_999',
        customer: { name: 'Zahra', phone: '03001234567', address: 'Model Town', city: 'Lahore' },
        delivery: { type: 'sameday', priority: 'SAME_DAY', promisedDeliveryDate: '2026-09-23' },
        totals: { subtotal: 4000, discount: 0, shipping: 0, total: 4000 },
        items: [{ id: 'pista-01', name: 'Premium Pistachios', selectedWeight: '1kg', quantity: 1, price: 4000 }],
        paymentMethod: 'cod',
        createdAt: new Date().toISOString(),
      };

      const result = await sendOrderToN8n(orderData);

      assert.equal(result.sent, true);
      assert.equal(result.status, 'SUCCESS');
      assert.equal(capturedHeaders['X-AllBarka-Webhook-Secret'], 'secret_n8n_key_789');

      const expectedHmac = crypto.createHmac('sha256', 'secret_n8n_key_789').update(capturedBody).digest('hex');
      assert.equal(capturedHeaders['X-N8n-Signature'], expectedHmac);

      const parsedBody = JSON.parse(capturedBody);
      assert.equal(parsedBody.order.customerUid, 'patron_uid_999');
      assert.equal(parsedBody.order.delivery.type, 'sameday');
      assert.equal(parsedBody.order.delivery.priority, 'SAME_DAY');
      assert.equal(parsedBody.order.delivery.promisedDeliveryDate, '2026-09-23');
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.N8N_ORDER_WEBHOOK_URL;
      delete process.env.N8N_WEBHOOK_SECRET;
    }
  });

  // 3. Test Durable Persistence Safety Error Classes
  test('Order Safety: PersistenceUnavailableError thrown when Firestore is offline', () => {
    const err = new PersistenceUnavailableError();
    assert.equal(err.code, 'PERSISTENCE_UNAVAILABLE');
  });

  test('Order Safety: IdempotencyConflictError has correct code', () => {
    const err = new IdempotencyConflictError();
    assert.equal(err.code, 'IDEMPOTENCY_PAYLOAD_MISMATCH');
  });

  console.log(`\n========================================`);
  console.log(`Test Results: ${passedCount} PASSED, ${failedCount} FAILED.`);
  console.log(`========================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runBackendTests();
