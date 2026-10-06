import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import { searchCatalog, normalizeSearch, startingPrice, readCatalogFilters } from '../src/lib/catalogDiscovery';
import { getReorderItems, orderProgress } from '../src/lib/orderPresentation';
import { catalogTranslations } from '../src/contexts/catalogTranslations';

test('search finds English, Roman Urdu, Urdu and Arabic independent of UI language', () => {
  for (const query of ['badaam', 'badam', 'almond', 'بادام', 'لَوْز']) {
    assert.ok(searchCatalog(PRODUCTS, query).some(p => p.id === 'badam'), query);
  }
  assert.ok(searchCatalog(PRODUCTS, 'akhrot').some(p => p.id === 'akhroot'));
  assert.equal(normalizeSearch('  كَاجُو  '), normalizeSearch('کاجو'));
});
test('search supports multiple words and prioritizes matching names', () => {
  assert.equal(searchCatalog(PRODUCTS, 'iranian pistachios')[0]?.id, 'pista');
  assert.equal(searchCatalog(PRODUCTS, 'nonexistent-xyz').length, 0);
  assert.equal(searchCatalog(PRODUCTS, '   ').length, PRODUCTS.length);
});
test('starting price uses smallest available portion price', () => {
  assert.equal(startingPrice({ ...PRODUCTS[0], prices: { '1kg': 5000, '250g': 1400, '500g': 2500 } }), 1400);
});
test('catalogue filter URLs survive a reload and reject invalid values', () => {
  const state = readCatalogFilters(new URLSearchParams('search=badam&budget=2000&origin=Pakistan&saved=1&sort=price-asc'));
  assert.deepEqual(state, { query: 'badam', budget: 2000, origin: 'Pakistan', saved: true, sort: 'price-asc', special: false });
  assert.equal(readCatalogFilters(new URLSearchParams('budget=bad&sort=garbage')).budget, 10000);
  assert.equal(readCatalogFilters(new URLSearchParams('budget=-1')).budget, 300);
  assert.equal(readCatalogFilters(new URLSearchParams('sort=garbage')).sort, 'featured');
});
test('reordering resolves composite IDs without reusing historic prices', () => {
  const items = getReorderItems([{ id: 'deal-1-1kg', selectedWeight: '1kg', quantity: 2 }], PRODUCTS);
  const product = PRODUCTS.find(p => p.id === 'deal-1')!;
  const weight = Object.keys(product.prices)[0];
  const actual = getReorderItems([{ id: `deal-1-${weight}`, selectedWeight: weight, quantity: 2 }], PRODUCTS);
  assert.equal(actual[0]?.product, product);
  assert.equal(actual[0]?.quantity, 2);
  assert.equal(getReorderItems([{ productId: 'pista', selectedWeight: 'retired-size' }], PRODUCTS).length, 0);
  assert.ok(items.length <= 1);
});
test('unknown and cancelled order statuses never show false progress', () => {
  assert.equal(orderProgress('ORDER_RECEIVED'), 0);
  assert.equal(orderProgress('PREPARING'), 1);
  assert.equal(orderProgress('OUT_FOR_DELIVERY'), 2);
  assert.equal(orderProgress('OUT FOR DELIVERY'), -1);
  assert.equal(orderProgress('DELIVERED'), 3);
  assert.equal(orderProgress('CANCELLED'), -1);
  assert.equal(orderProgress('unknown'), -1);
});
test('new shopping and account copy has complete Urdu and Arabic translations', () => {
  for (const language of ['ur', 'ar']) {
    assert.deepEqual(Object.keys(catalogTranslations[language]).sort(), Object.keys(catalogTranslations.en).sort());
    for (const text of Object.values(catalogTranslations[language])) assert.match(text, /[\u0600-\u06ff]/);
  }
});
