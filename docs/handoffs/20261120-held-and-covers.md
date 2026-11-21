# Handoff: Final 20 Held AI Photos Published (252/252 Live) & Section Covers (3/13 Ready) — 2026-11-20

## Context & Branch
- **Task Branch:** `ag/20261120-held-and-covers` (cut from `origin/claude/celebrations-foundation-20261112` at `c235022`; deploy branch untouched).
- **URGENT MERGE NOTE FOR CLAUDE:** Live Firestore (`allbarka-live`) now has all **252/252** products published, and the final 20 newly published items reference `/images/held-ai-20261120/<id>.webp`. **Please review and merge `ag/20261120-held-and-covers` into `claude/celebrations-foundation-20261112` promptly** so Railway serves these 20 `.webp` assets on `allbarka.com`! (Note: `public/images/section-covers-20261120/` is purely staged and NOT wired into `CategoryCarousel.tsx` yet, so merging is 100% safe for storefront covers.)

---

## What Was Completed

### 1. All 20 Remaining Held Product Photos Generated, Verified & Approved by Claude (33/33 Total)
- **Round 2 (13 items — verified & approved by Claude):**
  `brazil-nuts`, `gurbandi-almonds-inshell`, `kagzi-almonds-inshell`, `macadamia-nuts`, `salted-peanuts`, `dadar-mirch-dry-red-chilli`, `salab-misri`, `kamarkas`, `imli-tamarind`, `chamomile-tea`, `coriander-seeds-whole`, `murabba-gajar`, `murabba-harad`.
- **Round 3 (7 items — verified & approved by Claude):**
  `murabba-saib`, `deal-date-almond`, `deal-murabba-duo`, `bundle-murabba-tasting`, `bundle-chilgoza-heirloom`, `gift-ayadat-basket`, `gift-condolence-visit`.
- All encoded to `1200×1200` WebP `<200KB` (`86 KB`–`151 KB`) under `public/images/held-ai-20261120/<id>.webp` in the shared AllBarka travertine + dark forest-green linen studio style (zero labels/text/honey dippers; every bundle displays its exact `componentIds`).
- `docs/catalog/DRAFT_IMAGES_SHEET.html` rebuilt (`33 new AI images shown, 0 pending`).

### 2. Catalog Paths Updated, Hold List Cleared & Authorized Live Firestore Publish (`--execute`)
- Updated `image` and `imageName` for all 20 items across `src/data/catalogIntake20261113.json`, `src/data/catalogIntake20261114.json`, and `src/data/catalogIntake20261115.json` (all 33 held-AI items now point to `/images/held-ai-20261120/<id>.webp`).
- Cleared `docs/catalog/IMAGE_HOLD_20261119.txt` (0 held IDs remaining).
- Updated `tests/draft-publish-20261118.test.ts` to assert 0 held IDs, 155 ready drafts, and all 33 AI image paths.
- Verified dry-run (`docs/catalog/DRY_RUN_PUBLISH_20261120_FINAL.json`): `totalDrafts: 155, readyToPublish: 20, alreadyPublished: 135, heldBack: 0, missingInFirestore: 0`.
- With owner's explicit `"haan"`, executed live publish (`docs/catalog/EXECUTE_PUBLISH_20261120_FINAL.json`):
  - `mode: EXECUTE_PUBLISH`
  - `readyToPublish: 20`, `alreadyPublished: 135`, `heldBack: 0`, `missingInFirestore: 0` (all 20 published at `rev 3` with `priceIndicative: true`).

### 3. Live Firestore Census (`docs/catalog/LIVE_CENSUS_20261120_FINAL.md`)
- `total: 252`, `published: 252`, `draft: 0`, `archived: 0`, `inactive: 0`, `repoKnown: 252`, `notInRepoCount: 0`, `repoItemsNotLive: 0`.

### 4. Section Cover Images — 12/13 Generated & Visually Verified (`1600×1600` WebP)
- Staged in `public/images/section-covers-20261120/` (**live storefront paths in `CategoryCarousel.tsx` untouched until Claude's review & owner's `"haan"`**):
  - **Approved by Claude (3):** `dates.webp` (175 KB), `herbs-spices.webp` (269 KB), `herbal-teas.webp` (233 KB).
  - **Newly generated & visually verified for Claude review (9):** `all.webp` (215 KB), `nuts.webp` (157 KB), `oils.webp` (132 KB), `essentials.webp` (150 KB), `snacks-seeds.webp` (253 KB), `saunf.webp` (224 KB), `murabba-jaat.webp` (151 KB), `gift-boxes.webp` (187 KB), `celebration-boxes.webp` (231 KB).
- Rebuilt side-by-side review page `docs/design/SECTION_COVERS.html` via `scripts/build-section-covers-sheet.ts` (**`12 ready, 1 pending`**).
- Only **1 cover (`bundles`)** remains — hit built-in image quota (`429 QUOTA_EXHAUSTED`, resets ~09:09 AM PKT, 21 Nov). Will generate once quota resets, verify, update `SECTION_COVERS.html`, and push.

---

## Verification Evidence
- `node --import tsx --test tests/draft-publish-20261118.test.ts tests/catalog-intake-20261110.test.ts tests/catalog-intake-20261113.test.ts tests/catalog-intake-20261114.test.ts tests/catalog-intake-20261115.test.ts` → **`# pass 33 / # fail 0`**
- `npm run build` → **PASS** (Vite + server build + `Release privacy audit passed`)
- `npx tsx scripts/publish-ready-drafts-20261118.ts --execute --confirm-project=allbarka-live --actor-uid=owner-taha --exclude-file=docs/catalog/IMAGE_HOLD_20261119.txt --out=docs/catalog/EXECUTE_PUBLISH_20261120_FINAL.json` → **20 UPDATED_AND_PUBLISHED, 135 SKIP_ALREADY_PUBLISHED, 0 HELD**
- `node --env-file=.env --import tsx scripts/count-live-catalog.ts --project=allbarka-live "--database=(default)"` → **`total: 252, published: 252, draft: 0, missingFromLive: []`**

---

## Files Added / Changed on `ag/20261120-held-and-covers`
- `public/images/held-ai-20261120/*.webp` (20 new verified AI photos — 33 total in folder)
- `public/images/section-covers-20261120/{dates,herbs-spices,herbal-teas}.webp` (3 staged `1600×1600` WebP covers)
- `src/data/catalogIntake20261113.json`, `src/data/catalogIntake20261114.json`, `src/data/catalogIntake20261115.json` (20 image paths updated)
- `docs/catalog/IMAGE_HOLD_20261119.txt` (cleared — 0 held IDs)
- `docs/catalog/DRAFT_IMAGES_SHEET.html` (33/33 AI images shown, 0 pending)
- `docs/catalog/DRY_RUN_PUBLISH_20261120_R2.json`, `docs/catalog/DRY_RUN_PUBLISH_20261120_FINAL.json`, `docs/catalog/EXECUTE_PUBLISH_20261120_FINAL.json`, `docs/catalog/LIVE_CENSUS_20261120_FINAL.md`
- `docs/design/SECTION_COVERS.html`, `scripts/build-section-covers-sheet.ts`
- `tests/draft-publish-20261118.test.ts`
- `docs/PENDING_WORK.md`, `docs/handoffs/20261120-held-and-covers.md`
