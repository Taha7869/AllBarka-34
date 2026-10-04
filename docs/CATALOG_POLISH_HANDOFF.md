# Catalog polish progress

Branch: `codex/master-catalog-polish-20261004`, based on latest main `a6494d2`.
The actual catalog has 89 products: 32 established selections and 57 additions.
Prices, portions, categories, names and canonical pricing are preserved.

- Phase 1 complete: invalid custom weights show an em dash; purchase stays disabled. Nearest valid step is an explicit choice. Eligible 1kg/5kg shortcuts use canonical weight validation. Full offline suite passed (42 test files, backend, asset and 47 production checks). Browser interaction passed for empty, 4999g, 99g, 5050g, correction and both shortcuts.
- Phase 2 complete: 57 additions have localized origin tags; named regions are used only where supported by the name, otherwise Pakistan packing is stated. Both card layouts use the same origin field as category/search/wishlist and comparison views.
- Phase 3 complete: Herbs & Spices/saffron (20), dry fruits/nuts/essentials (26), snacks/seeds (13), oils (15), bundles/established duos (15): all 89 products have specific use, storage, sourcing, packaging and allergen content in English, Urdu and Arabic. Storage windows describe quality rotation, with earlier printed dates taking priority. Batch ingredients and cosmetic versus food-grade oil labels still require owner verification; no medical or unverified certification claims were added.
- Phase 4 complete: all 57 generated SVGs refined with ingredient-specific illustration detail, warm cream stone, ivory ceramics and emerald cloth. Added 57 secondary pack/presentation SVGs using the same gallery component. All 114 assets passed 873 measured text bounds (6% safe area, exact complete English/Urdu/Arabic labels, local shaped fonts). Original photo assets and galleries are untouched. Full offline suite passed (44 test files, backend, assets and 47 production checks).
- Phase 5 complete: guardrails require direct origin fields in all three languages, exact care coverage for every product, no placeholder care copy, 2–3 suggested-use sentences, translated care sections, current packaging portions, complete two-image galleries and measured text bounds. Weight regressions cover empty/invalid/decimal input, non-finite quantities, nearest-step suggestions and both eligible shortcuts. A generator resume with no pending products preserves its saved audit report.

## Final verification

- `npm run typecheck`: passed.
- `npm test`: production build passed; all 44 test files passed (454 Node tests, 0 failures), with the legacy hardening checks also passing.
- Separate backend suite: 21 passed, 0 failed. Offline production checks: 47 passed.
- Asset audit: 89 products, 164 image references, no missing files.
- Browser: 12 mobile/desktop × English/Urdu/Arabic × light/dark checks passed. The second gallery image loads, its arrows update the counter without navigating, the grid fits both viewports, and there were 0 page errors. Empty, 4999g, 99g, 5050g and decimal weights disable purchase without NaN; explicit correction, 1kg and 5kg selection update the actual input and canonical price.
- Preservation comparison against main `a6494d2`: all 89 products retain names, categories, prices, portions, custom rates, shipping weights and primary image paths. Original photos, media manifest, bundled fonts and canonical pricing files are unchanged.
- Image report: 57 primaries upgraded + 57 second views; 873 measured text boxes, 0 overflows. Category coverage: herbs/spices 19, dry fruits/nuts 14, snacks/seeds 9, oils 2, bundles 13.
- `git diff --check`: passed.

## Review notes

- Catalog count corrected from the brief's 62 to the repository's actual 89. No product or price was added/removed. Medjool is described as a variety, not an invented country of origin.
- Owner should confirm actual batch dates, supplier ingredient/allergen declarations and food/cosmetic oil grades. The copy identifies unknown provenance and batch-dependent details instead of inventing them. See `CATALOG_CARE_SOURCES.md` for the storage/allergen basis.
- At a 1280px desktop width, the unchanged header extends the page by 3px. The catalog grid and cards fit correctly at 430px and 1280px. This pre-existing header layout issue is outside this catalog task and remains for a separate layout pass.
- Existing checkout, coupon, auth, Firebase, n8n and WhatsApp logic was not modified. Live integrations were not exercised by these offline checks.

All five requested phases are complete. Draft PR: https://github.com/Taha7869/AllBarka-34/pull/9.

No merge or deployment is part of this task.
