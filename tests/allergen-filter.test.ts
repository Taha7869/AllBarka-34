import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../src/data/products';
import { intakeProducts20261110 } from '../src/lib/catalogIntake20261110';
import { intakeProducts20261113 } from '../src/lib/catalogIntake20261113';
import { intakeProducts20261114 } from '../src/lib/catalogIntake20261114';
import { intakeProducts20261115 } from '../src/lib/catalogIntake20261115';
import {
  ALLERGEN_FILTER_KEYS,
  extractProductAllergens,
  parseAllergenParam,
  productMatchesAllergenExclusions,
} from '../src/lib/allergenFilter';
import { applyCatalogFilterDraft, beginCatalogFilterDraft, filterCatalogSelection } from '../src/lib/catalogFilterDraft';
import { catalogFilterTranslations } from '../src/contexts/catalogFilterTranslations';
import type { Product } from '../src/types';

const ALL_252 = [
  ...PRODUCTS,
  ...intakeProducts20261110(),
  ...intakeProducts20261113(),
  ...intakeProducts20261114(),
  ...intakeProducts20261115(),
] as Product[];

test('allergen extractor ignores shared facility boilerplate while catching true listed allergens across all 252 products', () => {
  const byId = new Map(ALL_252.map(p => [p.id, p]));
  assert.equal(ALL_252.length, 252);

  // Tree nuts detected accurately
  assert.ok(extractProductAllergens(byId.get('pista')!, byId).has('tree-nuts'));
  assert.ok(extractProductAllergens(byId.get('badam')!, byId).has('tree-nuts'));
  assert.ok(extractProductAllergens(byId.get('brazil-nuts')!, byId).has('tree-nuts'));

  // Dates, murabba, spices, and honey are NOT wrongly excluded by "tree-nuts" despite facility disclaimer
  assert.equal(extractProductAllergens(byId.get('khajoor')!, byId).has('tree-nuts'), false);
  assert.equal(extractProductAllergens(byId.get('murabba-saib')!, byId).has('tree-nuts'), false);
  assert.equal(extractProductAllergens(byId.get('coriander-seeds-whole')!, byId).has('tree-nuts'), false);

  // Peanuts & sesame detected accurately
  assert.ok(extractProductAllergens(byId.get('salted-peanuts')!, byId).has('peanuts'));
  assert.ok(extractProductAllergens(byId.get('peanut-jaggery-gachak')!, byId).has('peanuts'));
  assert.ok(extractProductAllergens(byId.get('sesame-rewari')!, byId).has('sesame'));

  // Bundles inherit component allergens (e.g., deal-date-almond contains badam -> tree-nuts)
  assert.ok(extractProductAllergens(byId.get('deal-date-almond')!, byId).has('tree-nuts'));
  assert.equal(extractProductAllergens(byId.get('deal-murabba-duo')!, byId).has('tree-nuts'), false);
});

test('filterCatalogSelection and URL draft round-trip avoid= allergen exclusions cleanly', () => {
  assert.deepEqual(parseAllergenParam('tree-nuts, peanuts, invalid, tree-nuts'), ['tree-nuts', 'peanuts']);

  const params = new URLSearchParams('avoid=tree-nuts,peanuts');
  const draft = beginCatalogFilterDraft(params);
  assert.deepEqual(draft.excludeAllergens, ['tree-nuts', 'peanuts']);

  const serialized = applyCatalogFilterDraft(new URLSearchParams(), draft);
  assert.equal(serialized.get('avoid'), 'tree-nuts,peanuts');

  const filtered = filterCatalogSelection(ALL_252, draft, {
    category: 'all',
    isWholesale: false,
    savedIds: [],
    sharedIds: null,
  });
  assert.ok(filtered.length > 50, 'Safe non-nut items remain visible');
  assert.equal(filtered.some(p => p.id === 'pista' || p.id === 'salted-peanuts' || p.id === 'deal-date-almond'), false);
  assert.equal(filtered.some(p => p.id === 'khajoor' || p.id === 'murabba-saib'), true);
  assert.equal(productMatchesAllergenExclusions(ALL_252[0], []), true);

  for (const key of ALLERGEN_FILTER_KEYS) {
    for (const lang of ['en', 'ur', 'ar'] as const) {
      assert.ok(catalogFilterTranslations[lang][`allergen.${key}`], `Missing ${lang} translation for allergen.${key}`);
    }
  }
});
