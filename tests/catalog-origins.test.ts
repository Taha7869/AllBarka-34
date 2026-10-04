import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS, NEW_PRODUCT_IDS } from '../src/data/products';
import { getLocalized } from '../src/utils/localize';

test('all products expose origin tags in English, Urdu and Arabic', () => {
  for (const product of PRODUCTS) for (const language of ['en', 'ur', 'ar']) {
    assert.ok(getLocalized(product, 'origin', language).trim(), `${product.id}:${language}`);
  }
});

test('addition origins use named regions or transparent packing tags without invented provenance', () => {
  for (const product of PRODUCTS.filter(product => NEW_PRODUCT_IDS.includes(product.id))) {
    assert.doesNotMatch(product.origin_en!, /certified|organic farm|estate|orchard|grove|single.origin/i, product.id);
  }
  assert.equal(PRODUCTS.find(product => product.id === 'ceylon-cinnamon')!.origin_en, 'Ceylon · Sri Lanka');
  assert.match(PRODUCTS.find(product => product.id === 'medjool-dates')!.origin_en!, /Variety.*Packed in Pakistan/);
  assert.equal(PRODUCTS.find(product => product.id === 'green-cardamom')!.origin_en, 'Hand-Packed in Pakistan');
});
