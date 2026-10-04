import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, statSync } from 'node:fs';
import { PRODUCTS, NEW_PRODUCT_IDS } from '../src/data/products';

const categories = ['herbs-spices', 'nuts', 'snacks-seeds', 'oils', 'bundles'] as const;

test('every expanded product has a self-contained local SVG with its exact approved multilingual names', () => {
  const additions = PRODUCTS.filter(product => NEW_PRODUCT_IDS.includes(product.id));
  assert.equal(additions.length, 57);
  for (const product of additions) {
    const path = `/images/products/${product.id}.svg`;
    assert.equal(product.image, path, product.id);
    assert.equal(product.imageName, path, product.id);
    const file = `public${path}`;
    assert.ok(statSync(file).size > 1000, product.id);
    const svg = readFileSync(file, 'utf8');
    assert.match(svg, /<svg[^>]+viewBox="0 0 960 960"/);
    assert.match(svg, /data:image\/png;base64,/);
    assert.ok(svg.includes(product.nameUr!), `${product.id}: Urdu name`);
    assert.ok(svg.includes(product.nameAr!), `${product.id}: Arabic name`);
  }
});

test('every new image has a successful rendered text safe-area report', () => {
  const covered = new Set<string>();
  for (const category of categories) {
    const report = JSON.parse(readFileSync(`public/images/products/overflow-report-${category}.json`, 'utf8')) as {
      category: string;
      checks: { id: string; boxes: number; safe: boolean }[];
    };
    assert.equal(report.category, category);
    const expected = PRODUCTS.filter(product => NEW_PRODUCT_IDS.includes(product.id) && product.category === category);
    assert.deepEqual(report.checks.map(check => check.id).sort(), expected.map(product => product.id).sort());
    for (const check of report.checks) {
      assert.equal(check.safe, true, check.id);
      assert.ok(check.boxes >= 3, check.id);
      assert.equal(covered.has(check.id), false, check.id);
      covered.add(check.id);
    }
  }
  assert.equal(covered.size, 57);
});
