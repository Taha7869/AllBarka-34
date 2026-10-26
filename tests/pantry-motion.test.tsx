import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import CategoryCarousel, { PANTRY_CATEGORIES } from '../src/components/CategoryCarousel';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { DEFAULT_MERCHANDISING } from '../src/config/merchandising';
import { trendTranslations } from '../src/contexts/trendTranslations';
import { canRotatePantry, pantryCardProjection, pantryRotationDistance } from '../src/lib/pantryMotion';

test('continuous pacing is refresh-rate independent, eases into motion and cannot jump after a stalled frame', () => {
  assert.equal(pantryRotationDistance(16, 2000), pantryRotationDistance(8, 2000) * 2);
  assert.equal(pantryRotationDistance(16, 0), 0);
  assert.ok(Math.abs(pantryRotationDistance(16, 450)) < Math.abs(pantryRotationDistance(16, 900)));
  assert.equal(pantryRotationDistance(10000, 2000), pantryRotationDistance(48, 2000));
  assert.equal(pantryRotationDistance(1000 / 60, 2000) * 60, -24);
  for (const invalid of [[NaN, 1], [16, Infinity], [-1, 1000], [16, -1]]) assert.equal(pantryRotationDistance(...invalid as [number, number]), 0);
});

test('reading, interaction, offscreen rails, background tabs and reduced motion stop the continuous tour', () => {
  const active = { reducedMotion: false, inView: true, interacting: false, hovered: false, focusWithin: false, pageVisible: true };
  assert.equal(canRotatePantry(active), true);
  for (const state of [{ inView: false }, { interacting: true }, { reducedMotion: true }, { hovered: true }, { focusWithin: true }, { pageVisible: false }]) {
    assert.equal(canRotatePantry({ ...active, ...state }), false);
  }
  assert.equal(canRotatePantry({ ...active, interacting: false }), true, 'the end of a reading interval restores motion without a resume control');
});

test('collection projection stays restrained and reduced motion removes the curve', () => {
  const left = pantryCardProjection(-1), right = pantryCardProjection(1);
  assert.equal(left.rotation, -right.rotation);
  assert.equal(left.rise, right.rise);
  assert.equal(left.scale, right.scale);
  assert.ok(pantryCardProjection(1000).scale >= .975);
  assert.deepEqual(pantryCardProjection(1, true), { rotation: 0, rise: 0, scale: 1, depth: 0 });
  assert.equal(Math.abs(pantryCardProjection(NaN).rotation), 0);
  assert.equal(pantryCardProjection(NaN).scale, 1);
});

test('the collection rail includes every canonical destination and retains manual navigation', () => {
  const html = renderToString(<MemoryRouter><LanguageProvider><CategoryCarousel /></LanguageProvider></MemoryRouter>);
  assert.equal((html.match(/class="editorial-pantry-slide"/g) || []).length, PANTRY_CATEGORIES.length);
  assert.equal((html.match(/class="editorial-pantry-slide"[^>]*aria-hidden="false"/g) || []).length, 1, 'unknown side peeks are inert before the first geometry pass');
  for (const path of PANTRY_CATEGORIES.map(category => category.link)) {
    assert.ok(html.includes(`href="${path}"`), `missing collection ${path}`);
  }
  assert.match(html, /aria-label="Browse collections"/);
  assert.match(html, /aria-label="Previous collections"/);
  assert.match(html, /aria-label="Next collections"/);
  assert.doesNotMatch(html, /Pause scroll-linked browsing|Resume scroll-linked browsing|aria-pressed=/);
  assert.match(html, /inert=""/);
  assert.doesNotMatch(html, /position:fixed|position:sticky|wheel=/);
});

test('continuous discovery and manual navigation are translated in all storefront languages', () => {
  for (const key of ['pantry.rotationHint', 'pantry.manualHint', 'pantry.previous', 'pantry.next']) {
    for (const language of ['en', 'ur', 'ar']) assert.ok(trendTranslations[language][key]?.trim());
    for (const language of ['ur', 'ar']) assert.match(trendTranslations[language][key], /[\u0600-\u06ff]/);
  }
});


test('collection badges follow destinations after merchant reordering and preserve explicit badges', () => {
  const settings = { ...DEFAULT_MERCHANDISING, categoryOrder: ['dates', 'oils', 'all', 'bundles'] };
  const render = (value: typeof settings) => renderToString(<MemoryRouter><LanguageProvider><CategoryCarousel settings={value} /></LanguageProvider></MemoryRouter>);
  const html = render(settings);
  const dates = html.match(/<a [^>]*href="\/shop\/dates"[^>]*>[\s\S]*?<\/a>/)?.[0];
  const all = html.match(/<a [^>]*aria-label="Full Boutique"[^>]*href="\/shop"[^>]*>[\s\S]*?<\/a>/)?.[0];
  assert.ok(dates);assert.doesNotMatch(dates, /Start Here|Better Together/i);
  assert.ok(all && /Start Here/i.test(all), 'all-items retains its badge after moving');
  const custom = render({ ...settings, collections: [{ collectionId: 'dates', title_en: 'Dates', badge: 'Seasonal', visible: true }] });
  assert.match(custom.match(/<a [^>]*href="\/shop\/dates"[^>]*>[\s\S]*?<\/a>/)?.[0] || '', /Seasonal/);
});
