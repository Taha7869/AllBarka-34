import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { MerchandisingProvider } from '../src/contexts/MerchandisingContext';
import { DEFAULT_MERCHANDISING } from '../src/config/merchandising';
import { validateMerchandisingSettings } from '../src/lib/catalogSchema';
import {
  SEASONAL_THEMES,
  SEASONAL_THEME_CONFIGS,
  getSeasonalTheme,
  resolveActiveSeason,
} from '../src/lib/seasonalHomepage';
import AllBarkaHero from '../src/components/AllBarkaHero';
import CategoryCarousel from '../src/components/CategoryCarousel';
import type { MerchandisingSettings } from '../src/types';

test('resolveActiveSeason honors explicit admin override over any calendar date', () => {
  const summerDate = new Date('2026-07-15T12:00:00Z');
  for (const season of SEASONAL_THEMES) {
    assert.equal(resolveActiveSeason(season, summerDate), season);
  }
  // Explicit default disables auto seasonal theme even during winter
  assert.equal(resolveActiveSeason('default', new Date('2026-12-20T12:00:00Z')), null);
});

test('resolveActiveSeason automatically detects Ramadan, Eid, Sardi, Shaadi, and evergreen Default by calendar date', () => {
  // Ramadan 1447 AH falls in Feb-Mar 2026 (2026-02-25 is mid-Ramadan)
  assert.equal(resolveActiveSeason('auto', new Date('2026-02-25T12:00:00Z')), 'ramadan');
  // Eid-ul-Fitr 1447 AH (2026-03-21 is ~1-2 Shawwal)
  assert.equal(resolveActiveSeason('auto', new Date('2026-03-21T12:00:00Z')), 'eid');
  // Eid-ul-Adha 1447 AH (2026-05-27 is ~10 Dhul Hijjah)
  assert.equal(resolveActiveSeason('auto', new Date('2026-05-27T12:00:00Z')), 'eid');
  // Sardi (Winter): December / January outside Ramadan & Eid
  assert.equal(resolveActiveSeason('auto', new Date('2026-12-20T12:00:00Z')), 'sardi');
  assert.equal(resolveActiveSeason('auto', new Date('2027-01-10T12:00:00Z')), 'sardi');
  // Shaadi season: November outside Ramadan & Eid
  assert.equal(resolveActiveSeason('auto', new Date('2026-11-15T12:00:00Z')), 'shaadi');
  // Evergreen default: mid-July outside Eid
  assert.equal(resolveActiveSeason('auto', new Date('2026-07-15T12:00:00Z')), null);
});

test('all seasonal themes have EN/UR/AR copy, valid internal links, and zero health claims', () => {
  const forbidden = /\b(cures?|heals?|prevents?|treats?|boosts?|immunity|diabetes|cancer)\b/i;
  for (const id of SEASONAL_THEMES) {
    const cfg = SEASONAL_THEME_CONFIGS[id];
    assert.ok(cfg.primaryCtaPath.startsWith('/'));
    assert.ok(cfg.secondaryCtaPath.startsWith('/'));
    assert.ok(cfg.categoryOrder.length >= 10);

    for (const field of [
      cfg.label,
      cfg.eyebrow,
      cfg.headlinePart1,
      cfg.headlineAccent,
      cfg.description,
      cfg.primaryCtaLabel,
      cfg.secondaryCtaLabel,
    ]) {
      for (const lang of ['en', 'ur', 'ar'] as const) {
        assert.ok(field[lang].trim().length > 0, `${id}.${lang} should be non-empty`);
        assert.doesNotMatch(field[lang], forbidden, `${id}.${lang} must not contain health claims`);
      }
      assert.match(field.ur, /[\u0600-\u06ff]/);
      assert.match(field.ar, /[\u0600-\u06ff]/);
    }
  }
});

