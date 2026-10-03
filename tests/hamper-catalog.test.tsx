import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import CustomHamperBuilderModal from '../src/components/CustomHamperBuilderModal';
import { PRODUCTS } from '../src/data/products';
import { HAMPER_BOXES, HAMPER_SELECTION_IDS, hamperCartKey, hamperSelectionPrice, resolveHamper, type HamperConfiguration } from '../src/lib/hamperCatalog';

const configuration = (): HamperConfiguration => ({ version: 1, boxId: 'box-wood', selections: ['pista', 'kaju', 'badam', 'akhroot'], recipientName: 'Ayesha', giftMessage: 'With love\nFrom the family' });

test('hamper registry uses real canonical products and existing merchant packaging prices', () => {
  assert.deepEqual(HAMPER_BOXES.map(box => box.price), [1800, 1400, 950]);
  for (const id of HAMPER_SELECTION_IDS) {
    const product = PRODUCTS.find(product => product.id === id);
    assert.ok(product, `${id} must be an orderable canonical product`);
    assert.equal(hamperSelectionPrice(product), Math.round(product.prices['250g'] * 200 / 250));
  }
  assert.ok(!HAMPER_SELECTION_IDS.some(id => /chilgoza|figs|prod-/.test(id)));
});

test('resolver derives names, price and net contents weight without trusting client amounts', () => {
  const input = { ...configuration(), unitPrice: 1, price: -1, massGrams: 0, name_en: 'Fake discount' };
  const result = resolveHamper(input);
  assert.ok(result);
  const expected = 1800 + configuration().selections.reduce((sum, id) => sum + Math.round(PRODUCTS.find(product => product.id === id)!.prices['250g'] * .8), 0);
  assert.equal(result.unitPrice, expected);
  assert.equal(result.massGrams, 800);
  assert.equal(result.portion, '4 × 200g');
  assert.equal(result.name_en, 'Custom Sheesham Artisan Wooden Chest');
  assert.equal(result.configuration.giftMessage, input.giftMessage);
  assert.equal('massGrams' in result.configuration, false);
  assert.equal('price' in result.configuration, false);
});

test('invalid boxes, absent products, duplicate selections, overcapacity and unbounded notes are rejected', () => {
  const base = configuration();
  const invalid: unknown[] = [null, [], {}, { ...base, version: 2 }, { ...base, boxId: 'free-box' },
    { ...base, selections: ['pista', 'kaju', 'badam'] }, { ...base, selections: ['pista', 'pista', 'badam', 'akhroot'] },
    { ...base, selections: ['pista', 'kaju', 'badam', 'prod-figs'] }, { ...base, selections: [1, 'kaju', 'badam', 'akhroot'] },
    { ...base, boxId: 'box-tin', selections: [...HAMPER_SELECTION_IDS].slice(0, 5) },
    { ...base, recipientName: 'x'.repeat(101) }, { ...base, giftMessage: 'x'.repeat(501) },
    { ...base, recipientName: 'Name\nInjected recipient' }, { ...base, giftMessage: 'Bad\u0000note' }];
  for (const input of invalid) assert.equal(resolveHamper(input), null);
  assert.equal(resolveHamper(base, PRODUCTS.filter(product => product.id !== 'pista')), null);
});

test('each coffer honors its registered capacity and current catalogue pricing', () => {
  for (const box of HAMPER_BOXES) {
    for (const count of [box.minSelections, box.maxSelections]) assert.ok(resolveHamper({ ...configuration(), boxId: box.id, selections: [...HAMPER_SELECTION_IDS].slice(0, count) }));
    assert.equal(resolveHamper({ ...configuration(), boxId: box.id, selections: [...HAMPER_SELECTION_IDS].slice(0, box.maxSelections + 1) }), null);
  }
  const prices = PRODUCTS.map(product => product.id === 'pista' ? { ...product, prices: { ...product.prices, '250g': product.prices['250g'] + 500 } } : product);
  assert.equal(resolveHamper(configuration(), prices)!.unitPrice - resolveHamper(configuration())!.unitPrice, 400);
});

test('normalized configuration survives JSON and distinguishes different gift cards', () => {
  const first = resolveHamper(configuration())!;
  const reordered = resolveHamper({ ...configuration(), selections: [...configuration().selections].reverse() })!;
  assert.equal(hamperCartKey(first.configuration), hamperCartKey(reordered.configuration));
  const restored = resolveHamper(JSON.parse(JSON.stringify(first.configuration)))!;
  assert.deepEqual(restored, first);
  const differentCard = resolveHamper({ ...configuration(), giftMessage: 'A different occasion' })!;
  assert.notEqual(hamperCartKey(first.configuration), hamperCartKey(differentCard.configuration));
});

test('builder provides real packaging, an accessible dialog and no fabricated product identities', () => {
  const html = renderToString(<LanguageProvider><CustomHamperBuilderModal isOpen onClose={() => {}} onAddToCart={() => {}} /></LanguageProvider>);
  assert.match(html, /role="dialog" aria-modal="true" aria-labelledby="hamper-builder-title"/);
  assert.match(html, /aria-label="Close hamper builder"/);
  for (const box of HAMPER_BOXES) assert.ok(html.includes(box.image));
  assert.match(html, /4–6 selections/);
  assert.doesNotMatch(html, /prod-chilgoza|prod-figs|custom-hamper-\d+/);
});
