import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { PRODUCTS, LEGACY_PRODUCT_IDS, NEW_PRODUCT_IDS, CATALOG_COUNTS, APPROVED_CATALOG_NAMES, getProductImage } from '../src/data/products';
import { getProductImages } from '../src/data/productImages';

// Recorded before expansion: original customer-facing names, images and fixed prices.
const originalProducts: [string, string, string, Record<string, number>][] = [
  ["pista", "Roasted Iranian Pistachios (Pista)", "/images/generated/pistachios-catalog-v1.webp", {"250g": 1250, "500g": 2500, "1kg": 5000}],
  ["kaju", "Luxury King Cashews (Kaju)", "/images/generated/cashews-catalog-v1.webp", {"250g": 950, "500g": 1900, "1kg": 3800}],
  ["badam", "Golden Mountain Almonds (Badam)", "/images/generated/almonds-catalog-v1.webp", {"250g": 950, "500g": 1900, "1kg": 3800}],
  ["akhroot", "Chilean Walnuts (Akhroot Halves)", "/images/generated/walnut-halves-catalog-v1.webp", {"250g": 275, "500g": 550, "1kg": 1100}],
  ["deal-1", "The Classics (Walnut & Pista Duo)", "/images/generated/walnut-pistachio-duo-catalog-v1.webp", {"Combo (500g + 500g)": 2800}],
  ["deal-2", "Work-Day Fuel (Almonds & Cashews)", "/images/generated/almond-cashew-duo-catalog-v1.webp", {"Combo (500g + 500g)": 3500}],
  ["khubani", "Sun-Dried Apricots (Khubani)", "/images/generated/dried-apricots-catalog-v1.webp", {"250g": 275, "500g": 550, "1kg": 1100}],
  ["alubukhara", "Gourmet Dried Plums (Alubukhara)", "/images/generated/dried-plums-catalog-v1.webp", {"250g": 500, "500g": 1000, "1kg": 2000}],
  ["kishmish", "Emerald Green Raisins (Kishmish)", "/images/generated/green-raisins-catalog-v1.webp", {"250g": 365, "500g": 725, "1kg": 1450}],
  ["khajoor", "Premium Dark Dates (Kali Khajoor)", "/images/generated/dark-dates-catalog-v1.webp", {"250g": 240, "500g": 475, "1kg": 950}],
  ["pumpkin_seeds", "Raw Pumpkin Seeds (Pepitas)", "/images/generated/pumpkin-seeds-catalog-v1.webp", {"250g": 400, "500g": 800, "1kg": 1600}],
  ["chia_seeds", "Organic Chia Seeds", "/images/generated/chia-seeds-catalog-v1.webp", {"250g": 400, "500g": 800, "1kg": 1600}],
  ["nimko", "Artisanal Lahori Nimko", "/images/generated/lahori-nimko-catalog-v1.webp", {"250g": 175, "500g": 350, "1kg": 700}],
  ["chanay", "Crunchy Roasted Chanay (Chickpeas)", "/images/generated/roasted-chanay-catalog-v1.webp", {"250g": 150, "500g": 300, "1kg": 600}],
  ["oil-almond", "Sweet Almond Oil", "/images/generated/oil-almond-catalog-v1.webp", {"60ml": 750, "100ml": 1200, "250ml": 2800}],
  ["oil-blackseed", "Black Seed Oil", "/images/generated/oil-blackseed-catalog-v1.webp", {"60ml": 650, "100ml": 1000, "250ml": 2300}],
  ["oil-coconut", "Pure Coconut Oil", "/images/generated/oil-coconut-catalog-v1.webp", {"100ml": 700, "250ml": 1600}],
  ["oil-castor", "Castor Oil", "/images/generated/oil-castor-catalog-v1.webp", {"100ml": 700, "250ml": 1600}],
  ["oil-apricot", "Apricot Kernel Oil", "/images/generated/oil-apricot-catalog-v1.webp", {"100ml": 700}],
  ["oil-sesame", "Sesame Oil", "/images/generated/oil-sesame-catalog-v1.webp", {"100ml": 700}],
  ["oil-flaxseed", "Flax Seed Oil", "/images/generated/oil-flaxseed-catalog-v1.webp", {"100ml": 700}],
  ["oil-walnut", "Walnut Oil", "/images/generated/oil-walnut-catalog-v1.webp", {"100ml": 700}],
  ["oil-olive", "Extra Virgin Olive Oil", "/images/generated/oil-olive-catalog-v1.webp", {"100ml": 700, "250ml": 1650}],
  ["oil-onionseed", "Pure Onion Seed Oil", "/images/generated/oil-onionseed-catalog-v1.webp", {"100ml": 700}],
  ["oil-mustard", "Cold-Pressed Mustard Oil", "/images/generated/oil-mustard-catalog-v1.webp", {"100ml": 700, "500ml": 1400}],
  ["oil-hairblend", "Special Blended Hair Oil", "/images/generated/oil-hairblend-catalog-v1.webp", {"100ml": 700}],
  ["oil-hairgrowth", "Organic Hair Growth Oil", "/images/generated/oil-hairgrowth-catalog-v1.webp", {"100ml": 700}],
  ["org-ghee", "Pure Desi Ghee", "/images/generated/org-ghee-catalog-v1.webp", {"500g": 1300, "1kg": 2500}],
  ["org-honey", "Wild Organic Honey", "/images/generated/org-honey-catalog-v1.webp", {"250g": 450, "500g": 800, "1000g": 1500}],
  ["org-panjeeri", "Traditional Panjeeri", "/images/generated/org-panjeeri-catalog-v1.webp", {"500g": 2400, "1kg": 4500}],
  ["org-saffron", "Premium Saffron / Zafran", "/images/generated/org-saffron-catalog-v1.webp", {"1g": 1000, "3g": 2800, "5g": 4500}],
  ["org-shakkar", "Desi Shakkar", "/images/generated/org-shakkar-catalog-v1.webp", {"1kg": 400}],
 ];
