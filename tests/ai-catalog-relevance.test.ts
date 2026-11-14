import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCTS } from '../src/data/products';
import { buildBuddyCatalogContext, buildBuddySystemInstruction, selectRelevantCatalog } from '../src/lib/aiBuddyResolution';

test('the AI prompt lists only relevant products and stays small as the catalogue grows', () => {
  const grown = [...PRODUCTS, ...PRODUCTS.map(p => ({ ...p, id: `${p.id}-copy`, name_en: `${(p as any).name_en || p.name} Copy` }))] as any[];
  const small = buildBuddySystemInstruction({ catalog: PRODUCTS as any, language: 'en', query: 'ajwa dates' }).length;
  const big = buildBuddySystemInstruction({ catalog: grown, language: 'en', query: 'ajwa dates' }).length;
  assert.ok(big < 13000, `prompt ${big}`);
  assert.ok(Math.abs(big - small) < 1500, `${small} vs ${big}`);
  const context = buildBuddyCatalogContext(PRODUCTS as any, { query: 'ajwa dates price' });
  assert.match(context.contextText.split('\n')[0], /ajwa-dates/);
  assert.match(context.contextText, /\[SHOWN: 16 of \d+ products/);
});

test('a general greeting still gets a spread of categories, and no query keeps the full list', () => {
  const picked = selectRelevantCatalog(PRODUCTS as any, 'kesa ho', 16);
  assert.equal(picked.length, 16);
  assert.ok(new Set(picked.map(p => p.category)).size >= 4);
  assert.equal(buildBuddyCatalogContext(PRODUCTS as any).visibleCount, buildBuddyCatalogContext(PRODUCTS as any).visibleCount);
  assert.ok(!buildBuddyCatalogContext(PRODUCTS as any).contextText.includes('[SHOWN:'));
});

test('a wedding box question brings packaging forward', () => {
  const picked = selectRelevantCatalog(PRODUCTS as any, 'shadi ke liye bid box chahiye', 24);
  assert.ok(picked.slice(0, 8).some(p => String(p.id).startsWith('bid-box')));
});
