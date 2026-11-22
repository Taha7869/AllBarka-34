import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SECTION_COVER_IDS, SECTION_COVERS, getSectionCover, sectionCoverSrcSet } from '../src/config/sectionCovers';
import { PANTRY_CATEGORIES } from '../src/components/CategoryCarousel';
import { catalogTranslations } from '../src/contexts/catalogTranslations';
import { CANONICAL_CATEGORIES } from '../src/config/categories';
import { routeMetadata } from '../src/lib/routeDocument';
import { PRODUCTS } from '../src/data/products';

test('all 13 section covers exist on disk in both 1600w and 800w WebP with EN/UR/AR alt text', () => {
  assert.equal(SECTION_COVER_IDS.length, 13);
  for (const id of SECTION_COVER_IDS) {
    const asset = SECTION_COVERS[id];
    assert.equal(asset.src, `/images/section-covers-20261120/${id}.webp`);
    assert.equal(asset.src800, `/images/section-covers-20261120/${id}-800.webp`);
    assert.equal(asset.srcSet, `${asset.src800} 800w, ${asset.src} 1600w`);
    assert.equal(sectionCoverSrcSet(asset.src), asset.srcSet);

    const file1600 = `public${asset.src}`;
    const file800 = `public${asset.src800}`;
    assert.ok(fs.existsSync(file1600), `Missing 1600w cover: ${file1600}`);
    assert.ok(fs.existsSync(file800), `Missing 800w cover: ${file800}`);
    assert.ok(fs.statSync(file1600).size > 20_000, `1600w cover too small: ${file1600}`);
    assert.ok(fs.statSync(file800).size > 10_000 && fs.statSync(file800).size < fs.statSync(file1600).size, `800w cover size invalid: ${file800}`);

    for (const lang of ['en', 'ur', 'ar'] as const) {
      const alt = catalogTranslations[lang][asset.altKey];
      assert.ok(typeof alt === 'string' && alt.trim().length > 15, `Missing ${lang} alt text for ${asset.altKey}`);
    }
  }
});

test('all PANTRY_CATEGORIES and canonical categories resolve to studio section covers with zero legacy category paths', () => {
  assert.ok(PANTRY_CATEGORIES.length >= 13);
  for (const slide of PANTRY_CATEGORIES) {
    assert.ok(slide.image.startsWith('/images/section-covers-20261120/'), `${slide.id} still uses legacy or empty image: ${slide.image}`);
    assert.ok(slide.image.endsWith('.webp'), `${slide.id} must use .webp`);
    assert.ok(sectionCoverSrcSet(slide.image), `${slide.id} must produce responsive srcSet`);
    assert.ok(fs.existsSync(`public${slide.image}`), `Missing cover file for ${slide.id}: ${slide.image}`);
    assert.ok(catalogTranslations.en[slide.altKey], `Missing EN altKey ${slide.altKey} for ${slide.id}`);
    assert.ok(catalogTranslations.ur[slide.altKey], `Missing UR altKey ${slide.altKey} for ${slide.id}`);
    assert.ok(catalogTranslations.ar[slide.altKey], `Missing AR altKey ${slide.altKey} for ${slide.id}`);
  }

  for (const catId of Object.keys(CANONICAL_CATEGORIES)) {
    const cover = getSectionCover(catId);
    assert.ok(cover, `Canonical category ${catId} has no section cover`);
    const meta = routeMetadata(`/shop/${catId}`, 'https://allbarka.com', PRODUCTS);
    assert.equal(meta.status, 200);
    assert.equal(meta.image, cover.src, `SSR OG image mismatch for /shop/${catId}`);
  }
});