const addedSizes: Record<string, Record<string, number>> = {
  pumpkin_seeds: { '100g': 500 }, chia_seeds: { '100g': 350 },
  'oil-sesame': { '250ml': 700 }, 'oil-olive': { '500ml': 2800 },
  'org-panjeeri': { '250g': 900 }, 'org-saffron': { '2g': 1250 },
};

test('73 requested entries expand the original 32 into 89 unique products after equivalence deduplication', () => {
  assert.equal(LEGACY_PRODUCT_IDS.length, 32);
  assert.equal(NEW_PRODUCT_IDS.length, 57);
  assert.equal(PRODUCTS.length, 89);
  assert.equal(new Set(PRODUCTS.map(product => product.id)).size, PRODUCTS.length);
  assert.deepEqual(CATALOG_COUNTS, {
    nuts: 22, 'gift-boxes': 2, 'snacks-seeds': 13, oils: 15,
    essentials: 5, 'herbs-spices': 19, bundles: 13,
  });
});

test('every original name, photograph and fixed price survives; only six missing portions are added', () => {
  for (const [id, name, image, prices] of originalProducts) {
    const product = PRODUCTS.find(item => item.id === id);
    assert.ok(product, id);
    assert.equal(product.name_en, name, id);
    assert.equal(product.image, image, id);
    assert.equal(getProductImage(product), image, id);
    assert.deepEqual(product.prices, { ...prices, ...(addedSizes[id] || {}) }, id);
  }
});

test('localized names and compatibility aliases share the canonical catalogue definitions', () => {
  for (const product of PRODUCTS) {
    assert.equal(product.active, true, product.id);
    assert.equal(product.name, product.name_en, product.id);
    assert.equal(product.nameUr, product.name_ur, product.id);
    assert.equal(product.nameAr, product.name_ar, product.id);
    assert.ok(product.nameUr?.trim(), product.id);
    assert.ok(product.nameAr?.trim(), product.id);
    assert.equal(product.description, product.desc_en, product.id);
    assert.match(product.name_ur, /[\u0600-\u06ff]/, product.id);
    assert.match(product.name_ar, /[\u0600-\u06ff]/, product.id);
    assert.deepEqual(Object.fromEntries(product.variants!.map(({ label, price }) => [label, price])), product.prices, product.id);
  }
});

test('owner-approved Urdu and Arabic spellings are applied without clipping or substitutions', () => {
  assert.equal(Object.keys(APPROVED_CATALOG_NAMES).length, 60);
  assert.equal(createHash('sha256').update(JSON.stringify(Object.entries(APPROVED_CATALOG_NAMES).sort(([a], [b]) => a.localeCompare(b)))).digest('hex'), 'd3532dc16a5e558e515ebc2f74ee1de59636ebdf6cb7d2eb338ae72a8b963136');
  for (const [id, [urdu, arabic]] of Object.entries(APPROVED_CATALOG_NAMES)) {
    const product = PRODUCTS.find(item => item.id === id);
    assert.ok(product, id);
    assert.equal(product.nameUr, urdu, id);
    assert.equal(product.nameAr, arabic, id);
  }
});

