import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { CatalogProvider } from '../src/contexts/CatalogContext';
import { MerchandisingProvider } from '../src/contexts/MerchandisingContext';
import { ProductMediaProvider } from '../src/contexts/ProductMediaContext';
import { CartProvider } from '../src/contexts/CartContext';
import { StorefrontContentProvider } from '../src/contexts/StorefrontContentContext';
import PremiumHeroPrototype, {
  PREMIUM_HERO_COPY,
  PREMIUM_HERO_IMAGE,
} from '../src/components/PremiumHeroPrototype';
import PremiumHomePreviewPage from '../src/pages/PremiumHomePreviewPage';
import HomePage from '../src/pages/HomePage';
import { AllBarkaTracingReviews } from '../src/components/AllBarkaTracingReviews';
import { AllBarkaDarkReviews } from '../src/components/AllBarkaDarkReviews';
import type { PublishedPatronReview } from '../src/lib/publishedReviews';
import { PRODUCTS } from '../src/data/products';

test('PremiumHeroPrototype renders EN, UR (RTL), and AR (RTL) copy with zero health claims and valid links', () => {
  const forbiddenHealthClaims = /\b(cures?|heals?|prevents?|treats?|boosts?|immunity|diabetes|cancer)\b/i;

  for (const lang of ['en', 'ur', 'ar'] as const) {
    const copy = PREMIUM_HERO_COPY[lang];
    for (const text of [
      copy.eyebrow,
      copy.headline,
      copy.description,
      copy.primaryCta,
      copy.secondaryCta,
      copy.caption,
      ...copy.pillars,
    ]) {
      assert.ok(text.trim().length > 0, `${lang} hero copy must be non-empty`);
      assert.doesNotMatch(text, forbiddenHealthClaims, `${lang} copy must never make health claims`);
      assert.doesNotMatch(text, /kashmiri\s+saffron/i, `${lang} copy must not claim Kashmiri saffron (catalog has Sargol saffron)`);
    }

    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/preview/premium-home']}>
        <LanguageProvider initialLanguage={lang}>
          <PremiumHeroPrototype reducedMotionOverride={false} />
        </LanguageProvider>
      </MemoryRouter>,
    );

    assert.match(html, /data-testid="premium-hero-prototype"/);
    assert.match(html, new RegExp(`dir="${lang === 'en' ? 'ltr' : 'rtl'}"`));
    assert.ok(html.includes(copy.primaryCta), `${lang} primary CTA missing`);
    assert.ok(html.includes(copy.secondaryCta), `${lang} secondary CTA missing`);
    assert.ok(html.includes('href="/shop/dry-fruits"'));
    assert.ok(html.includes('href="/gifting"'));
    assert.ok(html.includes(PREMIUM_HERO_IMAGE));
    assert.match(html, /fetchPriority="high"|fetchpriority="high"/i);
    assert.match(html, /data-editorial-scroll-hero="true"/, 'Sticky editorial scroll hero renders');
    assert.match(html, /data-hero-callout="1"/, 'Factual callout pills render');
    assert.doesNotMatch(html, /data-testid="premium-hero-lid"/, 'Fake CSS lid cutout removed');
  }
});

test('PremiumHeroPrototype renders static hero photograph without sticky runway under prefers-reduced-motion', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/preview/premium-home']}>
      <LanguageProvider initialLanguage="en">
        <PremiumHeroPrototype reducedMotionOverride={true} />
      </LanguageProvider>
    </MemoryRouter>,
  );

  assert.match(html, /data-reveal-phase="open"/);
  assert.doesNotMatch(html, /data-testid="premium-hero-lid"/);
  assert.doesNotMatch(html, /min-h-\[125svh\]/, 'Reduced motion disables sticky scroll runway');
  assert.ok(html.includes(PREMIUM_HERO_IMAGE));
});

test('PremiumHomePreviewPage renders isolated preview notice and all 6 branded sample assets exist', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/preview/premium-home']}>
      <LanguageProvider initialLanguage="en">
        <PremiumHomePreviewPage />
      </LanguageProvider>
    </MemoryRouter>,
  );
  assert.ok(html.includes('Phase 1 Hero Prototype'));
  assert.ok(html.includes('href="/"'));

  const expectedSamples = [
    'public/images/drafts-premium-20261122/01-hero-gift-box-dates.webp',
    'public/images/drafts-premium-20261122/02-saffron-jar-closeup.webp',
    'public/images/drafts-premium-20261122/03-honey-bottle.webp',
    'public/images/drafts-premium-20261122/04-dry-fruit-hamper-top.webp',
    'public/images/drafts-premium-20261122/05-kalmi-dates-macro.webp',
    'public/images/drafts-premium-20261122/06-eid-gift-box-card-ribbon.webp',
    'docs/design/premium-samples-montage.jpg',
    'docs/design/premium-home-plan.md',
  ];
  for (const rel of expectedSamples) {
    assert.ok(fs.existsSync(path.resolve(rel)), `Missing required Phase 1 deliverable: ${rel}`);
  }
});

