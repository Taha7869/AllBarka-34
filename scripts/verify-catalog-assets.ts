import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { PRODUCTS } from '../src/data/products';
import { getProductImages } from '../src/data/productImages';

let images = 0;
for (const product of PRODUCTS) {
  for (const image of getProductImages(product)) {
    assert.ok(image.startsWith('/images/'), `Non-local product image: ${product.id}`);
    assert.ok(statSync(`public${image}`).size > 100, `Empty image: ${image}`);
    images++;
  }
}
console.log(`${PRODUCTS.length} products, ${images} image references verified; no missing files.`);
