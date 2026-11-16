# Handoff: Live Firestore Census (2026-11-16)

## What was done
- Switched to task branch `ag/20261116-live-firestore-census` tracked from `origin/claude/celebrations-foundation-20261112`.
- Executed read-only Firestore census against project `allbarka-live`, database `(default)`.
- Updated `src/lib/liveCatalogCount.ts` to include intake batches 20261114 and 20261115 so repository inventory tracking covers all 254 catalog items.
- Generated `docs/catalog/LIVE_CENSUS_20261116.md` documenting live counts, category distribution, active status, missing celebration boxes, and draft items.

## Key Findings
- **Live Products**: 89 total (100% active/published, 0 drafts/archived/inactive).
- **Unknown Live Items**: 0 (all 89 documents match repository seeds).
- **Duplicates**: 0 duplicate document IDs, 0 duplicate names.
- **Missing Seeds Live**: 8 celebration boxes (`bid-box-*`) exist in `src/data/products.ts` but are not yet imported to Firestore.
- **Repository Drafts Awaiting Import**: 157 items across batches 20261110, 20261113, 20261114, 20261115.

## Verification
- `node --env-file=.env --import tsx scripts/count-live-catalog.ts --project=allbarka-live "--database=(default)"` (Exit 0, 89 live items)
- `node --import tsx --test tests/catalog-intake-20261113.test.ts` (6 passed, 0 failed)
- `npm run typecheck`
- `npm run build`

## Files Changed
- `src/lib/liveCatalogCount.ts` (added intake 1114 & 1115 imports for 254-item coverage)
- `docs/catalog/LIVE_CENSUS_20261116.md` (census report)
- `docs/handoffs/20261116-live-firestore-census.md` (this handoff)

## Next Steps / Owner Decision
- Confirm when the 8 missing celebration boxes (`bid-box-*`) should be imported to Firestore.
- Draft intake batches (157 items) await merchant price finalization before import.