test('Phase 2A live HomePage renders 6 calm sections with zero marquees, zero auto-rotate, and clean catalog copy', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <ThemeProvider>
        <LanguageProvider initialLanguage="en">
          <CatalogProvider initialProducts={PRODUCTS}>
            <MerchandisingProvider>
              <ProductMediaProvider>
                <CartProvider>
                  <StorefrontContentProvider>
                    <HomePage />
                  </StorefrontContentProvider>
                </CartProvider>
              </ProductMediaProvider>
            </MerchandisingProvider>
          </CatalogProvider>
        </LanguageProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );

  assert.match(html, /data-testid="premium-hero-prototype"/, 'Live hero promoted');
  assert.match(html, /id="allbarka-pantry"/, 'Signature Collections rendered');
  assert.match(html, /id="boutique-selections"/, 'House Selections rendered');
  assert.match(html, /data-manual-tabs="true"/, 'House Selections strictly manual');
  assert.match(html, /id="gift-for-occasion"/, 'Gifting Atelier rendered');
  assert.match(html, /editorial-care/, 'Lahore House Standard rendered');
  assert.doesNotMatch(html, /data-testid="patron-voices-section"/, 'Patron Voices omitted when zero published order reviews exist');
  assert.doesNotMatch(html, /Usman Tariq|Zainab Malik|Dr\. Faisal|Store-published patron feedback/i, 'Hardcoded reviews & disclaimer absent without real data');
  assert.doesNotMatch(html, /animate-scroll|marquee/i, 'No scrolling marquee on live homepage');
  assert.doesNotMatch(html, /Kashmiri saffron/i, 'No unverified Kashmiri saffron claim on homepage');

  // Verify Patron Voices, TracingReviews & DarkReviews render ONLY admin-published real-order reviews
  const realOrderReview: PublishedPatronReview = {
    id: 'rev-order-ab-901',
    verifiedOrder: true,
    name_en: 'Tariq Mahmood',
    name_ur: 'طارق محمود',
    name_ar: 'طارق محمود',
    location: 'Model Town, Lahore',
    purchasedItem: 'Medjool Dates (500g)',
    headline: 'Fresh gift pack',
    review: 'Neat presentation box and fresh dates.',
    rating: 5,
    avatarInitials: 'TM',
    published: true,
  };
  const htmlWithRealReview = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <ThemeProvider>
        <LanguageProvider initialLanguage="en">
          <CatalogProvider initialProducts={PRODUCTS}>
            <MerchandisingProvider>
              <ProductMediaProvider>
                <CartProvider>
                  <StorefrontContentProvider initialPublishedReviews={[realOrderReview]}>
                    <HomePage />
                  </StorefrontContentProvider>
                </CartProvider>
              </ProductMediaProvider>
            </MerchandisingProvider>
          </CatalogProvider>
        </LanguageProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
  assert.match(htmlWithRealReview, /data-testid="patron-voices-section"/, 'Patron Voices renders when real published order reviews exist');
  assert.match(htmlWithRealReview, /Store-published patron feedback/, 'Disclaimer renders alongside real published feedback');
  assert.match(htmlWithRealReview, /Tariq Mahmood/, 'Real published patron review rendered');

  const emptyLegacyHtml = renderToStaticMarkup(
    <LanguageProvider initialLanguage="en">
      <StorefrontContentProvider>
        <AllBarkaTracingReviews />
        <AllBarkaDarkReviews />
      </StorefrontContentProvider>
    </LanguageProvider>,
  );
  assert.equal(emptyLegacyHtml, '', 'AllBarkaTracingReviews and AllBarkaDarkReviews render nothing without real published reviews');

  const populatedLegacyHtml = renderToStaticMarkup(
    <LanguageProvider initialLanguage="en">
      <StorefrontContentProvider initialPublishedReviews={[realOrderReview]}>
        <AllBarkaTracingReviews />
        <AllBarkaDarkReviews />
      </StorefrontContentProvider>
    </LanguageProvider>,
  );
  assert.match(populatedLegacyHtml, /data-testid="tracing-reviews"/, 'TracingReviews renders real published order reviews');
  assert.match(populatedLegacyHtml, /data-testid="dark-reviews"/, 'DarkReviews renders real published order reviews');
  assert.match(populatedLegacyHtml, /Tariq Mahmood/, 'Real order review author rendered in legacy review views');
  assert.doesNotMatch(populatedLegacyHtml, /unsplash\.com|Usman Tariq|Zainab Malik/i, 'No hardcoded seed names or stock URLs');

  const bannedHealth = /\b(antimicrobial|antioxidant|anti-inflammatory|immunity|immun\w*|cures?|heals?|detox|medicinal|sugar\s*control|diabet\w*|cancer|boosts?\s+(?:energy|immunity|brain|health))\b/i;
  for (const product of PRODUCTS) {
    const visibleFields = [
      product.desc_en,
      product.desc_ur,
      product.desc_ar,
      product.health_en,
      product.health_ur,
      product.health_ar,
      product.recipe_en,
      product.recipe_ur,
      product.recipe_ar,
      product.tag_en,
      product.tag_ur,
      product.tag_ar,
    ].filter(Boolean) as string[];
    for (const val of visibleFields) {
      assert.doesNotMatch(val, bannedHealth, `Health wording found in ${product.id}: ${val}`);
    }
  }
});
