import assert from 'node:assert/strict';
import test from 'node:test';
import type { CanonicalOrder } from '../src/lib/serverOrderService';
import { getN8nOrderDispatchConfig, projectCanonicalOrderForN8n, sendOrderToN8n } from '../src/services/n8nOrderNotification';
import { normalizeSheetStatus } from '../src/lib/sheetStatusCommand';
import { adminEditablePaymentStatuses, adminEditableStatuses, adminPromoNotes, formatAdminOrderTotal } from '../src/lib/adminPresentation';

const quote = (): CanonicalOrder => ({
  schemaVersion: '2.0.0', orderId: 'AB-20261004-A1B2C300', source: 'website',
  orderType: 'QUOTE_REQUEST', status: 'QUOTE_REQUESTED', paymentMethod: 'quote', paymentStatus: 'NOT_REQUIRED',
  createdAt: '2026-10-04T10:00:00.000Z', createdAtMs: Date.parse('2026-10-04T10:00:00.000Z'),
  updatedAt: '2026-10-04T10:00:00.000Z', updatedAtMs: Date.parse('2026-10-04T10:00:00.000Z'),
  uid: null, customer: { name: 'Test Patron', phone: '03001234567', address: 'House 12, Test Street', city: 'Lahore' },
  items: [{ id: 'pista-500g', productId: 'pista', name: 'Iranian Pistachios', selectedWeight: '500g', quantity: 1, price: 2500, earnedPoints: 0 }],
  gifting: { giftWrapping: false, giftWrapFee: 0 },
  totals: { subtotal: 0, discount: 0, discountedSubtotal: 0, shipping: 0, giftWrapFee: 0, total: 0 },
  promoCode: 'CANCER', promoType: 'quote', discountAmount: 0, freeShipping: false,
  freeGiftWrap: false, freeGift: false, isQuoteRequest: true, earnedPoints: 0,
  claimTokenHash: 'private-claim-must-not-leave',
});

test('canonical quote projection carries quote identity and zero totals without recalculating items', () => {
  const order = quote(), projected = projectCanonicalOrderForN8n(order);
  assert.equal(projected.orderId, order.orderId);
  assert.equal(projected.source, 'website');
  assert.equal(projected.orderType, 'QUOTE_REQUEST');
  assert.equal(projected.status, 'QUOTE_REQUESTED');
  assert.equal(projected.paymentMethod, 'quote');
  assert.equal(projected.paymentStatus, 'NOT_REQUIRED');
  assert.equal(projected.promoCode, 'CANCER');
  assert.equal(projected.isQuoteRequest, true);
  assert.deepEqual(projected.totals, { subtotal: 0, discount: 0, shipping: 0, total: 0 });
  assert.equal(projected.items[0].price, 2500);
  assert.doesNotMatch(JSON.stringify(projected), /private-claim-must-not-leave/);
});

test('quote dispatch uses the normal ORDER_CREATED envelope, tracking ID and confirmed mirror acknowledgement', async () => {
  const projected = projectCanonicalOrderForN8n(quote());
  let payload: any;
  const config = getN8nOrderDispatchConfig({ N8N_ORDER_WEBHOOK_URL: 'https://n8n.example.test/webhook/order', N8N_WEBHOOK_SECRET: 'fixture-only-secret' });
  const response = await sendOrderToN8n(projected, { config, fetchImpl: async (_url, options) => {
    payload = JSON.parse(String(options?.body));
    return new Response(JSON.stringify({ ok: true, orderId: projected.orderId, mirrorStored: true }), { status: 200 });
  } });
  assert.equal(response.sent, true);
  assert.equal(payload.event, 'ORDER_CREATED');
  assert.equal(payload.order.orderId, projected.orderId);
  assert.equal(payload.order.source, 'website');
  assert.equal(payload.order.status, 'QUOTE_REQUESTED');
  assert.equal(payload.order.paymentStatus, 'NOT_REQUIRED');
  assert.equal(payload.order.promoCode, 'CANCER');
  assert.equal(payload.order.totals.total, 0);
});

