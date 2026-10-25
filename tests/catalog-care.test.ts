import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import { CATALOG_CARE } from '../src/data/catalogCare';

test('every catalog product has complete approved care coverage; missing entries fail validation', () => {
  assert.deepEqual(Object.keys(CATALOG_CARE).sort(), PRODUCTS.map(product => product.id).sort());
});

test('all product care is localized, specific, free of placeholders and aligned with current portions', () => {
  for (const product of PRODUCTS) {
    const id = product.id;
    for (const language of ['en', 'ur', 'ar']) {
      for (const field of ['recipe', 'storageTips', 'sourcingDetails', 'packagingDetails', 'allergenWarning']) {
        const value = (product as unknown as Record<string, string>)[`${field}_${language}`];
        assert.ok(value?.trim().length > 40, `${id}:${field}:${language}`);
        assert.doesNotMatch(value, /Follow the product label|Follow the storage guidance|not listed for this selection|prepare according to your recipe|lorem ipsum|\bTBD\b|\bTODO\b/i, `${id}:${field}:${language}`);
        if (language !== 'en') {
          assert.match(value, /[\u0600-\u06ff]/, `${id}:${field}:${language}`);
          assert.notEqual(value, (product as unknown as Record<string, string>)[`${field}_en`]);
        }
      }
    }
    assert.match(product.allergenWarning_en!, /Packed in a facility that also handles tree nuts, peanuts and seeds\./);
    assert.ok(product.sourcingDetails_en!.includes(product.name_en), id);
    const sentences = product.recipe_en!.split(/[.!?]+/).filter(part => part.trim());
    assert.ok(sentences.length >= 2 && sentences.length <= 3, `${id}: suggested use needs 2–3 sentences`);
    for (const portion of Object.keys(product.prices)) assert.ok(product.packagingDetails_en!.includes(portion), `${id}:${portion}`);
  }
});
