# Catalog polish progress

Branch: `codex/master-catalog-polish-20261004`, based on latest main `a6494d2`.
The actual catalog has 89 products: 32 established selections and 57 additions.
Prices, portions, categories, names and canonical pricing are preserved.

## Single-image follow-up — complete (4 October)

The owner's latest instruction supersedes the two-view gallery described in the original Phase 4/5 record below. All 57 generated placeholder products now have exactly one final SVG cover. All 32 established photographic products retain their original files, covers and ordered galleries, including the five highlighted brand references.

- Cream stone, ivory ceramic, emerald cloth and common lighting/shadows remain consistent. Ingredient silhouettes distinguish sticks, pods, kernels, fruit, leaves and powders. Oils retain the established white-cap bottle silhouette; bundles show emerald/gold compartment hampers. Unspecified hamper selections stay wrapped rather than inventing ingredients.
- The approved English/Urdu/Arabic raster label panels are byte-identical to the previous commit. Names, prices, categories, portions, care content, origin tags and shipping data did not change.
- Removed 57 `*-secondary.svg` files and their gallery references. Added 57 single-cover entries to the media manifest; its 32 existing photo entries are unchanged. Retired stored pack-view overrides cannot restore deleted images; owner cover replacements and videos remain supported.
- Single-image cards, Quick View and detail photo viewer show no carousel arrows, thumbnails or image counter. Zoom remains available. Established photo galleries retain their existing controls and counter behavior.
- Counts: generated SVGs **114 → 57**; total product-gallery image references **164 → 107**; unique referenced product image files **160 → 103**. There are **0 missing files** and **0 retired generated views**.
- Text audit: **57 SVGs, 403 measured text boxes, 0 overflows** under the 6% safe-area rule. Every full approved name fits in one or two lines, with local Urdu/Arabic fonts successfully loaded.
- Verification: TypeScript passed; final production build and full offline suite passed (**44 test files, 457 Node tests, 21 backend checks, 47 production checks**, plus legacy hardening checks). Browser verification passed **12 mobile/desktop × EN/UR/AR × light/dark card/Quick View cases**, **6 detail/viewer gallery cases**, single-image zoom and preserved weight-selection regressions, with **0 page errors**.
- Preservation audit: all 89 products retain their business data; all 32 original manifest entries and their 50 photo references match commit `e0929e4`. Original photography, fonts, care and canonical pricing files are unchanged.

Files changed in this follow-up (**134**): 57 primary SVGs refreshed, 57 secondary SVGs removed, 5 overflow reports updated; `scripts/catalog-image-scenes.mjs`, `scripts/generate-catalog-images.mjs`, `scripts/verify-catalog-assets.ts`; `src/data/productImages.ts`, `src/data/product-media.json`, `src/lib/productMedia.ts`, `src/pages/ProductDetailPage.tsx`, `src/components/ProductPhotoViewer.tsx`; six catalog/media test files and this handoff. Local browser screenshots and temporary verification scripts are ignored and not committed.

Existing draft PR: https://github.com/Taha7869/AllBarka-34/pull/9. No merge or deployment.

## Original catalog polish record

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
