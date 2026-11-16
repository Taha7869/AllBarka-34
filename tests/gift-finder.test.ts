import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import {
  parseGiftQuery,
  getProductStartingPrice,
  getDefaultProductPortion,
  getDeterministicGiftSuggestions,
  searchGiftFinder,
  isEligibleGiftProduct,
} from '../src/lib/giftFinderService';

test('Gift Finder: Query Parsing extracts budget, occasion, and recipient accurately', () => {
  // 1. Roman Urdu query with budget, occasion, and recipient
  const q1 = parseGiftQuery('Walid ke liye, Eid par, 5000');
  assert.equal(q1.budget, 5000);
  assert.equal(q1.occasion, 'ramadan');
  assert.equal(q1.recipient, 'father');

  // 2. English query with wedding and budget
  const q2 = parseGiftQuery('Wedding favor gift for friend under 8000');
  assert.equal(q2.budget, 8000);
  assert.equal(q2.occasion, 'wedding');
  assert.equal(q2.recipient, 'friend');

  // 3. Umrah tabarruk dates with currency prefix
  const q3 = parseGiftQuery('Umrah Tabarruk dates budget Rs. 3500');
  assert.equal(q3.budget, 3500);
  assert.equal(q3.occasion, 'umrah');

  // 4. Query without budget
  const q4 = parseGiftQuery('Gift for mother');
  assert.equal(q4.budget, null);
  assert.equal(q4.recipient, 'mother');
});

test('Gift Finder: Product Starting Price and Default Portion resolution', () => {
  const pista = PRODUCTS.find(p => p.id === 'pista')!;
  assert.ok(pista);
  const startPrice = getProductStartingPrice(pista);
  assert.ok(typeof startPrice === 'number' && startPrice > 0);

  const defaultPortion = getDefaultProductPortion(pista);
  assert.ok(defaultPortion);
  assert.ok(defaultPortion.weight);
  assert.ok(defaultPortion.price > 0);
});

test('Gift Finder: Deterministic Curated Fallback returns 3 valid items within budget', () => {
  const budget = 5000;
  const suggestions = getDeterministicGiftSuggestions(PRODUCTS, budget, 'ramadan', 3);

  assert.equal(suggestions.length, 3);
  for (const item of suggestions) {
    assert.ok(isEligibleGiftProduct(item));
    const price = getProductStartingPrice(item);
    assert.ok(price !== null && price <= budget, `Item ${item.id} price (${price}) exceeds budget (${budget})`);
    // Ensure no health claims in description
    const desc = (item.description || '').toLowerCase();
    assert.ok(!desc.includes('cures'));
    assert.ok(!desc.includes('cancer'));
    assert.ok(!desc.includes('diabetes'));
  }
});

test('Gift Finder: Graceful Search Fallback when AI endpoint is offline', async () => {
  // Test search in offline environment without network
  const res = await searchGiftFinder('Walid ke liye, Eid par, 5000', 'ur', PRODUCTS);
  assert.ok(res);
  assert.ok(res.suggestions.length >= 1 && res.suggestions.length <= 3);
  assert.equal(res.parsedQuery.budget, 5000);
  assert.equal(res.parsedQuery.occasion, 'ramadan');
  for (const item of res.suggestions) {
    const price = getProductStartingPrice(item);
    assert.ok(price !== null && price <= 5000);
  }
});
