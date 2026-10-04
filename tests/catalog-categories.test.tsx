import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { PRODUCTS } from '../src/data/products';
import { CANONICAL_CATEGORIES, resolveCategorySlug } from '../src/config/categories';
import { LanguageProvider, type LanguageCode } from '../src/contexts/LanguageContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { CartProvider } from '../src/contexts/CartContext';
import { catalogTranslations } from '../src/contexts/catalogTranslations';
import { searchCatalog, readCatalogFilters, startingPrice } from '../src/lib/catalogDiscovery';
import { filterCatalogSelection } from '../src/lib/catalogFilterDraft';
import { selectionMatches, selectionResultsPath } from '../src/lib/selectionGuide';
import CategoryPLP from '../src/components/CategoryPLP';
import BubbleMenu from '../src/components/BubbleMenu';
import MobileMenu from '../src/components/MobileMenu';
import CategoryCarousel, { PANTRY_CATEGORIES } from '../src/components/CategoryCarousel';
import CategoryQuickPills, { CATEGORY_PILLS } from '../src/components/CategoryQuickPills';
import CollectionLogoLoop, { COLLECTION_RIBBON_LINKS } from '../src/components/CollectionLogoLoop';

function render(element: React.ReactElement, language: LanguageCode = 'en', path = '/shop') {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    matchMedia: () => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} }),
    addEventListener: () => {}, removeEventListener: () => {}, pageXOffset: 0, pageYOffset: 0,
  } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => key === 'allbarka_language' ? language : null } });
  try {
    return renderToString(<MemoryRouter initialEntries={[path]}><LanguageProvider><ThemeProvider><CartProvider>{element}</CartProvider></ThemeProvider></LanguageProvider></MemoryRouter>);
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor); else Reflect.deleteProperty(globalThis, 'window');
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor); else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

const context = (category = 'all') => ({ category, isWholesale: false, savedIds: [], sharedIds: null });

test('new canonical categories keep historical gift/deal aliases stable', () => {
  for (const category of ['herbs-spices', 'bundles']) {
    assert.equal(resolveCategorySlug(` ${category.toUpperCase()} `), category);
    assert.ok(CANONICAL_CATEGORIES[category].description);
    assert.equal(selectionResultsPath({ category, budget: null }), `/shop/${category}`);
  }
  assert.equal(resolveCategorySlug('spices'), 'herbs-spices');
  assert.equal(resolveCategorySlug('combos'), 'gift-boxes');
  assert.equal(resolveCategorySlug('deals'), 'gift-boxes');
});

test('desktop, mobile, hero pills, pantry and ribbon expose both new collections in every language', () => {
  for (const language of ['en', 'ur', 'ar'] as const) {
    const desktop = render(<BubbleMenu activeItem="Herbs & Spices" />, language);
    assert.match(desktop, /data-nav-path="\/shop\/herbs-spices"/);
    assert.ok(desktop.includes(catalogTranslations[language]['catalog.navHerbs'].replaceAll('&', '&amp;')));
    const mobile = render(<MobileMenu isOpen onClose={() => {}} />, language);
    const pills = render(<CategoryQuickPills />, language);
    const pantry = render(<CategoryCarousel />, language);
    const ribbon = render(<CollectionLogoLoop />, language);
    for (const category of ['herbs-spices', 'bundles']) {
      assert.ok(mobile.includes(`data-nav-path="/shop/${category}"`));
      assert.ok(mobile.includes(catalogTranslations[language][`shop.${category}`].replaceAll('&', '&amp;')));
      assert.ok(pills.includes(catalogTranslations[language][`boutique.pill.${category}`].replaceAll('&', '&amp;')));
      assert.ok(pantry.includes(`href="/shop/${category}"`));
      assert.ok(pantry.includes(catalogTranslations[language][`pantry.${category}`].replaceAll('&', '&amp;')));
      assert.ok(ribbon.includes(`href="/shop/${category}"`));
    }
  }
  assert.ok(CATEGORY_PILLS.some(pill => pill.categoryFilter === 'herbs-spices'));
  assert.ok(CATEGORY_PILLS.some(pill => pill.categoryFilter === 'bundles'));
  assert.equal(new Set(PANTRY_CATEGORIES.map(category => category.id)).size, PANTRY_CATEGORIES.length);
  for (const category of Object.keys(CANONICAL_CATEGORIES)) {
    assert.ok(PANTRY_CATEGORIES.some(item => item.id === category));
    assert.ok(COLLECTION_RIBBON_LINKS.some(item => item.href === (category === 'gift-boxes' ? '/gifting' : `/shop/${category}`)));
  }
});

