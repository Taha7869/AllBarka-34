import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import CustomHamperBuilderModal from '../src/components/CustomHamperBuilderModal';
import { PRODUCTS } from '../src/data/products';
import { HAMPER_BOXES, HAMPER_SELECTION_IDS, hamperCartKey, hamperSelectionPrice, resolveHamper, type HamperConfiguration, type HamperBox } from '../src/lib/hamperCatalog';
import type { Product } from '../src/types';

const configuration = (): HamperConfiguration => ({ version: 1, boxId: 'box-wood', selections: ['pista', 'kaju', 'badam', 'akhroot'], recipientName: 'Ayesha', giftMessage: 'With love\nFrom the family' });

test('hamper registry uses real canonical products and existing merchant packaging prices', () => {
  assert.deepEqual(HAMPER_BOXES.map(box => box.price), [1800, 1400, 950]);
  for (const id of HAMPER_SELECTION_IDS) {
    const product = PRODUCTS.find(product => product.id === id);
    assert.ok(product, `${id} must be an orderable canonical product`);
    assert.equal(hamperSelectionPrice(product), Math.round(product.prices['1kg'] * 200 / 1000));
  }
  assert.ok(!HAMPER_SELECTION_IDS.some(id => /chilgoza|figs|prod-/.test(id)));
});

test('resolver derives names, price and net contents weight without trusting client amounts', () => {
  const input = { ...configuration(), unitPrice: 1, price: -1, massGrams: 0, name_en: 'Fake discount' };
  const result = resolveHamper(input);
  assert.ok(result);
  const expected = 1800 + configuration().selections.reduce((sum, id) => sum + Math.round(PRODUCTS.find(product => product.id === id)!.prices['1kg'] * 200 / 1000), 0);
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
  const pricesWith1kg = PRODUCTS.map(product => product.id === 'pista' ? { ...product, prices: { ...product.prices, '1kg': product.prices['1kg'] + 500 } } : product);
  assert.equal(resolveHamper(configuration(), pricesWith1kg)!.unitPrice - resolveHamper(configuration())!.unitPrice, 100);
  const pricesWith250g = PRODUCTS.map(product => product.id === 'pista' ? { ...product, prices: { ...product.prices, '250g': product.prices['250g'] + 500 } } : product);
  assert.equal(resolveHamper(configuration(), pricesWith250g)!.unitPrice - resolveHamper(configuration())!.unitPrice, 0);
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


test('hamper portions reject inquiry, unpublished and disabled selections without inventing a price', () => {
  const item=PRODUCTS.find(product=>product.id==='pista')!;
  for(const patch of [{orderMode:'inquiry_quote' as const},{status:'draft' as const},{status:'archived' as const},{variants:[{label:'1kg',price:item.prices['1kg'],available:false}]}]){
    const changed={...item,...patch};assert.equal(hamperSelectionPrice(changed),null);
    assert.equal(resolveHamper(configuration(),PRODUCTS.map(product=>product.id===item.id?changed:product)),null);
  }
  assert.equal(resolveHamper(configuration(),PRODUCTS,HAMPER_BOXES.map(box=>({...box,active:false}))),null);
});

test('order-level precision: four ingredients at Rs1,001/kg, 200g each, 10 hampers yields Rs8,008 ingredients and Rs18,008 total', () => {
  const box: HamperBox = {
    id: 'box-wood',
    name_en: 'Test Box',
    name_ur: '',
    name_ar: '',
    price: 1000,
    minSelections: 4,
    maxSelections: 4,
    image: '',
    active: true,
  };
  const testProducts: Product[] = ['pista', 'kaju', 'badam', 'akhroot'].map(id => ({
    id,
    name_en: id,
    name_ur: '',
    name_ar: '',
    desc_en: '',
    desc_ur: '',
    desc_ar: '',
    category: 'dry-fruits',
    status: 'published',
    orderMode: 'standard',
    active: true,
    wholesale: 0,
    image: null,
    imageName: null,
    prices: { '1kg': 1001 },
    commerce: {
      version: 1,
      kind: 'food',
      pricingMode: 'manual',
      quantityMode: 'fixed',
      baseQuantity: null,
      baseUnit: 'g',
      basePrice: null,
      options: [{ label: '1kg', quantity: 1, unit: 'kg', override: false, available: true, shippingWeightG: 1000 }],
      custom: null,
    },
    schemaVersion: 1,
    revision: 1,
    adminRevision: 1,
  }));

  const config: HamperConfiguration = {
    version: 1,
    boxId: 'box-wood',
    selections: ['pista', 'kaju', 'badam', 'akhroot'],
    recipientName: 'Test Recipient',
    giftMessage: 'Test Message',
  };

  // Quantity = 1
  const single = resolveHamper(config, testProducts, [box], 1);
  assert.ok(single);
  assert.equal(single.ingredientsSubtotalPkr, 801);
  assert.equal(single.packagingPrice, 1000);
  assert.equal(single.estimatedTotalPkr, 1801);
  assert.equal(single.unitPrice, 1801);

  // Quantity = 10 (Acceptance example: 4 ingredients * Rs1,001/kg * 200g * 10 = Rs8,008 + Rs10,000 = Rs18,008)
  const tenHampers = resolveHamper(config, testProducts, [box], 10);
  assert.ok(tenHampers);
  assert.equal(tenHampers.ingredientsSubtotalPkr, 8008);
  assert.equal(tenHampers.packagingPrice, 1000);
  assert.equal(tenHampers.estimatedTotalPkr, 18008);
  assert.equal(tenHampers.unitPrice, 1801);
});