test('projection quarantines contradictory or payable quote documents; cancellations preserve quote identity', () => {
  for (const changes of [{ paymentMethod: 'cod' }, { paymentStatus: 'PAID' }, { promoCode: 'ALLBARKA10' },
    { orderType: 'ORDER' }, { isQuoteRequest: false }, { promoType: 'percent' }, { status: 'DISPATCHED' },
    { freeGift: true }, { totals: { ...quote().totals, shipping: 150 } }]) {
    assert.throws(() => projectCanonicalOrderForN8n({ ...quote(), ...changes } as CanonicalOrder), /CANONICAL_ORDER_INVALID/);
  }
  assert.equal(projectCanonicalOrderForN8n({ ...quote(), status: 'CANCELLED' }).orderType, 'QUOTE_REQUEST');
  assert.throws(() => normalizeSheetStatus(' QUOTE_REQUESTED '), /INVALID_STATUS/);
});

test('gift and percentage metadata survive the whitelisted transport projection without private fields', () => {
  const base: CanonicalOrder = { ...quote(), orderType: 'ORDER', status: 'ORDER_RECEIVED', paymentMethod: 'cod', paymentStatus: 'UNPAID',
    promoCode: 'MYSTERY', promoType: 'free_gift', freeGift: true, isQuoteRequest: false,
    totals: { subtotal: 2500, discount: 0, discountedSubtotal: 2500, shipping: 150, giftWrapFee: 0, total: 2650 } };
  assert.equal(projectCanonicalOrderForN8n(base).freeGift, true);
  assert.equal(projectCanonicalOrderForN8n({ ...base, promoCode: 'GIFTBOX', promoType: 'free_giftwrap', freeGift: false, freeGiftWrap: true }).freeGiftWrap, true);
  const percentage = projectCanonicalOrderForN8n({ ...base, promoCode: 'ALLBARKA10', promoType: 'percent', promoValue: 10, discountAmount: 250, freeGift: false,
    totals: { ...base.totals, discount: 250, discountedSubtotal: 2250, total: 2400 } });
  assert.equal(percentage.promoValue, 10);
  assert.equal(percentage.discountAmount, 250);
});

test('legacy coupon receipts retain their original saved discount rather than today\'s cap or percentage', () => {
  const legacy = quote();
  for (const key of ['orderType', 'promoCode', 'promoType', 'discountAmount', 'freeShipping', 'freeGiftWrap', 'freeGift', 'isQuoteRequest'] as const) delete legacy[key];
  Object.assign(legacy, { status: 'ORDER_RECEIVED', paymentMethod: 'bank', paymentStatus: 'UNPAID', couponCode: 'ALLBARKA10', couponDiscount: 1500,
    totals: { subtotal: 15000, discount: 1500, discountedSubtotal: 13500, shipping: 150, giftWrapFee: 0, total: 13650 } });
  const projected = projectCanonicalOrderForN8n(legacy);
  assert.equal(projected.promoCode, 'ALLBARKA10');
  assert.equal(projected.promoType, null);
  assert.equal(projected.discountAmount, 1500);
  assert.equal(projected.totals.discount, 1500);
  assert.equal(projected.totals.total, 13650);
  delete legacy.couponDiscount;
  assert.equal(projectCanonicalOrderForN8n(legacy).discountAmount, 1500, 'Saved totals are the fallback for old receipts');
});

test('Admin quote controls permit cancellation only and keep the payment record inert', () => {
  const statuses = ['ORDER_RECEIVED', 'QUOTE_REQUESTED', 'CONFIRMED', 'DISPATCHED', 'CANCELLED'] as const;
  const payments = ['UNPAID', 'PAID', 'REFUNDED', 'NOT_REQUIRED'] as const;
  assert.deepEqual(adminEditableStatuses(quote(), statuses), ['QUOTE_REQUESTED', 'CANCELLED']);
  assert.deepEqual(adminEditablePaymentStatuses(quote(), payments), ['NOT_REQUIRED']);
  assert.deepEqual(adminEditableStatuses({ ...quote(), status: 'CANCELLED' }, statuses), ['CANCELLED']);
  assert.equal(formatAdminOrderTotal(quote(), key => key), 'admin.promo.quote');
  assert.deepEqual(adminPromoNotes(quote(), key => key), ['admin.detail.promo: CANCER', 'admin.promo.quote']);
});
