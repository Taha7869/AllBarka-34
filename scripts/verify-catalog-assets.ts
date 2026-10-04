import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { PRODUCTS, NEW_PRODUCT_IDS, LEGACY_PRODUCT_IDS } from '../src/data/products';
import { getProductImages } from '../src/data/productImages';
import manifest from '../src/data/product-media.json';
import { resolveProductMedia } from '../src/lib/productMedia';

let images = 0;
const unique = new Set<string>();
for (const product of PRODUCTS) {
  const gallery = getProductImages(product);
  assert.deepEqual(resolveProductMedia(product).images, gallery, `Manifest differs from catalogue: ${product.id}`);
  if (NEW_PRODUCT_IDS.includes(product.id)) {
    assert.deepEqual(gallery, [`/images/products/${product.id}.svg`], `One final placeholder required: ${product.id}`);
    assert.ok(Object.hasOwn(manifest, product.id), `Missing media entry: ${product.id}`);
    assert.equal(existsSync(`public/images/products/${product.id}-secondary.svg`), false, `Retired view remains: ${product.id}`);
  }
  for (const image of getProductImages(product)) {
    assert.ok(image.startsWith('/images/'), `Non-local product image: ${product.id}`);
    assert.ok(statSync(`public${image}`).size > 100, `Empty image: ${image}`);
    images++;
    unique.add(image);
  }
}
const svgs = readdirSync('public/images/products').filter(file => file.endsWith('.svg')).sort();
assert.deepEqual(svgs, NEW_PRODUCT_IDS.map(id => `${id}.svg`).sort(), 'Only one SVG per placeholder product may remain');
assert.equal(images, 107);
assert.equal(unique.size, 103);
assert.equal(LEGACY_PRODUCT_IDS.reduce((sum, id) => sum + getProductImages(PRODUCTS.find(product => product.id === id)!).length, 0), 50);
console.log(`${PRODUCTS.length} products, ${images} image references (${unique.size} unique files); ${NEW_PRODUCT_IDS.length} single-image placeholders; 0 missing files, 0 retired views.`);
