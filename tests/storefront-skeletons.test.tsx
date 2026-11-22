import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import {
  ShopCategorySkeleton,
  ProductDetailSkeleton,
  RouteLoadingSkeleton,
} from '../src/components/StorefrontSkeletons';

function renderWithLang(element: React.ReactElement, lang: 'en' | 'ur' | 'ar' = 'en') {
  return renderToStaticMarkup(<LanguageProvider initialLanguage={lang}>{element}</LanguageProvider>);
}

test('ShopCategorySkeleton renders boutique skeleton cards with reduced-motion pulse and no spinners', () => {
  const fullHtml = renderWithLang(React.createElement(ShopCategorySkeleton, { count: 4 }), 'en');
  assert.match(fullHtml, /data-skeleton="shop-page"/);
  assert.match(fullHtml, /role="status"/);
  assert.match(fullHtml, /aria-busy="true"/);
  assert.match(fullHtml, /motion-safe:animate-pulse/);
  assert.doesNotMatch(fullHtml, /animate-spin/);
  assert.match(fullHtml, /Loading collection/);

  const gridHtml = renderWithLang(React.createElement(ShopCategorySkeleton, { gridOnly: true, count: 6 }), 'ur');
  assert.match(gridHtml, /data-skeleton="shop-grid"/);
  assert.match(gridHtml, /dir="rtl"/);
  assert.match(gridHtml, /مجموعہ لوڈ ہو رہا ہے/);
});

test('ProductDetailSkeleton renders split PDP layout skeleton in EN/UR/AR without spinners', () => {
  const htmlEn = renderWithLang(React.createElement(ProductDetailSkeleton), 'en');
  assert.match(htmlEn, /data-skeleton="product-detail"/);
  assert.match(htmlEn, /aria-busy="true"/);
  assert.match(htmlEn, /motion-safe:animate-pulse/);
  assert.doesNotMatch(htmlEn, /animate-spin/);

  const htmlAr = renderWithLang(React.createElement(ProductDetailSkeleton), 'ar');
  assert.match(htmlAr, /dir="rtl"/);
  assert.match(htmlAr, /جاري تحميل تفاصيل المنتج/);
});

test('RouteLoadingSkeleton picks matching skeleton by pathname (shop, category, product, generic)', () => {
  const shopHtml = renderWithLang(React.createElement(RouteLoadingSkeleton, { pathname: '/shop/dates' }), 'en');
  assert.match(shopHtml, /data-skeleton="shop-page"/);

  const catHtml = renderWithLang(React.createElement(RouteLoadingSkeleton, { pathname: '/category/dry-fruits' }), 'en');
  assert.match(catHtml, /data-skeleton="shop-page"/);

  const pdpHtml = renderWithLang(React.createElement(RouteLoadingSkeleton, { pathname: '/product/ajwa-dates' }), 'en');
  assert.match(pdpHtml, /data-skeleton="product-detail"/);

  const homeHtml = renderWithLang(React.createElement(RouteLoadingSkeleton, { pathname: '/' }), 'en');
  assert.doesNotMatch(homeHtml, /animate-spin/);
  assert.match(homeHtml, /aria-busy="true"/);
});
