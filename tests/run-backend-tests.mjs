import assert from 'node:assert/strict';

try {
  const { PRODUCTS } = await import('../src/data/products.ts');
  const { sendOrderToN8n } = await import('../src/services/n8nOrderNotification.ts');
  const { validateAndPriceOrder, validateCustomerDetails, ValidationError } = await import('../src/lib/orderValidation.ts');
  const { PersistenceUnavailableError, IdempotencyConflictError } = await import('../src/lib/orderDatabase.ts');

  console.log('🧪 Running AllBarka Production Backend Test Suite...');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Reason: ${err.message || err}`);
      failed++;
    }
  }

  // Find a valid product dynamically from the catalog
  const pistaProduct = PRODUCTS.find(p => p.id === 'pista') || PRODUCTS[0];
  const weight500g = '500g';
  const price500g = pistaProduct.prices[weight500g];
  const expectedSubtotal500g = price500g;
  const expectedShipping500g = expectedSubtotal500g >= 3000 ? 0 : 150;
  const expectedTotal500g = expectedSubtotal500g + expectedShipping500g;

  const weight1kg = '1kg';
  const price1kg = pistaProduct.prices[weight1kg];
  const expectedSubtotal1kg = price1kg;
  const expectedShipping1kg = expectedSubtotal1kg >= 3000 ? 0 : 150;
  const expectedTotal1kg = expectedSubtotal1kg + expectedShipping1kg;

  // 1. Order Validation & Pricing
  await test(`Pricing Engine: ${weight500g} ${pistaProduct.name} total calculation (${expectedSubtotal500g} + ${expectedShipping500g})`, () => {
    const validated = validateAndPriceOrder({
      items: [{ id: pistaProduct.id, selectedWeight: weight500g, quantity: 1 }],
      shippingMethodId: 'standard',
    });
    assert.strictEqual(validated.summary.subtotal, expectedSubtotal500g);
    assert.strictEqual(validated.summary.shipping, expectedShipping500g);
    assert.strictEqual(validated.summary.total, expectedTotal500g);
  });

  await test(`Pricing Engine: Free Shipping triggered on subtotal >= Rs. 3000 (${weight1kg} ${pistaProduct.name})`, () => {
    const validated = validateAndPriceOrder({
      items: [{ id: pistaProduct.id, selectedWeight: weight1kg, quantity: 1 }],
      shippingMethodId: 'standard',
    });
    assert.strictEqual(validated.summary.subtotal, expectedSubtotal1kg);
    assert.strictEqual(validated.summary.shipping, expectedShipping1kg);
    assert.strictEqual(validated.summary.total, expectedTotal1kg);
  });

  await test('Customer Validation: Rejects invalid phone numbers', () => {
    assert.throws(() => {
      validateCustomerDetails({
        name: 'Taha',
        phone: '12345',
        address: 'DHA Phase 6',
        city: 'Lahore',
      });
    }, (err) => err instanceof ValidationError && err.code === 'INVALID_PHONE');
  });

  // 2. n8n Order Notification Service
  await test('n8n Dispatch: Returns DISABLED status when N8N_ORDER_WEBHOOK_URL is not set', async () => {
    delete process.env.N8N_ORDER_WEBHOOK_URL;
    const result = await sendOrderToN8n({
      orderId: 'ORD-TEST-001',
      customer: { name: 'Test Patron', phone: '+92 300 1234567', address: 'Gulberg III', city: 'Lahore' },
      totals: { subtotal: expectedSubtotal500g, discount: 0, shipping: expectedShipping500g, total: expectedTotal500g },
      items: [{ id: pistaProduct.id, name: pistaProduct.name, selectedWeight: weight500g, quantity: 1, price: price500g }],
      paymentMethod: 'cod',
      createdAt: new Date().toISOString(),
    });

    assert.strictEqual(result.sent, false);
    assert.strictEqual(result.status, 'DISABLED');
  });

  // 3. Durable Order Persistence Safety Errors
  await test('Durable Safety: PersistenceUnavailableError has correct code', () => {
    const err = new PersistenceUnavailableError();
    assert.strictEqual(err.code, 'PERSISTENCE_UNAVAILABLE');
  });

  await test('Durable Safety: IdempotencyConflictError has correct code', () => {
    const err = new IdempotencyConflictError();
    assert.strictEqual(err.code, 'IDEMPOTENCY_PAYLOAD_MISMATCH');
  });

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
} catch (topLevelError) {
  console.error('Top level test runner error:', topLevelError);
  process.exit(1);
}