test('new shop sections show the actual active category count and matching products', () => {
  for (const category of ['herbs-spices', 'bundles']) {
    const expected = PRODUCTS.filter(product => product.active !== false && product.category === category);
    assert.ok(expected.length > 0, `${category} has available products`);
    const results = filterCatalogSelection(PRODUCTS, readCatalogFilters(new URLSearchParams()), context(category));
    assert.deepEqual(results.map(product => product.id), expected.map(product => product.id));
    const html = render(<CategoryPLP initialCategory={category} />, 'en', `/shop/${category}`);
    assert.match(html, new RegExp(`<strong[^>]*>${expected.length}</strong>\\s*(?:<!-- -->)?\\s*selections`));
    assert.ok(html.includes(`href="/product/${expected[0].id}"`));
    assert.ok(/role="img" aria-label="[^"]+ — AllBarka"/.test(html) || /<img[^>]+\/images\/products\//.test(html));
    assert.doesNotMatch(html, /href="\/product\/pista"/);
    for (const newCategory of ['herbs-spices', 'bundles']) assert.ok(html.includes(catalogTranslations.en[`shop.${newCategory}`].replaceAll('&', '&amp;')));
  }
});

test('inactive products disappear from discovery, filters and the priced selection guide', () => {
  const inactive = { ...PRODUCTS[0], id: 'inactive-test', active: false, name_en: 'OnlyInactiveToken' };
  assert.deepEqual(searchCatalog([inactive], 'OnlyInactiveToken'), []);
  assert.deepEqual(filterCatalogSelection([inactive], readCatalogFilters(new URLSearchParams()), context()), []);
  assert.deepEqual(selectionMatches([inactive], { category: 'all', budget: null }), []);
});

test('Corporate Gifting stays discoverable but never becomes a free budget match or purchasable card', () => {
  const corporate = PRODUCTS.find(product => product.id === 'corporate-gifting')!;
  assert.ok(corporate?.quoteOnly);
  assert.equal(startingPrice(corporate), Infinity);
  assert.ok(searchCatalog(PRODUCTS, 'Corporate Gifting').some(product => product.id === corporate.id));
  assert.deepEqual(filterCatalogSelection([corporate], readCatalogFilters(new URLSearchParams('budget=500')), context('bundles')), []);
  assert.equal(filterCatalogSelection([corporate], readCatalogFilters(new URLSearchParams()), context('bundles')).length, 1);
  assert.deepEqual(selectionMatches([corporate], { category: 'bundles', budget: null }), []);
  for (const language of ['en', 'ur', 'ar'] as const) {
    const html = render(<CategoryPLP initialCategory="bundles" />, language, '/shop/bundles?search=Corporate%20Gifting');
    assert.ok(html.includes(catalogTranslations[language]['catalog.requestQuote']));
    assert.match(html, /href="\/pages\/contact"/);
    assert.doesNotMatch(html, /Rs\.|Infinity|id="size-corporate-gifting"/);
    assert.doesNotMatch(html, /<select id="size-/);
  }
});

test('fixed bundles show their contents and price without a portion selector', () => {
  const bundle = PRODUCTS.find(product => product.category === 'bundles' && !product.quoteOnly)!;
  assert.ok(bundle?.isBundle);
  const html = render(<CategoryPLP initialCategory="bundles" />, 'en', `/shop/bundles?search=${encodeURIComponent(bundle.name_en)}`);
  assert.ok(html.includes(bundle.contents_en!));
  assert.match(html, /Rs\./);
  assert.doesNotMatch(html, new RegExp(`id="size-${bundle.id}"`));
});
