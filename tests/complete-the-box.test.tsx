import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { CartProvider } from '../src/contexts/CartContext';
import { PRODUCTS } from '../src/data/products';
import type { CartItem, Product } from '../src/types';
import {
  computeSuggestionBudgetCap,
  getCompleteTheBoxSuggestions,
  pickStarterPortion,
} from '../src/lib/completeTheBox';
import CompleteTheBoxSuggestions from '../src/components/CompleteTheBoxSuggestions';

function makeProduct(overrides: Partial<Product> & { id: string; category: string }): Product {
  return {
    id: overrides.id,
    name: overrides.name || overrides.id,
    name_en: overrides.name_en || overrides.id,
    name_ur: overrides.name_ur || overrides.id,
    name_ar: overrides.name_ar || overrides.id,
    category: overrides.category,
    image: '/images/product-placeholder.svg',
    description: 'Test product',
    origin: 'Pakistan',
    prices: overrides.prices || { '250g': 950, '500g': 1800 },
    active: overrides.active ?? true,
    status: overrides.status ?? 'published',
    ...overrides,
  } as Product;
}

function makeCartItem(product: Product, weight = '500g', price = 2000): CartItem {
  return {
    id: `${product.id}-${weight}`,
    productId: product.id,
    slug: product.id,
    name_en: product.name_en,
    name_ur: product.name_ur,
    name_ar: product.name_ar,
    selectedWeight: weight,
    unitPrice: price,
    price,
    quantity: 1,
    image: product.image || '/images/product-placeholder.svg',
  };
}

test('getCompleteTheBoxSuggestions excludes drafts, archived, inactive, quoteOnly, already-in-cart, and bundle components', () => {
  const inCartDate = makeProduct({ id: 'ajwa-dates', category: 'dates', prices: { '500g': 3200 } });
  const inCartBundle = makeProduct({
    id: 'bundle-sample',
    category: 'bundles',
    isBundle: true,
    componentIds: ['inside-almond'],
    prices: { Box: 4500 },
  });

  const catalog: Product[] = [
    inCartDate,
    inCartBundle,
    makeProduct({ id: 'inside-almond', category: 'dry-fruits', prices: { '250g': 1100 } }),
    makeProduct({ id: 'draft-pistachio', category: 'dry-fruits', status: 'draft', prices: { '250g': 900 } }),
    makeProduct({ id: 'archived-honey', category: 'essentials', status: 'archived', prices: { '250g': 850 } }),
    makeProduct({ id: 'inactive-saunf', category: 'saunf', active: false, prices: { '250g': 500 } }),
    makeProduct({ id: 'quote-box', category: 'gift-boxes', quoteOnly: true, prices: { Box: 900 } }),
    makeProduct({ id: 'bid-box-wedding', category: 'celebration-boxes', isBidBox: true, prices: { Box: 500 } }),
    makeProduct({ id: 'valid-saunf', category: 'saunf', prices: { '250g': 650, '500g': 1200 } }),
    makeProduct({ id: 'valid-tea', category: 'herbal-teas', prices: { '100g': 750 } }),
  ];

  const suggestions = getCompleteTheBoxSuggestions(
    [makeCartItem(inCartDate, '500g', 3200), makeCartItem(inCartBundle, 'Box', 4500)],
    catalog,
    { maxItems: 2, subtotal: 7700 },
  );

  assert.equal(suggestions.length, 2);
  const ids = suggestions.map((s) => s.product.id);
  assert.ok(ids.includes('valid-saunf'));
  assert.ok(ids.includes('valid-tea'));
  assert.ok(!ids.includes('draft-pistachio'));
  assert.ok(!ids.includes('archived-honey'));
  assert.ok(!ids.includes('inactive-saunf'));
  assert.ok(!ids.includes('quote-box'));
  assert.ok(!ids.includes('inside-almond'));
  assert.ok(!ids.includes('bid-box-wedding'));
});

