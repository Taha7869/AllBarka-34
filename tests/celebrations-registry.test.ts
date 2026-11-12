import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CELEBRATION_ALIASES, CELEBRATION_BRANCHES, CELEBRATION_DESIGNS, CELEBRATION_OCCASIONS, CELEBRATION_RANGES, PACKAGING_FORMATS,
  designsForOccasion, getBranch, getFormat, getOccasion, isOccasionPublished, resolveFormatSlug, resolveOccasionRoute, resolveOccasionSlug,
} from '../src/config/celebrations';
import { normalizeOccasionSlug } from '../src/config/categories';
import { routeMetadata } from '../src/lib/routeDocument';

const registerRows = readFileSync(new URL('../docs/celebrations/NAMING_REGISTER.md', import.meta.url), 'utf8')
  .split('\n')
  .map(line => line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim()))
  .filter(cells => cells.length === 8 && ['branch', 'occasion', 'range', 'format'].includes(cells[0]))
  .map(([kind, slug, signature, , , plain]) => ({ kind, slug: slug.replaceAll('`', ''), signature, plain }));

test('registry matches the owner-approved naming register', () => {
  assert.equal(registerRows.filter(row => row.kind === 'branch').length, CELEBRATION_BRANCHES.length);
  assert.equal(registerRows.filter(row => row.kind === 'occasion').length, CELEBRATION_OCCASIONS.length);
  assert.equal(registerRows.filter(row => row.kind === 'range').length, CELEBRATION_RANGES.length);
  for (const row of registerRows) {
    const entry = row.kind === 'branch' ? getBranch(row.slug)
      : row.kind === 'occasion' ? getOccasion(row.slug)
      : row.kind === 'range' ? CELEBRATION_RANGES.find(item => item.slug === row.slug)
      : getFormat(row.slug);
    assert.ok(entry, `${row.kind} ${row.slug} is in the registry`);
    assert.equal(entry.plain.en, row.plain, `${row.slug} plain name`);
    if ('signature' in entry) assert.equal(entry.signature.en, row.signature, `${row.slug} signature name`);
  }
});

test('registry is internally consistent', () => {
  const slugs = [...CELEBRATION_BRANCHES, ...CELEBRATION_OCCASIONS, ...CELEBRATION_RANGES].map(item => item.slug);
  assert.equal(new Set(slugs).size, slugs.length, 'branch, occasion and range slugs are unique');
  assert.equal(new Set(PACKAGING_FORMATS.map(item => item.slug)).size, PACKAGING_FORMATS.length, 'format slugs are unique');
  for (const item of [...CELEBRATION_OCCASIONS, ...CELEBRATION_RANGES]) assert.ok(getBranch(item.branch), `${item.slug} has a real branch`);
  for (const item of [...CELEBRATION_BRANCHES, ...CELEBRATION_OCCASIONS]) {
    for (const language of ['en', 'ur', 'ar'] as const) {
      assert.ok(item.signature[language] && item.signature[language] !== '—', `${item.slug} signature ${language}`);
      assert.ok(item.plain[language], `${item.slug} plain ${language}`);
    }
  }
  for (const design of CELEBRATION_DESIGNS) {
    assert.ok(getBranch(design.branch), `${design.slug} branch`);
    if (design.occasion) assert.ok(getOccasion(design.occasion), `${design.slug} occasion`);
    for (const format of design.formats) assert.ok(getFormat(format), `${design.slug} format ${format}`);
    assert.ok(design.finishes.includes('standard'), `${design.slug} always offers standard print`);
    if (design.publishApproved) assert.ok(design.image, `${design.slug} cannot be published without an image`);
  }
  assert.equal(new Set(CELEBRATION_DESIGNS.map(item => item.slug)).size, CELEBRATION_DESIGNS.length, 'design slugs are unique');
  assert.equal(new Set(CELEBRATION_DESIGNS.map(item => item.imageId)).size, CELEBRATION_DESIGNS.length, 'each design has its own manifest row');
  for (const occasion of CELEBRATION_OCCASIONS) assert.ok(CELEBRATION_DESIGNS.some(item => item.occasion === occasion.slug), `${occasion.slug} has a design brief`);
  for (const [alias, target] of Object.entries(CELEBRATION_ALIASES)) {
    if (target.startsWith('/occasions/')) assert.ok(getOccasion(target.slice(11)), `alias ${alias} points at a real occasion`);
    else if (target.startsWith('/packaging/')) assert.ok(getFormat(target.slice(11)), `alias ${alias} points at a real format`);
  }
});

test('occasion routes keep selling pages and gate unpublished occasions', () => {
  const route = (slug: string, preview = false) => resolveOccasionRoute(slug, normalizeOccasionSlug(slug), preview);

  assert.deepEqual(resolveOccasionSlug('pehla-moti'), { slug: 'first-tooth', viaAlias: true });
  assert.deepEqual(resolveOccasionSlug('pregnancy-announcement'), { slug: 'baby-on-the-way', viaAlias: true });
  assert.deepEqual(resolveFormatSlug('tin'), { slug: 'tins', viaAlias: true });
  assert.equal(resolveFormatSlug('not-a-format'), null);

  // Existing ready-to-order listings are untouched while no design is approved.
  assert.equal(route('wedding').kind, 'legacy');
  for (const slug of ['mehndi', 'umrah', 'ramadan', 'nikkah', 'aqeeqah']) {
    const resolved = route(slug);
    assert.equal(resolved.kind, 'legacy', `${slug} still opens its ready-to-order listing`);
    assert.ok(resolved.kind === 'legacy' && resolved.occasion, `${slug} carries its new occasion for the context note`);
  }

  // An occasion with no approved design is an enquiry page, never an empty grid.
  const unpublished = CELEBRATION_OCCASIONS.find(item => !isOccasionPublished(item.slug) && !normalizeOccasionSlug(item.slug)?.match(/^(wedding|umrah|ramadan|birth|corporate)$/));
  assert.ok(unpublished);
  assert.equal(route(unpublished.slug).kind, 'request');
  const viaSignature = route('pehla-moti');
  assert.ok(viaSignature.kind === 'request' && viaSignature.redirectTo === '/occasions/first-tooth');
  assert.equal(route('definitely-not-an-occasion').kind, 'unknown');

  // Unpublished concepts are visible only through the owner preview.
  const concept = CELEBRATION_DESIGNS.find(item => item.occasion && !item.publishApproved);
  if (concept?.occasion) {
    assert.equal(designsForOccasion(concept.occasion).length, 0);
    assert.equal(route(concept.occasion, true).kind, 'occasion');
  }
});

test('server metadata indexes hubs and withholds unpublished pages', () => {
  const meta = (path: string) => routeMetadata(path, 'https://allbarka.com', []);
  assert.equal(meta('/occasions').status, 200);
  assert.notEqual(meta('/occasions').noindex, true);
  assert.equal(meta('/packaging').status, 200);
  assert.equal(meta('/occasions/wedding').status, 200);
  assert.notEqual(meta('/occasions/wedding').noindex, true);
  const request = meta('/occasions/pehla-moti');
  assert.equal(request.status, 200);
  assert.equal(request.path, '/occasions/first-tooth');
  assert.equal(request.noindex, true);
  assert.equal(meta('/packaging/tin').path, '/packaging/tins');
  assert.equal(meta('/packaging/tin').noindex, true);
  assert.equal(meta('/designs/gul-e-ahd').noindex, true);
  assert.equal(meta('/designs/nope').status, 404);
});
