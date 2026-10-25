import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import { readCatalogFilters } from '../src/lib/catalogDiscovery';
import { readSharedSelections } from '../src/lib/catalogLinks';
import { applyCatalogFilterDraft, beginCatalogFilterDraft, filterCatalogSelection, resetCatalogFilterDraft } from '../src/lib/catalogFilterDraft';
import { catalogFilterTranslations } from '../src/contexts/catalogFilterTranslations';

test('editing or cancelling a filter draft leaves the active URL untouched', () => {
  const params = new URLSearchParams('search=almond&budget=2500&origin=Pakistan&sort=price-asc&view=list');
  const original = params.toString();
  const draft = beginCatalogFilterDraft(params);
  draft.query = 'walnut'; draft.budget = 1000; draft.saved = true;
  assert.equal(params.toString(), original);
  assert.deepEqual(beginCatalogFilterDraft(params), { ...readCatalogFilters(params), shared: null });
  assert.notEqual(beginCatalogFilterDraft(params), draft);
  // Cancel discards the edited value; reopening obtains the still-active filters.
  assert.equal(beginCatalogFilterDraft(params).query, 'almond');
  assert.equal(beginCatalogFilterDraft(params).saved, false);
});

test('Apply commits every draft filter while preserving unrelated catalogue state', () => {
  const params = new URLSearchParams('view=list&category=nuts&campaign=gift&search=old&budget=1500');
  const original = params.toString();
  const next = applyCatalogFilterDraft(params, { query: 'badam', budget: 2500, origin: 'Iran', sort: 'price-desc', saved: true, special: true, shared: 'pista,badam' });
  assert.equal(params.toString(), original);
  assert.deepEqual(beginCatalogFilterDraft(next), { query: 'badam', budget: 2500, origin: 'Iran', sort: 'price-desc', saved: true, special: true, shared: 'pista,badam' });
  for (const key of ['view', 'category', 'campaign']) assert.equal(next.get(key), params.get(key));
});

test('Reset is staged until Apply and removes only filter keys', () => {
  const params = new URLSearchParams('search=badam&budget=2000&origin=Iran&saved=1&special=1&sort=name-asc&shared=badam&view=list');
  const original = params.toString();
  const draft = resetCatalogFilterDraft();
  assert.equal(params.toString(), original);
  const next = applyCatalogFilterDraft(params, draft);
  assert.equal(next.toString(), 'view=list');
  assert.equal(draft.budget, 10000);
  assert.equal(draft.origin, 'all');
});

test('an explicitly empty shared selection never silently expands to every product', () => {
  const params = new URLSearchParams('shared=&view=list');
  const next = applyCatalogFilterDraft(params, beginCatalogFilterDraft(params));
  assert.equal(next.has('shared'), true);
  assert.deepEqual(readSharedSelections(next.get('shared'), PRODUCTS), []);
});

test('the draft preview and committed catalogue use the same actual matching products', () => {
  const draft = beginCatalogFilterDraft(new URLSearchParams('search=almond&budget=2500&saved=1&shared=badam,pista,oil-almond'));
  const context = { category: 'all', isWholesale: false, savedIds: ['badam', 'pista'], sharedIds: readSharedSelections(draft.shared, PRODUCTS) };
  const preview = filterCatalogSelection(PRODUCTS, draft, context);
  const applied = applyCatalogFilterDraft(new URLSearchParams('view=list'), draft);
  const committed = filterCatalogSelection(PRODUCTS, readCatalogFilters(applied), { ...context, sharedIds: readSharedSelections(applied.get('shared'), PRODUCTS) });
  assert.deepEqual(preview.map(product => product.id), committed.map(product => product.id));
  assert.ok(preview.length > 0);
  assert.ok(preview.every(product => product.id === 'badam'));
  const narrowed = filterCatalogSelection(PRODUCTS, resetCatalogFilterDraft(), { category: 'oils', isWholesale: true, savedIds: [], sharedIds: null });
  assert.ok(narrowed.every(product => product.category === 'oils' && product.wholesale > 0));
  assert.equal(filterCatalogSelection(PRODUCTS, { ...draft, query: 'unavailable-xyz' }, context).length, 0);
});

test('filter sheet labels and result-count placeholders are complete in every language', () => {
  const keys = Object.keys(catalogFilterTranslations.en).sort();
  for (const language of ['ur', 'ar'] as const) {
    assert.deepEqual(Object.keys(catalogFilterTranslations[language]).sort(), keys);
    for (const key of keys) {
      assert.match(catalogFilterTranslations[language][key], /[\u0600-\u06ff]/u, key);
      assert.deepEqual(catalogFilterTranslations[language][key].match(/\{[^}]+\}/g)?.sort() || [], catalogFilterTranslations.en[key].match(/\{[^}]+\}/g)?.sort() || [], key);
    }
  }
});
