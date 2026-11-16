import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { giftOptionLines, normalizeGiftOptions } from '../src/lib/giftOptions';
import { validateCustomerDetails } from '../src/lib/orderValidation';
import { shoppingQualityTranslations } from '../src/contexts/shoppingQualityTranslations';

test('free gift options validate to known values and never change a price', () => {
  assert.equal(normalizeGiftOptions(undefined), null);
  assert.equal(normalizeGiftOptions({ receipt: false, cardStyle: 'celebration', ribbon: 'gold' }), null, 'defaults store nothing');
  assert.deepEqual(normalizeGiftOptions({ receipt: true, cardStyle: 'dua', ribbon: 'ivory' }), { receipt: true, cardStyle: 'dua', ribbon: 'ivory' });
  assert.deepEqual(normalizeGiftOptions({ receipt: 'yes', cardStyle: '<script>', ribbon: 'neon' }), null, 'junk falls back to defaults');
  const lines = giftOptionLines({ receipt: true, cardStyle: 'dua', ribbon: 'emerald' });
  assert.ok(lines.some(l => /no festive design/.test(l)) && lines.some(l => /Emerald/.test(l)) && lines.some(l => /do not put prices/.test(l)));
  const customer = validateCustomerDetails({ name: 'Ali Khan', phone: '03001234567', address: 'House 1, Allama Iqbal Town', city: 'Lahore', paymentMethod: 'cod', giftWrapping: true, giftOptions: { receipt: true, cardStyle: 'eid', ribbon: 'maroon' } } as any);
  assert.deepEqual(customer.giftOptions, { receipt: true, cardStyle: 'eid', ribbon: 'maroon' });
  const pricing = fs.readFileSync('src/lib/pricing.ts', 'utf8');
  assert.ok(!/giftOptions/.test(pricing), 'gift options must not enter pricing');
});

test('gift option copy exists in three languages and the order message carries it', () => {
  const keys = ['checkout.giftOptions', 'checkout.giftCardStyle', 'checkout.giftCard.dua', 'checkout.giftRibbon.emerald', 'checkout.giftReceipt', 'checkout.giftReceiptHint'];
  for (const key of keys) for (const lang of ['en', 'ur', 'ar'] as const) assert.ok((shoppingQualityTranslations[lang][key] || '').length > 1, `${lang} ${key}`);
  assert.match(fs.readFileSync('src/lib/serverOrderService.ts', 'utf8'), /giftOptionLines\(order\.gifting\.giftOptions\)/);
});
