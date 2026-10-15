import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { CartProvider } from '../src/contexts/CartContext';
import CheckoutPage from '../src/pages/CheckoutPage';
import LuxuryPreloader from '../src/components/LuxuryPreloader';
import { deliveryBannerState } from '../src/components/LahoreExpressTimer';
import { calculateDeliverySchedule } from '../src/lib/deliveryCalendar';
import { shoppingQualityTranslations } from '../src/contexts/shoppingQualityTranslations';

test('dispatch banner follows the order calendar across cutoff, Sunday and international clock offsets', () => {
  for (const timestamp of ['2026-10-15T12:59:59Z', '2026-10-15T13:00:00Z', '2026-10-15T13:01:00Z', '2026-10-17T13:01:00Z', '2026-10-18T03:00:00-07:00', '2026-10-19T00:00:00+05:00']) {
    const now = new Date(timestamp);
    const banner = deliveryBannerState(now);
    const calendar = calculateDeliverySchedule({ shippingMethodId: 'sameday', orderTimestamp: now });
    assert.equal(banner.eligible, calendar.isSameDayEligible, timestamp);
    assert.equal(banner.dispatchDate, calendar.scheduledDeliveryDate, timestamp);
    assert.ok(banner.seconds >= 0);
  }
  assert.equal(deliveryBannerState(new Date('2026-10-17T13:01:00Z')).dispatchDate, '2026-10-19');
  assert.equal(deliveryBannerState(new Date('2026-10-15T12:00:00Z')).seconds, 3600);
});

test('the brand preloader never obstructs shopping', () => {
  assert.equal(renderToString(<LuxuryPreloader />), '');
});

test('guest checkout exposes explicit accessible labels, required state, autofill and phone guidance in every language', () => {
  const originals = ['window', 'localStorage', 'sessionStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const cart = [{ id: 'pista-250g', productId: 'pista', selectedWeight: '250g', quantity: 1, price: 1250, unitPrice: 1250 }];
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { addEventListener() {}, removeEventListener() {} } });
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: () => null } });
    for (const language of ['en', 'ur', 'ar'] as const) {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => key === 'allbarka_cart_v1' ? JSON.stringify(cart) : key === 'allbarka_language' ? language : null } });
      const html = renderToString(<MemoryRouter><LanguageProvider><CartProvider><CheckoutPage /></CartProvider></LanguageProvider></MemoryRouter>);
      assert.match(html, /for="checkout-field-name"/);
      assert.match(html, /for="checkout-field-phone"/);
      assert.match(html, /id="checkout-field-name"[^>]*autoComplete="shipping name"[^>]*required=""/);
      assert.match(html, /id="checkout-field-phone"[^>]*autoComplete="shipping tel"[^>]*required=""[^>]*aria-describedby="checkout-phone-hint"/);
      assert.ok(html.includes(shoppingQualityTranslations[language]['checkout.nameLabel']));
      assert.ok(html.includes(shoppingQualityTranslations[language]['checkout.phoneHint']));
      assert.match(html, new RegExp(`dir="${language === 'en' ? 'ltr' : 'rtl'}" class="boutique-checkout`));
    }
  } finally {
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  }
});

test('shopping, dispatch and honest payment/feedback copy have complete Urdu and Arabic translations', () => {
  const keys = Object.keys(shoppingQualityTranslations.en).sort();
  for (const language of ['ur', 'ar'] as const) {
    assert.deepEqual(Object.keys(shoppingQualityTranslations[language]).sort(), keys);
    for (const text of Object.values(shoppingQualityTranslations[language])) assert.match(text, /[\u0600-\u06ff]/);
  }
});