test('getCompleteTheBoxSuggestions respects budget cap and picks smallest canonical portion', () => {
  const dateInCart = makeProduct({ id: 'medjool-dates', category: 'dates', prices: { '500g': 2400 } });
  const expensiveNut = makeProduct({ id: 'chilgoza-gold', category: 'dry-fruits', prices: { '500g': 9800 } });
  const inBudgetNut = makeProduct({
    id: 'badam-giri',
    category: 'dry-fruits',
    prices: { '250g': 950, '500g': 1850, '1kg': 3600 },
  });
  const inBudgetSaunf = makeProduct({
    id: 'shahi-saunf',
    category: 'saunf',
    prices: { '250g': 550, '500g': 1050 },
  });

  const cap = computeSuggestionBudgetCap(2400);
  assert.equal(cap, 1560);

  const suggestions = getCompleteTheBoxSuggestions(
    [makeCartItem(dateInCart, '500g', 2400)],
    [dateInCart, expensiveNut, inBudgetNut, inBudgetSaunf],
    { maxItems: 2, subtotal: 2400 },
  );

  assert.equal(suggestions.length, 2);
  assert.ok(suggestions.every((s) => s.price <= cap), 'All suggestions should fit within budget cap');
  assert.ok(!suggestions.some((s) => s.product.id === 'chilgoza-gold'));

  const almondPick = suggestions.find((s) => s.product.id === 'badam-giri');
  assert.ok(almondPick);
  assert.equal(almondPick.portionLabel, '250g');
  assert.equal(almondPick.price, 950);
  assert.equal(almondPick.reasonKey, 'pairsWithDates');
});

test('getCompleteTheBoxSuggestions works against the real storefront seed catalogue and skips unavailable variants', () => {
  const sampleDate = PRODUCTS.find(
    (p) => p.active !== false && /date|ajwa|medjool/i.test(`${p.id} ${p.name_en || p.name || ''}`),
  );
  assert.ok(sampleDate, 'Expected at least one active date product in seeds');
  const starter = pickStarterPortion(sampleDate);
  assert.ok(starter);

  const suggestions = getCompleteTheBoxSuggestions(
    [makeCartItem(sampleDate, starter.label, starter.price)],
    PRODUCTS,
    { maxItems: 2, subtotal: starter.price },
  );

  assert.ok(suggestions.length >= 1 && suggestions.length <= 2);
  for (const s of suggestions) {
    assert.notEqual(s.product.id, sampleDate.id);
    assert.ok(s.price > 0);
    assert.equal(s.product.prices[s.portionLabel], s.price);
  }
});

test('CompleteTheBoxSuggestions renders EN, UR (RTL), and AR (RTL) headings and pairing copy', () => {
  const sampleDate = makeProduct({ id: 'ajwa-dates', category: 'dates', name_en: 'Ajwa Dates', prices: { '500g': 3000 } });
  const catalog = [
    sampleDate,
    makeProduct({ id: 'badam', category: 'dry-fruits', name_en: 'Almonds', name_ur: 'بادام', name_ar: 'لوز', prices: { '250g': 900 } }),
    makeProduct({ id: 'saunf', category: 'saunf', name_en: 'Shahi Saunf', name_ur: 'شاہی سونف', name_ar: 'شمر ملكي', prices: { '250g': 600 } }),
  ];
  const cartItems = [makeCartItem(sampleDate, '500g', 3000)];

  for (const [lang, expectedHeading, expectedDir] of [
    ['en', 'Complete the Box', 'ltr'],
    ['ur', 'باکس مکمل کریں', 'rtl'],
    ['ar', 'أكمل الصندوق', 'rtl'],
  ] as const) {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LanguageProvider initialLanguage={lang}>
          <CartProvider>
            <CompleteTheBoxSuggestions
              cartItems={cartItems}
              products={catalog}
              subtotal={3000}
              onAdd={() => {}}
            />
          </CartProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );
    assert.match(html, new RegExp(expectedHeading));
    assert.match(html, new RegExp(`dir="${expectedDir}"`));
    assert.match(html, /data-testid="complete-the-box"/);
  }
});
