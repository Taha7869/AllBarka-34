# Handoff: Live Draft Batches Import (2026-11-16)

## What was done
- Switched to task branch `ag/20261116-import-drafts` from `origin/claude/celebrations-foundation-20261112`.
- Updated all 4 intake import scripts (`scripts/import-catalog-intake-*.ts`) to support `--dry-run` as an alias and set `ignoreUndefinedProperties: true`.
- Executed dry-run verification against live Firestore `allbarka-live` / `(default)`:
  - 155 items verified for creation, 0 collisions with existing published products.
- After owner authorization, executed create-only imports across all 4 batches in strict dependency order:
  1. Batch 20261110: 17 drafts created.
  2. Batch 20261113: 63 drafts created.
  3. Batch 20261115: 16 drafts created.
  4. Batch 20261114: 59 drafts created.
- Total 155 drafts created in Firestore with `status: 'draft'`, `active: false`.
- Zero existing products overwritten; zero draft items published.
- Generated `docs/catalog/LIVE_CENSUS_20261116c.md`.

## Verification Evidence
- Live Census: `node --env-file=.env --import tsx scripts/count-live-catalog.ts --project=allbarka-live "--database=(default)"`
  - Output: `total: 252`, `published: 97`, `draft: 155`, `missingFromLive: []`. (0 errors, Exit 0).
- Public Storefront Check: `https://allbarka.com/api/catalog`
  - Returns exactly 97 published products. 0 drafts visible to public visitors.
- `npm run typecheck` (Pass, Exit 0).

## Files Changed
- `scripts/import-catalog-intake-20261110.ts` (added `ignoreUndefinedProperties: true`)
- `scripts/import-catalog-intake-20261113.ts` (added `ignoreUndefinedProperties: true` & `--dry-run` alias)
- `scripts/import-catalog-intake-20261114.ts` (added `ignoreUndefinedProperties: true` & `--dry-run` alias)
- `scripts/import-catalog-intake-20261115.ts` (added `ignoreUndefinedProperties: true` & `--dry-run` alias)
- `docs/catalog/LIVE_CENSUS_20261116c.md` (census report documenting 252 items)
- `docs/handoffs/20261116-import-drafts.md` (this handoff)
