import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import { searchCatalog, productSearchScore, CATALOG_ALIASES, normalizeSearch } from '../src/lib/catalogDiscovery';
import { selectionMatches, selectionResultsPath, type SelectionPreferences } from '../src/lib/selectionGuide';
import { getComparableProducts, VARIETY_CRITERIA } from '../src/lib/varietyComparison';

test('M31: Local-language search aliases resolve Roman Urdu, regional varieties, and packaging synonyms', () => {
  // 1. Roman Urdu regional terms
  const chilgozaResults = searchCatalog(PRODUCTS, 'chalgoza');
  assert.ok(chilgozaResults.length > 0, 'Must find pine nuts via chalgoza');
  assert.ok(chilgozaResults.some(p => p.id === 'chilgoza' || p.name_en.toLowerCase().includes('pine')));

  const anjeerResults = searchCatalog(PRODUCTS, 'anjir');
  assert.ok(anjeerResults.length > 0, 'Must find figs via anjir');
  assert.ok(anjeerResults.some(p => p.id === 'anjeer' || p.name_en.toLowerCase().includes('fig')));

  const kishmishResults = searchCatalog(PRODUCTS, 'kismis');
  assert.ok(kishmishResults.length > 0, 'Must find raisins via kismis');
  assert.ok(kishmishResults.some(p => p.id === 'kishmish' || p.name_en.toLowerCase().includes('raisin')));

  // 2. Cultivar & variety names
  const mamraResults = searchCatalog(PRODUCTS, 'mamra');
  assert.ok(mamraResults.length > 0, 'Must find almonds via mamra variety');
  assert.ok(mamraResults.some(p => p.id === 'badam' || p.name_en.toLowerCase().includes('almond')));

  const ajwaResults = searchCatalog(PRODUCTS, 'ajwa');
  assert.ok(ajwaResults.length > 0, 'Must find dates via ajwa');
  assert.ok(ajwaResults.some(p => p.category === 'dates' || p.id.includes('date') || p.id === 'khajoor'));

  // 3. Packaging & favor colloquial terms
  const potliResults = searchCatalog(PRODUCTS, 'potli');
  assert.ok(potliResults.length > 0, 'Must find potli favor pouches');

  const dabbaResults = searchCatalog(PRODUCTS, 'dabba');
  assert.ok(dabbaResults.length > 0, 'Must find gift boxes via dabba');

  // 4. Urdu script queries
  assert.ok(searchCatalog(PRODUCTS, 'چلغوزہ').length > 0, 'Must match Urdu chalghoza');
  assert.ok(searchCatalog(PRODUCTS, 'انجیر').length > 0, 'Must match Urdu anjeer');
  assert.ok(searchCatalog(PRODUCTS, 'بادام').length > 0, 'Must match Urdu badam');
  assert.ok(searchCatalog(PRODUCTS, 'پستہ').length > 0, 'Must match Urdu pista');

  // 5. Arabic script queries
  assert.ok(searchCatalog(PRODUCTS, 'صنوبر').length > 0, 'Must match Arabic pine nuts');
  assert.ok(searchCatalog(PRODUCTS, 'تين').length > 0, 'Must match Arabic figs');
  assert.ok(searchCatalog(PRODUCTS, 'تمر').length > 0, 'Must match Arabic dates');

  // 6. Name match score higher than background detail match
  const pistaNameScore = productSearchScore(PRODUCTS.find(p => p.id === 'pista')!, 'pistachio');
  const otherScore = productSearchScore(PRODUCTS.find(p => p.id === 'kaju')!, 'pistachio');
  assert.ok(pistaNameScore > otherScore, 'Exact name match must score higher than incidental reference');
});

