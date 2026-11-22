import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import PremiumHeroPrototype, {
  PREMIUM_HERO_COPY,
  PREMIUM_HERO_IMAGE,
} from '../src/components/PremiumHeroPrototype';
import PremiumHomePreviewPage from '../src/pages/PremiumHomePreviewPage';

test('PremiumHeroPrototype renders EN, UR (RTL), and AR (RTL) copy with zero health claims and valid links', () => {
  const forbiddenHealthClaims = /\b(cures?|heals?|prevents?|treats?|boosts?|immunity|diabetes|cancer)\b/i;

  for (const lang of ['en', 'ur', 'ar'] as const) {
    const copy = PREMIUM_HERO_COPY[lang];
    for (const text of [
      copy.eyebrow,
      copy.headlineLead,
      copy.headlineAccent,
      copy.description,
      copy.primaryCta,
      copy.secondaryCta,
      copy.caption,
      ...copy.pillars,
    ]) {
      assert.ok(text.trim().length > 0, `${lang} hero copy must be non-empty`);
      assert.doesNotMatch(text, forbiddenHealthClaims, `${lang} copy must never make health claims`);
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
    assert.match(html, /data-testid="premium-hero-lid"/, 'Signature lid overlay renders when motion is allowed');
  }
});

test('PremiumHeroPrototype renders static hero photograph without lid overlay under prefers-reduced-motion', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/preview/premium-home']}>
      <LanguageProvider initialLanguage="en">
        <PremiumHeroPrototype reducedMotionOverride={true} />
      </LanguageProvider>
    </MemoryRouter>,
  );

  assert.match(html, /data-reveal-phase="open"/);
  assert.doesNotMatch(html, /data-testid="premium-hero-lid"/);
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