test('validateMerchandisingSettings preserves valid seasonalMode and rejects invalid values', () => {
  const parsed = validateMerchandisingSettings({
    ...DEFAULT_MERCHANDISING,
    seasonalMode: 'ramadan',
  });
  assert.equal(parsed.seasonalMode, 'ramadan');

  const fallback = validateMerchandisingSettings({
    ...DEFAULT_MERCHANDISING,
    seasonalMode: undefined,
  });
  assert.equal(fallback.seasonalMode, 'auto');

  assert.throws(
    () =>
      validateMerchandisingSettings({
        ...DEFAULT_MERCHANDISING,
        seasonalMode: 'halloween',
      }),
    (err: any) => err?.code === 'INVALID_SEASONAL_MODE',
  );
});

test('AllBarkaHero renders seasonal EN/UR/AR hero copy and CTAs for admin override and date-driven auto mode', () => {
  const ramadanSettings: MerchandisingSettings = {
    ...DEFAULT_MERCHANDISING,
    seasonalMode: 'ramadan',
  };

  for (const [lang, expectedText] of [
    ['en', 'Shop Ramadan Dates'],
    ['ur', 'رمضان کھجوریں دیکھیں'],
    ['ar', 'تسوق تمور رمضان'],
  ] as const) {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LanguageProvider initialLanguage={lang}>
          <MerchandisingProvider initialSettings={ramadanSettings}>
            <AllBarkaHero />
          </MerchandisingProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );
    assert.match(html, /data-season="ramadan"/);
    assert.ok(html.includes(expectedText), `Expected ${lang} hero CTA "${expectedText}"`);
    assert.ok(html.includes('href="/shop/dates"'));
  }

  // Date-driven auto mode in winter (Sardi)
  const autoHtml = renderToStaticMarkup(
    <MemoryRouter>
      <LanguageProvider initialLanguage="en">
        <MerchandisingProvider initialSettings={{ ...DEFAULT_MERCHANDISING, seasonalMode: 'auto' }}>
          <AllBarkaHero seasonalDate={new Date('2026-12-20T12:00:00Z')} />
        </MerchandisingProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
  assert.match(autoHtml, /data-season="sardi"/);
  assert.ok(autoHtml.includes('Shop Winter Dry Fruits'));
});

test('CategoryCarousel applies seasonal collection priority for Ramadan, Eid, Shaadi, and Sardi', () => {
  const renderCarousel = (settings: MerchandisingSettings, date?: Date) =>
    renderToStaticMarkup(
      <MemoryRouter>
        <LanguageProvider initialLanguage="en">
          <CategoryCarousel settings={settings} seasonalDate={date} />
        </LanguageProvider>
      </MemoryRouter>,
    );

  const ramadanHtml = renderCarousel({ ...DEFAULT_MERCHANDISING, seasonalMode: 'ramadan' });
  const rDates = ramadanHtml.indexOf('href="/shop/dates"');
  const rOils = ramadanHtml.indexOf('href="/shop/oils"');
  assert.ok(rDates !== -1 && rOils !== -1 && rDates < rOils, 'Ramadan puts dates ahead of oils');

  const eidHtml = renderCarousel({ ...DEFAULT_MERCHANDISING, seasonalMode: 'eid' });
  const eGifts = eidHtml.indexOf('href="/gifting"');
  const eSpices = eidHtml.indexOf('href="/shop/herbs-spices"');
  assert.ok(eGifts !== -1 && eSpices !== -1 && eGifts < eSpices, 'Eid puts gift boxes ahead of spices');

  const shaadiHtml = renderCarousel({ ...DEFAULT_MERCHANDISING, seasonalMode: 'shaadi' });
  const shCeleb = shaadiHtml.indexOf('href="/shop/celebration-boxes"');
  const shOils = shaadiHtml.indexOf('href="/shop/oils"');
  assert.ok(shCeleb !== -1 && shOils !== -1 && shCeleb < shOils, 'Shaadi puts celebration boxes ahead of oils');

  const sardiTheme = getSeasonalTheme('sardi');
  assert.ok(sardiTheme && sardiTheme.categoryOrder[0] === 'dry-fruits');
});