test('only dry loose selections explicitly offer custom weight; all limits and rates are finite', () => {
  for (const product of PRODUCTS) {
    assert.equal(product.minCustomWeightG, 100, product.id);
    assert.equal(product.maxCustomWeightG, 5000, product.id);
    assert.ok(Number.isFinite(product.pricePer100g) && product.pricePer100g! >= 0, product.id);
    if (product.allowCustomWeight) {
      assert.ok(product.pricePer100g! > 0, product.id);
      assert.notEqual(product.category, 'oils', product.id);
      assert.equal(!!product.isBundle, false, product.id);
      assert.equal(!!product.quoteOnly, false, product.id);
    }
  }
  for (const id of ['org-saffron', 'org-ghee', 'org-honey', 'char-maghaz-mix']) {
    assert.equal(PRODUCTS.find(product => product.id === id)!.allowCustomWeight, false, id);
  }
});

test('all oils keep fragile handling and numeric ml shipping convention', () => {
  for (const product of PRODUCTS.filter(item => item.category === 'oils')) {
    assert.equal(product.fragile, true, product.id);
    assert.equal(product.allowCustomWeight, false, product.id);
    for (const label of Object.keys(product.prices)) {
      assert.equal(product.shippingWeights![label], Number(label.replace('ml', '')), `${product.id}:${label}`);
    }
  }
  for (const id of ['oil-pumpkin', 'oil-chilgoza']) {
    assert.match(PRODUCTS.find(product => product.id === id)!.description!, /leak-proof packaging/i);
  }
});

test('bundles use one fixed purchase portion, canonical components and only declared shipping masses', () => {
  const bundleShippingWeights: Record<string, number> = {
    'bundle-daily-grind': 900, 'bundle-brain-fuel': 1100, 'bundle-winter-warrior': 1500,
    'bundle-immunity-shield': 800, 'bundle-sunrise-seeds': 800, 'bundle-royal-feast': 2500,
    'bundle-silver-hamper': 1500, 'bundle-gold-hamper': 2500, 'bundle-platinum-hamper': 4000,
    'bundle-ramadan-ready': 2000, 'bundle-mystery-box': 1200, 'bundle-tasting-flight': 500,
  };
  for (const product of PRODUCTS.filter(item => item.category === 'bundles')) {
    assert.equal(product.isBundle, true, product.id);
    assert.equal(product.allowCustomWeight, false, product.id);
    assert.ok(product.components!.length >= 1, product.id);
    for (const componentId of product.componentIds || []) {
      assert.ok(PRODUCTS.some(item => item.id === componentId), `${product.id}:${componentId}`);
    }
    if (product.quoteOnly) {
      assert.equal(product.id, 'corporate-gifting');
      assert.deepEqual(product.prices, {});
      assert.deepEqual(product.variants, []);
      assert.equal(product.shippingWeightG, undefined, product.id);
    } else {
      assert.deepEqual(Object.keys(product.prices), ['Bundle'], product.id);
      assert.ok(product.prices.Bundle > 0, product.id);
      assert.equal(product.shippingWeightG, bundleShippingWeights[product.id], product.id);
    }
    assert.deepEqual(product.shippingWeights, {}, product.id);
  }
  assert.deepEqual(PRODUCTS.find(item => item.id === 'char-maghaz-mix')!.shippingWeights, { '4x100g': 400 });
  for (const id of ['deal-1', 'deal-2']) {
    assert.deepEqual(PRODUCTS.find(item => item.id === id)!.shippingWeights, { 'Combo (500g + 500g)': 1000 });
  }
});

test('new product images are local SVGs when available; established galleries remain intact', () => {
  for (const id of NEW_PRODUCT_IDS) {
    const product = PRODUCTS.find(item => item.id === id)!;
    if (product.image === null) {
      assert.equal(product.imageName, null, id);
      assert.deepEqual(getProductImages(product), [], id);
    } else {
      assert.equal(product.image, `/images/products/${id}.svg`, id);
      assert.equal(product.imageName, product.image, id);
      assert.deepEqual(getProductImages(product), [product.image], id);
    }
  }
  assert.equal(getProductImages(PRODUCTS.find(item => item.id === 'pista')!).length, 2);
  assert.equal(getProductImages(PRODUCTS.find(item => item.id === 'deal-2')!).length, 4);
});
