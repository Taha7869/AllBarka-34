import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCardPortion, readBundleFormat } from '../src/lib/merchandisingPresentation';
import { DEFAULT_MERCHANDISING } from '../src/config/merchandising';
import { PRODUCTS } from '../src/data/products';

test('reviewed defaults select real catalog IDs while keeping established tab identities', () => {
  const ids = new Set(PRODUCTS.map(p => p.id));
  assert.deepEqual(DEFAULT_MERCHANDISING.showcaseTabs.map(t => t.id), ['dry-fruits','pantry','gifts','celebration-boxes','deals']);
  for (const tab of DEFAULT_MERCHANDISING.showcaseTabs) {
    assert.ok(tab.productIds.length <= 3);
    for (const id of tab.productIds) assert.ok(ids.has(id), id);
  }
  assert.ok(DEFAULT_MERCHANDISING.featuredProductIds.includes('bundle-tasting-flight'));
  assert.ok(DEFAULT_MERCHANDISING.featuredProductIds.includes('bundle-daily-grind'));
});
test('preferred pumpkin portion does not alter, hide or force an unavailable option', () => {
  assert.equal(initialCardPortion({id:'pumpkin_seeds'}, ['100g','250g','1kg']), '250g');
  assert.equal(initialCardPortion({id:'pumpkin_seeds'}, ['100g']), '100g');
  assert.equal(initialCardPortion({id:'pista'}, ['100g','250g']), '100g');
  assert.equal(initialCardPortion({id:'pumpkin_seeds'}, []), '');
});
test('bundle net weight uses explicit portions, never gross shipping weight or invented item names', () => {
  const tasting = PRODUCTS.find(p => p.id === 'bundle-tasting-flight')!;
  const daily = PRODUCTS.find(p => p.id === 'bundle-daily-grind')!;
  assert.equal(readBundleFormat(tasting)?.netGrams, 400);
  assert.equal(readBundleFormat(daily)?.netGrams, 750);
  assert.equal(readBundleFormat({isBundle:true,badge:'Four selections'}), null);
  assert.equal(readBundleFormat({isBundle:false,badge:'4 × 100g'}), null);
  assert.equal(readBundleFormat({isBundle:true,badge:'0 × 100g'}), null);
  assert.equal(tasting.componentIds, undefined, 'No exact sampler composition was silently added');
});
