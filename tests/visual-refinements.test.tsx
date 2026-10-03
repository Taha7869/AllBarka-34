import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { PRODUCTS } from '../src/data/products';
import ProductImageGallery from '../src/components/ProductImageGallery';
import MobileHeaderBrand from '../src/components/MobileHeaderBrand';
import NewsletterCard from '../src/components/NewsletterCard';
import LogoLoop from '../src/components/LogoLoop';
import CollectionLogoLoop, { COLLECTION_RIBBON_LINKS } from '../src/components/CollectionLogoLoop';
import { visualRefinementTranslations } from '../src/contexts/visualRefinementTranslations';

const render = (element: React.ReactElement) => renderToString(<MemoryRouter><LanguageProvider>{element}</LanguageProvider></MemoryRouter>);

test('multi-photo cards keep browsing controls and a single count, without dot buttons', () => {
  const html = render(<ProductImageGallery product={PRODUCTS.find(product => product.id === 'deal-1')!} />);
  assert.match(html, /product-gallery-counter/);
  assert.match(html, /aria-label="Photo 1\/4"/);
  assert.match(html, /aria-label="Previous photo"/);
  assert.match(html, /aria-label="Next photo"/);
  assert.match(html, /href="\/product\/deal-1"/);
  assert.equal((html.match(/<button /g) ?? []).length, 2);
  assert.doesNotMatch(html, /product-gallery-dots/);
});

test('single photographs stay clear and quick-view galleries do not navigate away', () => {
  const single = render(<ProductImageGallery product={PRODUCTS.find(product => product.id === 'org-honey')!} />);
  assert.doesNotMatch(single, /product-gallery-counter|<button /);
  const quickView = render(<ProductImageGallery product={PRODUCTS.find(product => product.id === 'pista')!} linkToDetails={false} />);
  assert.doesNotMatch(quickView, /href=/);
  assert.match(quickView, /pista-secondary-v1.webp/);
});

test('mobile wordmark is present before effects and returning-session timers', () => {
  const html = render(<MobileHeaderBrand onHomeClick={() => {}} />);
  assert.match(html, /AllBarka — Home/);
  assert.match(html, /mobile-royal-brand__name">AllBarka/);
  assert.match(html, /Premium Dry Fruits/);
  assert.doesNotMatch(html, /Lahore · Boutique/);
  assert.match(html, /dir="ltr"/);
});

test('reserve invitation provides an explicitly labelled email field and visible subscription consent', () => {
  const html = render(<><NewsletterCard /><NewsletterCard /></>);
  const inputIds = [...html.matchAll(/<input id="([^"]+)" type="email"/g)].map(match => match[1]);
  assert.equal(inputIds.length, 2);
  assert.notEqual(inputIds[0], inputIds[1]);
  for (const id of inputIds) assert.ok(html.includes(`for="${id}"`));
  assert.match(html, /<span>The Private<\/span>\s*<em>Reserve<\/em>/);
  assert.match(html, /Join the reserve/);
  assert.match(html, /By subscribing, you agree to receive AllBarka harvest and gifting updates by email/);
  assert.match(html, /autoComplete="email" required="" maxLength="254"/);
  assert.doesNotMatch(html, /type="tel"/);
});

test('logo loop exposes only its first sequence to assistive technology and keyboard navigation', () => {
  const html = render(<LogoLoop logos={[{ title: 'Nuts', href: '/shop/nuts', node: <span>Nuts</span> }]} ariaLabel="Collections" />);
  assert.equal((html.match(/<ul /g) ?? []).length, 2);
  assert.equal((html.match(/aria-hidden="true"/g) ?? []).length, 3);
  assert.equal((html.match(/tabindex="-1"/g) ?? []).length, 1);
  assert.match(html, /role="region" aria-label="Collections"/);
});

test('collection ribbon uses real collection URLs and complete translations', () => {
  const html = render(<CollectionLogoLoop />);
  for (const { href } of COLLECTION_RIBBON_LINKS) assert.ok(html.includes(`href="${href}"`));
  assert.doesNotMatch(html, /collection-ribbon__pause|Pause collection ribbon|Resume collection ribbon/);
  assert.doesNotMatch(html, /Visa|Mastercard|Leopards|Meezan|HBL Pay/);
  const englishKeys = Object.keys(visualRefinementTranslations.en).sort();
  for (const language of ['ur', 'ar'] as const) {
    assert.deepEqual(Object.keys(visualRefinementTranslations[language]).sort(), englishKeys);
    for (const value of Object.values(visualRefinementTranslations[language])) assert.match(value, /[\u0600-\u06ff]/);
  }
});
