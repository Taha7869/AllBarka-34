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
    for (const [variant, imagePath] of [['primary', path], ['secondary', `/images/products/${product.id}-secondary.svg`]]) {
    const file = `public${imagePath}`;
    assert.ok(statSync(file).size > 1000, product.id);
    const svg = readFileSync(file, 'utf8');
    assert.match(svg, /<svg[^>]+viewBox="0 0 960 960"/);
    assert.match(svg, /data:image\/png;base64,/);
    assert.ok(svg.includes('data-catalog-style="editorial-v2"'), product.id);
    assert.ok(svg.includes(`data-variant="${variant}"`), product.id);
    assert.ok(svg.includes(product.nameUr!), `${product.id}: Urdu name`);
    assert.ok(svg.includes(product.nameAr!), `${product.id}: Arabic name`);
    }
  }
});

test('every new image has a successful rendered text safe-area report', () => {
  const covered = new Set<string>();
  for (const category of categories) {
    const report = JSON.parse(readFileSync(`public/images/products/overflow-report-${category}.json`, 'utf8')) as {
      category: string;
      styleVersion: number;
      checks: { id: string; variant: string; path: string; boxes: number; safe: boolean; fontReady: boolean;
        bounds: { text: string; kind: string; x1: number; x2: number; y1: number; y2: number }[] }[];
    };
    assert.equal(report.category, category);
    assert.equal(report.styleVersion, 2);
    const expected = PRODUCTS.filter(product => NEW_PRODUCT_IDS.includes(product.id) && product.category === category);
    assert.deepEqual(report.checks.map(check => `${check.id}:${check.variant}`).sort(), expected.flatMap(product => [`${product.id}:primary`, `${product.id}:secondary`]).sort());
    for (const check of report.checks) {
      assert.equal(check.safe, true, check.id);
      assert.equal(check.fontReady, true, check.id);
      assert.ok(check.boxes >= 6, check.id);
      assert.equal(check.boxes, check.bounds.length, check.id);
      const product = expected.find(product => product.id === check.id)!;
      for (const [kind, name] of [['name_en', product.name], ['name_ur', product.nameUr], ['name_ar', product.nameAr]]) {
        const lines = check.bounds.filter(box => box.kind === kind);
        assert.ok(lines.length >= 1 && lines.length <= 2, `${check.id}:${kind}`);
        assert.equal(lines.map(line => line.text).join(' '), name, `${check.id}:${kind}`);
      }
      for (const box of check.bounds) {
        assert.ok([box.x1, box.x2, box.y1, box.y2].every(Number.isFinite), check.id);
        assert.ok(box.x1 >= 58 && box.x2 <= 902 && box.y1 >= 58 && box.y2 <= 902, `${check.id}: ${box.text}`);
      }
      assert.equal(covered.has(check.path), false, check.id);
      covered.add(check.path);
    }
  }
  assert.equal(covered.size, 114);
});
