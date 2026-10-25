import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../src/data/products';
import { HAMPER_BOX_SEEDS } from '../src/lib/hamperBoxSchema';
import { quoteOrderForCustomer } from '../src/lib/orderQuote';

function catalogDatabase() {
  const records = new Map<string, any>([
    ...PRODUCTS.map(product => [`products/${product.id}`, structuredClone(product)] as const),
    ...HAMPER_BOX_SEEDS.map(box => [`hamperBoxes/${box.id}`, { schemaVersion: 1, boxId: box.id, revision: 0, price: box.price, active: true }] as const),
  ]);
  const snapshot = (reference: any) => ({ id: reference.id, ref: reference,
    exists: records.has(reference.path), data: () => structuredClone(records.get(reference.path)) });
  const reference = (path: string): any => ({ path, id: path.split('/').at(-1),
    get: async () => snapshot(reference(path)), collection: (name: string) => collection(`${path}/${name}`) });
  const collection = (path: string): any => ({ doc: (id: string) => reference(`${path}/${id}`),
    where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }) });
  return { records, db: { collection, getAll: async (...references: any[]) => references.map(snapshot) } as any };
}
const order = { city: 'Lahore', shippingMethodId: 'standard', items: [{ id: 'pista', selectedWeight: '500g', quantity: 1, price: 1 }] };

test('quote reads current database prices on every call and ignores browser amounts', async () => {
  const { db, records } = catalogDatabase();
  const first = await quoteOrderForCustomer(db, order);
  assert.equal(first.totals.subtotal, 2500);
  records.get('products/pista')!.prices['500g'] = 2800;
  const next = await quoteOrderForCustomer(db, order);
  assert.equal(next.totals.subtotal, 2800);
  assert.notEqual(next.catalogVersion, first.catalogVersion);
  assert.equal(first.items[0].price, 2500);
});

test('unavailable database or corrupt required prices never borrow source prices', async () => {
  await assert.rejects(() => quoteOrderForCustomer(null, order), { code: 'CATALOG_STORE_UNAVAILABLE' });
  const { db, records } = catalogDatabase();
  records.get('products/pista')!.prices['500g'] = -1;
  await assert.rejects(() => quoteOrderForCustomer(db, order), { code: 'PRODUCT_UNAVAILABLE' });
  records.delete('products/pista');
  await assert.rejects(() => quoteOrderForCustomer(db, order), { code: 'PRODUCT_UNAVAILABLE' });
});

test('custom pricing changes independently of fixed portion prices with current rounding', async () => {
  const { db, records } = catalogDatabase();
  const product = records.get('products/badam')!;
  product.pricePer100g = 321;
  const custom = await quoteOrderForCustomer(db, { ...order, items: [{ productId: 'badam', selectedWeight: 'Custom 150g', quantity: 1 }] });
  assert.equal(custom.items[0].price, 485);
  product.prices['250g'] = 999;
  assert.equal((await quoteOrderForCustomer(db, { ...order, items: [{ productId: 'badam', selectedWeight: 'Custom 150g', quantity: 1 }] })).items[0].price, 485);
});

test('fresh quotes preserve coupons, discounted Lahore thresholds and gift wrap fees', async () => {
  const { db } = catalogDatabase();
  const discounted = await quoteOrderForCustomer(db, { ...order, discountCode: 'ALLBARKA10', giftWrapping: true });
  assert.equal(discounted.totals.discount, 250);
  assert.equal(discounted.totals.giftWrapFee, 250);
  assert.equal(discounted.totals.total, 2650);
  const items = [...order.items, { id: 'nimko', selectedWeight: '1kg', quantity: 1, price: 1 }];
  assert.equal((await quoteOrderForCustomer(db, { ...order, items })).totals.shipping, 0);
  assert.equal((await quoteOrderForCustomer(db, { ...order, items, discountCode: 'ALLBARKA10' })).totals.shipping, 150);
  for (const [discountCode, code] of [['EID15', 'PROMO_INACTIVE'], ['UNKNOWN', 'INVALID_PROMO'], ['FRIEND ALLBARKA10', 'ONE_PROMO_ONLY'], ['WELCOME10', 'PROMO_REQUIRES_AUTH']]) {
    await assert.rejects(() => quoteOrderForCustomer(db, { ...order, discountCode }), { code });
  }
});

test('nationwide quotes bill canonical fractional oil and nut weights without threshold exemption', async () => {
  const { db } = catalogDatabase();
  const quote = await quoteOrderForCustomer(db, { ...order, city: 'Islamabad', items: [
    { productId: 'badam', selectedWeight: '1kg', quantity: 1, shippingWeightGrams: 0 },
    { productId: 'oil-almond', selectedWeight: '100ml', quantity: 2, shippingWeightGrams: 0 },
  ] });
  assert.equal(quote.totals.shippingWeightGrams, 1200);
  assert.equal(quote.totals.shipping, 300);
  assert.equal(quote.totals.shippingRegion, 'nationwide');
});

test('bundle and custom hamper totals share the authoritative catalog', async () => {
  const { db } = catalogDatabase();
  for (const [productId, grams] of Object.entries({ 'bundle-daily-grind': 900, 'bundle-brain-fuel': 1100,
    'bundle-winter-warrior': 1500, 'bundle-immunity-shield': 800, 'bundle-sunrise-seeds': 800,
    'bundle-royal-feast': 2500, 'bundle-silver-hamper': 1500, 'bundle-gold-hamper': 2500,
    'bundle-platinum-hamper': 4000, 'bundle-ramadan-ready': 2000, 'bundle-mystery-box': 1200, 'bundle-tasting-flight': 500 })) {
    const quote = await quoteOrderForCustomer(db, { ...order, city: 'Karachi', items: [{ productId, selectedWeight: 'Bundle', quantity: 2, price: 1, shippingWeightGrams: 1 }] });
    assert.equal(quote.totals.shippingWeightGrams, grams * 2, productId);
    assert.equal(quote.totals.shipping, Math.max(250, Math.round(grams * 2 / 1000 * 250)), productId);
  }
  const hamper = await quoteOrderForCustomer(db, { ...order, city: 'Karachi', items: [{ productId: 'custom-hamper', quantity: 2,
    hamperConfiguration: { version: 1, boxId: 'box-velvet', selections: ['pista', 'kaju', 'badam'], recipientName: '', giftMessage: '' } }] });
  assert.ok(hamper.items[0].price > 1400);
  assert.equal(hamper.items[0].selectedWeight, '3 × 200g');
  assert.equal(hamper.totals.shippingWeightGrams, 1200);
});

test('quote requests hide all payment totals and reject unsupported product portions', async () => {
  const { db } = catalogDatabase();
  const quote = await quoteOrderForCustomer(db, { ...order, discountCode: 'CANCER', freeGift: true, discountAmount: 99999 });
  for (const field of ['subtotal', 'discount', 'discountedSubtotal', 'shipping', 'giftWrapFee', 'total'] as const) assert.equal(quote.totals[field], 0);
  assert.equal(quote.totals.isQuoteRequest, true);
  await assert.rejects(() => quoteOrderForCustomer(db, { ...order, items: [{ productId: 'corporate-gifting', selectedWeight: 'Bundle', quantity: 1 }] }), { code: 'QUOTE_REQUIRED' });
  await assert.rejects(() => quoteOrderForCustomer(db, { ...order, items: [{ ...order.items[0], selectedWeight: '500g • Vacuum Tin' }] }), { code: 'INVALID_WEIGHT' });
  await assert.rejects(() => quoteOrderForCustomer(db, { ...order, city: undefined }), { code: 'INVALID_CITY' });
});
