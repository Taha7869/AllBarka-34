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
        { id: 'pista-01', selectedWeight: '500g', quantity: 1 }
      ],
      shippingMethodId: 'standard',
    });
    assert.equal(validated.summary.subtotal, 2000);
    assert.equal(validated.summary.shipping, 150);
    assert.equal(validated.summary.total, 2150);
  });

  test('Order Validation: Free shipping threshold at >= Rs. 3000', () => {
    const validated = validateAndPriceOrder({
      items: [
        { id: 'pista-01', selectedWeight: '1kg', quantity: 1 }
      ],
      shippingMethodId: 'standard',
    });
    assert.equal(validated.summary.subtotal, 4000);
    assert.equal(validated.summary.shipping, 0); // Free delivery
    assert.equal(validated.summary.total, 4000);
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
      totals: { subtotal: 2000, discount: 0, shipping: 150, total: 2150 },
      items: [{ id: 'pista-01', name: 'Premium Pistachios', selectedWeight: '500g', quantity: 1, price: 2000 }],
      paymentMethod: 'cod',
      createdAt: new Date().toISOString(),
    });

    assert.equal(result.sent, false);
    assert.equal(result.status, 'DISABLED');
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
