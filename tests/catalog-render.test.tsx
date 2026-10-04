import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from '../src/contexts/CartContext';
import { LanguageProvider, type LanguageCode } from '../src/contexts/LanguageContext';
import CategoryPLP from '../src/components/CategoryPLP';
import ProductCard from '../src/components/ProductCard';
import QuickViewModal from '../src/components/QuickViewModal';
import { PRODUCTS } from '../src/data/products';
import { getLocalized } from '../src/utils/localize';

function renderInLanguage(element: React.ReactElement, language: LanguageCode, url = '/shop') {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    matchMedia: () => ({ matches: true, addListener: () => {}, removeListener: () => {} }),
    addEventListener: () => {}, removeEventListener: () => {}, pageXOffset: 0, pageYOffset: 0,
  } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => key === 'allbarka_language' ? language : null } });
  try {
    return renderToString(<MemoryRouter initialEntries={[url]}><LanguageProvider><CartProvider>{element}</CartProvider></LanguageProvider></MemoryRouter>);
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor); else Reflect.deleteProperty(globalThis, 'window');
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor); else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

function render(url: string, category = 'all') {
  return renderToString(<MemoryRouter initialEntries={[url]}><LanguageProvider><CartProvider><CategoryPLP initialCategory={category} /></CartProvider></LanguageProvider></MemoryRouter>);
}
test('shop renders URL search results with a visible search field', () => {
  const html = render('/shop?search=badaam');
  assert.match(html, /type="search"/);
  assert.match(html, /value="badaam"/);
  assert.match(html, /href="\/product\/badam"/);
  assert.doesNotMatch(html, /href="\/product\/pista"/);
});
test('saved view without saved products gives recovery controls', () => {
  const html = render('/shop?saved=1');
  assert.match(html, /Let’s find your perfect match/);
  assert.match(html, /Clear filters/);
  assert.doesNotMatch(html, /id="plp-products-grid"/);
});
test('category filter renders only matching catalogue products', () => {
  const html = render('/shop/oils', 'oils');
  assert.match(html, /href="\/product\/oil-almond"/);
  assert.doesNotMatch(html, /href="\/product\/pista"/);
});

test('every product has an actual Urdu and Arabic name with the full defining product terms', () => {
  for (const product of PRODUCTS) {
    for (const language of ['ur', 'ar'] as const) {
      const name = getLocalized(product, 'name', language);
      assert.equal(name, product[`name_${language}`]);
      assert.notEqual(name, product.name_en, `${product.id} must not use an English fallback`);
      assert.match(name, /[\u0600-\u06ff]/);
    }
  }
  const walnut = PRODUCTS.find(product => product.id === 'akhroot')!;
  assert.equal(walnut.name_ur, 'اخروٹ گری');
  assert.equal(walnut.name_ar, 'جوز مقشر');
  const mustard = PRODUCTS.find(product => product.id === 'oil-mustard')!;
  assert.match(mustard.name_ur, /کولڈ پریسڈ/);
  assert.match(mustard.name_ar, /المعصور على البارد/);
  assert.equal(PRODUCTS.find(product => product.id === 'badam')!.name_ar, 'لوز الجبال الذهبي');
});

test('boutique card titles retain long complete names and unrestricted wrapping in every language', () => {
  const product = {
    ...PRODUCTS.find(product => product.id === 'deal-1')!,
    name_en: 'The Classics (Walnut and Pistachio Duo) — A deliberately long complete catalogue title',
    name_ur: 'کلاسک جوڑی (اخروٹ اور پستہ) — مکمل نام دکھانے کے لیے ایک طویل مصنوعات کا عنوان',
    name_ar: 'الثنائي الكلاسيكي (الجوز والفستق) — عنوان طويل كامل لعرض اسم المنتج دون اقتطاع',
  };
  for (const language of ['en', 'ur', 'ar'] as const) {
    const html = renderInLanguage(<ProductCard product={product} isWholesale={false} />, language);
    const heading = html.match(/<h3\b([^>]*)>([\s\S]*?)<\/h3>/);
    assert.ok(heading);
    assert.equal(heading[2], getLocalized(product, 'name', language));
    assert.match(heading[1], new RegExp(`lang="${language}"`));
    assert.match(heading[1], /whitespace-normal break-words/);
    assert.doesNotMatch(heading[1], /line-clamp|truncate|overflow-hidden|whitespace-nowrap/);
    assert.match(heading[1], new RegExp(language === 'ur' ? 'font-urdu' : language === 'ar' ? 'font-arabic' : 'font-serif'));
  }
});

test('shop card and quick-view titles use complete names with the selected script typography', () => {
  const product = PRODUCTS.find(product => product.id === 'oil-mustard')!;
  for (const language of ['en', 'ur', 'ar'] as const) {
    const name = getLocalized(product, 'name', language);
    const font = language === 'ur' ? 'font-urdu' : language === 'ar' ? 'font-arabic' : 'font-serif';
    const shop = renderInLanguage(<CategoryPLP initialCategory="oils" />, language, '/shop/oils');
    const title = shop.match(/<a\b(?=[^>]*href="\/product\/oil-mustard")(?=[^>]*lang=)[^>]*>[\s\S]*?<\/a>/)?.[0];
    assert.ok(title);
    assert.ok(title.includes(name));
    assert.ok(title.includes(font));
    assert.doesNotMatch(title, /line-clamp|truncate|overflow-hidden|whitespace-nowrap/);
    const quick = renderInLanguage(<QuickViewModal isOpen product={product} onClose={() => {}} />, language);
    const quickTitle = quick.match(/<h2\b[^>]*id="quickview-product-name"[^>]*>[\s\S]*?<\/h2>/)?.[0];
    assert.ok(quickTitle);
    assert.ok(quickTitle.includes(name));
    assert.ok(quickTitle.includes(font));
  }
});