test('M10: Find Your Taste attribute and texture matching correctly scores and filters selections', () => {
  // 1. Taste matching: 'sweet' prioritizes dates, figs, raisins
  const sweetMatches = selectionMatches(PRODUCTS, { category: 'all', budget: null, taste: 'sweet' });
  assert.ok(sweetMatches.length > 0);
  assert.ok(sweetMatches.some(m => m.product.category === 'dates' || m.product.id === 'kishmish' || m.product.id === 'khubani' || m.product.id === 'anjeer'));
  assert.ok(sweetMatches[0].matchedAttributes.includes('sweet'));

  // 2. Texture matching: 'crunchy' prioritizes roasted nuts
  const crunchyMatches = selectionMatches(PRODUCTS, { category: 'all', budget: null, texture: 'crunchy' });
  assert.ok(crunchyMatches.length > 0);
  assert.ok(crunchyMatches.some(m => m.product.id === 'pista' || m.product.id === 'kaju' || m.product.id === 'badam'));
  assert.ok(crunchyMatches[0].matchedAttributes.includes('crunchy'));

  // 3. Texture matching: 'chewy' prioritizes dates and dried fruits
  const chewyMatches = selectionMatches(PRODUCTS, { category: 'all', budget: null, texture: 'chewy' });
  assert.ok(chewyMatches.length > 0);
  assert.ok(chewyMatches.some(m => m.product.category === 'dates' || m.product.id === 'khajoor' || m.product.id === 'kishmish'));

  // 4. Combined taste and texture filter
  const savoryCrunchy = selectionMatches(PRODUCTS, { category: 'dry-fruits', budget: null, taste: 'savory', texture: 'crunchy' });
  assert.ok(savoryCrunchy.length > 0);
  assert.ok(savoryCrunchy[0].matchedAttributes.length >= 1);

  // 5. Budget constraint strictly enforced
  const budgetMatches = selectionMatches(PRODUCTS, { category: 'all', budget: 1000, taste: 'sweet' });
  assert.ok(budgetMatches.length > 0);
  assert.ok(budgetMatches.every(m => m.price <= 1000));

  // 6. Non-match under impossible budget returns empty list gracefully
  const impossibleMatches = selectionMatches(PRODUCTS, { category: 'all', budget: 50, taste: 'sweet' });
  assert.equal(impossibleMatches.length, 0);

  // 7. Results path includes taste and texture query params
  const path = selectionResultsPath({ category: 'dry-fruits', budget: 1500, taste: 'savory', texture: 'crunchy' });
  assert.ok(path.includes('/shop/dry-fruits'));
  assert.ok(path.includes('budget=1500'));
  assert.ok(path.includes('taste=savory'));
  assert.ok(path.includes('texture=crunchy'));
});

test('M27: Variety comparison accurately generates comparable peers and extracts verified criteria', () => {
  const pista = PRODUCTS.find(p => p.id === 'pista')!;
  assert.ok(pista);

  // 1. getComparableProducts returns peers with target product first
  const comparable = getComparableProducts(pista, PRODUCTS);
  assert.ok(comparable.length >= 2, 'Should have at least 2 comparable products');
  assert.equal(comparable[0].id, pista.id, 'Target product must be first column');
  assert.ok(comparable.length <= 4, 'Should cap at 4 comparable columns for mobile viewports');

  // 2. Date category comparisons
  const dateProd = PRODUCTS.find(p => p.category === 'dates' || p.id === 'khajoor')!;
  if (dateProd) {
    const comparableDates = getComparableProducts(dateProd, PRODUCTS);
    assert.equal(comparableDates[0].id, dateProd.id);
    assert.ok(comparableDates.every(p => p.category === 'dates' || p.id.includes('date') || p.id === 'khajoor'));
  }

  // 3. Verification of all criteria render functions
  for (const criterion of VARIETY_CRITERIA) {
    const result = criterion.render(pista);
    assert.ok(result !== undefined && result !== null, `Criterion ${criterion.key} must produce a valid render result`);
    if (typeof result === 'string') {
      assert.ok(result.length > 0, `Criterion ${criterion.key} string must not be empty`);
    } else {
      assert.ok(Array.isArray(result), `Criterion ${criterion.key} must be string or array`);
    }
  }

  // 4. Verified vs unverified claims criteria extraction
  const verifiedPista = {
    ...pista,
    passport: {
      variety: 'Akbari Royal',
      bestBeforeDays: 120,
      certifications: ['halal' as const, 'organic' as const],
    },
    claimsVerification: {
      status: 'verified' as const,
      verifiedAt: '2026-11-01',
    },
  };
  const certCriterion = VARIETY_CRITERIA.find(c => c.key === 'certifications')!;
  const verifiedClaims = certCriterion.render(verifiedPista);
  assert.deepEqual(verifiedClaims, ['HALAL', 'ORGANIC']);

  const unverifiedPista = {
    ...pista,
    passport: {
      certifications: ['halal' as const],
    },
    claimsVerification: {
      status: 'unverified' as const,
    },
  };
  const unverifiedClaims = certCriterion.render(unverifiedPista);
  assert.equal(unverifiedClaims, '—');
});
