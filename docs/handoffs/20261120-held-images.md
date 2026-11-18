# Handoff: Held-Item AI Product Images (Batch 1: 13/33 Live Published) — 2026-11-20

## Context & Branch
- **Task Branch:** `ag/20261120-held-images` (cut from `origin/claude/celebrations-foundation-20261112` at `53a1e27`).
- **Deploy Note for Claude (Important):** Live Firestore already points the 13 newly published items to `/images/held-ai-20261120/<id>.webp`. **Merge `ag/20261120-held-images` into `claude/celebrations-foundation-20261112` promptly** so Railway serves the 13 new `.webp` assets on `allbarka.com`!

---

## What Was Done
1. **Generated 13 Photorealistic AI Studio Product Photos (No Crop/Compose):**
   - Built-in AI image model generated all 13 in the shared AllBarka boutique style (cream travertine, dark forest-green linen, 45° angle — except top-down flat-lay for `saffron-spanish-coupe` — warm soft side lighting, speckled ceramic bowl / unlabelled clear glass jar, zero text/logos/honey dippers).
   - Encoded to `1200×1200` WebP `<200KB` (`97 KB`–`196 KB`) under `public/images/held-ai-20261120/<id>.webp` via `scripts/encode-held-ai-images.py`.
   - Every single image was visually inspected and verified before commit (first 5 also reviewed and approved by Claude; next 8 verified in same style).
   - Updated `docs/catalog/DRAFT_IMAGES_SHEET.html` with side-by-side comparison (`NEW AI left` vs `OLD right`).
2. **Updated Catalog Image Paths & Hold List:**
   - Updated `image` and `imageName` for the 13 ready items in `src/data/catalogIntake20261113.json`, `src/data/catalogIntake20261114.json`, and `src/data/catalogIntake20261115.json` to `/images/held-ai-20261120/<id>.webp`.
   - Removed the 13 ready IDs from `docs/catalog/IMAGE_HOLD_20261119.txt` (20 remaining items stay on hold).
   - Updated `tests/draft-publish-20261118.test.ts` to validate the 13 AI image paths and 20 remaining hold items.
3. **Live Firestore Dry-Run & Authorized Execution:**
   - Dry-run (`docs/catalog/DRY_RUN_PUBLISH_20261120.json`): `totalDrafts: 155`, `readyToPublish: 13`, `alreadyPublished: 122`, `heldBack: 20`, `missingInFirestore: 0`.
   - After owner's explicit `"haan"`, ran `--execute` (`docs/catalog/EXECUTE_PUBLISH_20261120.json`): all 13 items updated & published live (`rev 3`, `priceIndicative: true`, audited in `catalogAudits`).
4. **Live Census (`docs/catalog/LIVE_CENSUS_20261120.md`):**
   - `total: 252`, `published: 232`, `draft: 20`, `archived: 0`, `inactive: 0`, `notInRepoCount: 0`, `repoItemsNotLive: 0`.

---

## Remaining Work (20 Held Items)
- Built-in image model hit `QUOTA_EXHAUSTED` (resets `2026-11-19T02:36:45Z` = **07:37 AM PKT**), and the local `.env` `GEMINI_API_KEY` is free-tier (`429` quota on image models).
- `scripts/generate-held-gemini-api.mjs` is checked in with exact prompts for all 20 remaining items (uses `process.env.GEMINI_API_KEY` only, zero hardcoded keys).
- Once built-in quota resets at ~07:37 AM PKT (or billing is enabled on `GEMINI_API_KEY`), generate the remaining 20 items listed in `docs/catalog/IMAGE_HOLD_20261119.txt`, inspect visually, update sheet for Claude review, then dry-run + execute after owner's `"haan"`.

---

## Verification Evidence
- `node --import tsx --test tests/draft-publish-20261118.test.ts tests/catalog-intake-20261110.test.ts tests/catalog-intake-20261113.test.ts tests/catalog-intake-20261114.test.ts tests/catalog-intake-20261115.test.ts` → `# pass 33 / # fail 0`
- `npm run typecheck` → Exit 0
- `node --env-file=.env --import tsx scripts/count-live-catalog.ts --project=allbarka-live "--database=(default)"` → `total: 252, published: 232, draft: 20, missingFromLive: []`
- `docs/catalog/EXECUTE_PUBLISH_20261120.json` → `mode: EXECUTE_PUBLISH, readyToPublish: 13, alreadyPublished: 122, heldBack: 20, missingInFirestore: 0`

---

## Files Added / Changed on `ag/20261120-held-images`
- `public/images/held-ai-20261120/*.webp` (13 AI studio images, all `<200KB`, 1200×1200)
- `src/data/catalogIntake20261113.json`, `src/data/catalogIntake20261114.json`, `src/data/catalogIntake20261115.json` (13 image paths updated)
- `docs/catalog/IMAGE_HOLD_20261119.txt` (trimmed from 33 to 20 remaining items)
- `docs/catalog/DRAFT_IMAGES_SHEET.html` (side-by-side AI preview block at top)
- `docs/catalog/DRY_RUN_PUBLISH_20261120.json`, `docs/catalog/EXECUTE_PUBLISH_20261120.json`, `docs/catalog/LIVE_CENSUS_20261120.md`
- `scripts/encode-held-ai-images.py`, `scripts/build-held-ai-sheet.ts`, `scripts/generate-held-gemini-api.mjs`
- `tests/draft-publish-20261118.test.ts`
- `docs/PENDING_WORK.md`, `docs/handoffs/20261120-held-images.md`
