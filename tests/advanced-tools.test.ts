import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import { catalogIds, recordView, unitPrice } from '../src/lib/catalogActivity';
import { readSharedSelections, selectionLink } from '../src/lib/catalogLinks';
import { cartLines, readSharedCart, savedBoxes, validateCartLines } from '../src/lib/savedCarts';
import { normalizeDraft, normalizeAddresses } from '../src/lib/checkoutPreferences';
import { conciergeFallback } from '../src/lib/conciergeFallback';
import { validateAndPriceOrder } from '../src/lib/orderValidation';
import { STORE_CONFIG } from '../src/config/store';
import { CONTACT_CONFIG } from '../src/config/contacts';

const product = PRODUCTS.find(item => item.id === 'deal-1')!;
const weight = Object.keys(product.prices)[0];
const line = { productId: product.id, weight, quantity: 3 };
test('shared selections accept exact catalogue identities only and remove duplicates', () => {
  assert.deepEqual(readSharedSelections('deal-1,unknown,deal-1,oil-almond', PRODUCTS), ['deal-1', 'oil-almond']);
  assert.deepEqual(readSharedSelections('x'.repeat(2001), PRODUCTS), []);
  assert.equal(readSharedSelections(null, PRODUCTS), null);
  const link = new URL(selectionLink('https://example.com', ['deal-1', 'forged'], PRODUCTS));
  assert.equal(link.pathname, '/shop'); assert.equal(link.searchParams.get('shared'), 'deal-1');
});
test('share cart rejects forged products, portions, invalid quantities and oversized links', () => {
  assert.deepEqual(readSharedCart(JSON.stringify([line]), PRODUCTS), [line]);
  for (const quantity of [0, -1, 51, 1.5, '2', null]) assert.deepEqual(validateCartLines([{ ...line, quantity }], PRODUCTS), []);
  assert.deepEqual(validateCartLines([{ ...line, productId: 'deal' }, { ...line, weight: '1kg • Vacuum Tin' }], PRODUCTS), []);
  assert.deepEqual(readSharedCart('bad json', PRODUCTS), []);
  assert.deepEqual(readSharedCart('x'.repeat(16001), PRODUCTS), []);
  assert.deepEqual(validateCartLines(Array(51).fill(line), PRODUCTS), []);
  assert.deepEqual(validateCartLines([{ ...line, weight: 'toString' }, { ...line, weight: '__proto__' }], PRODUCTS), []);
});
test('shared and saved cart selections retain all fifty supported catalogue lines', () => {
  const lines = PRODUCTS.flatMap(product => Object.keys(product.prices).map(weight => ({ productId: product.id, weight, quantity: 1 }))).slice(0, 50);
  assert.equal(lines.length, 50);
  assert.deepEqual(validateCartLines(lines, PRODUCTS), lines);
  assert.deepEqual(readSharedCart(JSON.stringify(lines), PRODUCTS), lines);
  assert.deepEqual(cartLines(lines.map(line => ({ productId: line.productId, selectedWeight: line.weight, quantity: line.quantity })) as never, PRODUCTS), lines);
  assert.deepEqual(savedBoxes([{ id: 'full-box', name: 'Full box', lines }], PRODUCTS)[0].lines, lines);
});
test('share cart duplicate quantities cannot exceed server maximum', () => {
  assert.deepEqual(validateCartLines([{ ...line, quantity: 40 }, { ...line, quantity: 30 }], PRODUCTS), [{ ...line, quantity: 50 }]);
});
test('restoring a shared cart ignores historic and forged prices and matches server pricing', () => {
  const items = validateCartLines([{ ...line, price: 1, unitPrice: 1 }], PRODUCTS).map(entry => ({ productId: entry.productId, selectedWeight: entry.weight, quantity: entry.quantity }));
  const order = validateAndPriceOrder({ items, city: 'Lahore', shippingMethodId: 'standard' });
  assert.equal(order.items[0].price, product.prices[weight]);
  assert.equal(order.summary.subtotal, product.prices[weight] * 3);
});
test('saved boxes are capped and contain supported portions without copied customer data', () => {
  const boxes = savedBoxes(Array.from({ length: 4 }, (_, index) => ({ id: `box-${index}`, name: 'Office', lines: [line], phone: 'private', price: 1 })), PRODUCTS);
  assert.equal(boxes.length, 3); assert.equal('phone' in boxes[0], false); assert.equal('price' in boxes[0], false);
  assert.deepEqual(savedBoxes([{ id: 'empty', name: 'Invalid', lines: [{ ...line, productId: 'missing' }] }], PRODUCTS), []);
});
test('custom hamper is excluded from links without altering the original cart', () => {
  const items = [{ productId: 'custom-hamper-1', selectedWeight: 'bespoke', quantity: 1 }, { productId: product.id, selectedWeight: weight, quantity: 2 }];
  assert.deepEqual(cartLines(items as never, PRODUCTS), [{ ...line, quantity: 2 }]); assert.equal(items.length, 2);
});
test('recent history retains exact hyphenated IDs, removes duplicates and caps its size', () => {
  const ids = PRODUCTS.slice(0, 12).map(item => item.id);
  const history = recordView(ids, 'deal-1', PRODUCTS);
  assert.equal(history[0], 'deal-1'); assert.equal(history.length, 8); assert.equal(new Set(history).size, history.length);
  assert.deepEqual(catalogIds(['deal-1', 'deal', 'deal-1'], PRODUCTS, 3), ['deal-1']);
});
test('unit prices use true mass or volume and do not invent bundle measurements', () => {
  assert.deepEqual(unitPrice(5000, '1kg'), { amount: 500, unit: '100g' });
  assert.deepEqual(unitPrice(600, '250g'), { amount: 240, unit: '100g' });
  assert.deepEqual(unitPrice(1400, '100ml'), { amount: 1400, unit: '100ml' });
  assert.deepEqual(unitPrice(1000, '0.5l'), { amount: 200, unit: '100ml' });
  for (const portion of ['box', 'gift set', '0g', '500g+tin']) assert.equal(unitPrice(1000, portion), null);
  assert.equal(unitPrice(NaN, '500g'), null);
});
test('checkout drafts expire and normalize fields to server limits', () => {
  const now = 1000000000;
  const draft = { updatedAt: now, customer: { name: 'a'.repeat(100), phone: '+92 300 0000000', address: 'a'.repeat(400), city: 'Lahore', giftWrapping: 'yes', giftMessage: 'x'.repeat(500) }, shipping: 'forged', coupon: 'ALLBARKA10', payment: 'crypto' };
  const normalized = normalizeDraft(draft, now)!;
  assert.equal(normalized.customer.name.length, 80); assert.equal(normalized.customer.address.length, 300); assert.equal(normalized.customer.giftMessage.length, 300);
  assert.equal(normalized.customer.giftWrapping, false); assert.equal(normalized.shipping, 'standard'); assert.equal(normalized.payment, 'cod');
  assert.equal(normalizeDraft(draft, now + 8 * 86400000), null); assert.equal(normalizeDraft({ ...draft, updatedAt: now + 120000 }, now), null);
});
test('address book excludes invalid entries and caps saved personal addresses', () => {
  assert.deepEqual(normalizeAddresses([null, { id: 'x', address: 'short' }, { address: 'complete address' }]), []);
  assert.equal(normalizeAddresses(Array.from({ length: 6 }, (_, index) => ({ id: String(index), label: 'Home', address: 'House 1, Main Road', city: 'Lahore' }))).length, 5);
});
test('concierge uses actual multilingual product prices and current shipping configuration', () => {
  const pista = PRODUCTS.find(item => item.id === 'pista')!;
  for (const language of ['en', 'ur', 'ar'] as const) {
    const reply = conciergeFallback('pista price', language).reply;
    assert.ok(reply.includes(pista.prices['1kg'].toLocaleString('en-PK')));
    const delivery = conciergeFallback('delivery', language).reply;
    assert.ok(delivery.includes(String(STORE_CONFIG.shipping.standardRate))); assert.ok(delivery.includes(String(STORE_CONFIG.shipping.expressRate)));
    assert.ok(delivery.includes(CONTACT_CONFIG.humanSupportWhatsApp.formatted));
    if (language !== 'en') assert.match(delivery, /[\u0600-\u06ff]/);
  }
});
test('concierge cannot invent location coordinates or personal medical treatment', () => {
  assert.deepEqual(conciergeFallback('location', 'ar').groundingSources, []);
  assert.doesNotMatch(conciergeFallback('location', 'en').reply, /Iqbal Town|31\./);
  assert.match(conciergeFallback('diabetes treatment', 'en').reply, /qualified clinician/);
});
