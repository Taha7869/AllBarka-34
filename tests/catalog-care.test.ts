import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import { CATALOG_CARE } from '../src/data/catalogCare';

test('completed care batches have specific, localized content and current portion information', () => {
  for (const id of Object.keys(CATALOG_CARE)) {
    const product = PRODUCTS.find(product => product.id === id)!;
    assert.ok(product, id);
    for (const language of ['en', 'ur', 'ar']) {
      for (const field of ['recipe', 'storageTips', 'sourcingDetails', 'packagingDetails', 'allergenWarning']) {
        const value = (product as unknown as Record<string, string>)[`${field}_${language}`];
        assert.ok(value?.trim(), `${id}:${field}:${language}`);
        assert.doesNotMatch(value, /Follow the product label|Follow the storage guidance|not listed for this selection/i, id);
      }
    }
    assert.match(product.allergenWarning_en!, /Packed in a facility that also handles tree nuts, peanuts and seeds\./);
    assert.ok(product.sourcingDetails_en!.includes(product.name_en), id);
    assert.ok(product.recipe_en!.split('.').filter(part => part.trim()).length >= 2, id);
    for (const portion of Object.keys(product.prices)) assert.ok(product.packagingDetails_en!.includes(portion), `${id}:${portion}`);
  }
});
