# Live Firestore Catalog Census — 2026-11-20 (Final — All 33 Held Items Published)

- **Project:** `allbarka-live`
- **Database:** `(default)`
- **Captured:** 2026-11-20 23:28 PKT (Asia/Karachi)
- **Command:** `node --env-file=.env --import tsx scripts/count-live-catalog.ts --project=allbarka-live "--database=(default)"`

## Summary

| Metric | Count |
| --- | ---: |
| Total documents in `products` | **252** |
| Published (`status: published`, `active: true`) | **252** |
| Draft (`status: draft`) | **0** |
| Archived | **0** |
| Inactive | **0** |
| Known in repo (97 seeds + 155 intake drafts) | **252** |
| In Firestore but not in repo | **0** |
| In repo but missing from Firestore | **0** |

## Breakdown by Category

| Category | Count |
| --- | ---: |
| `bundles` | 65 |
| `herbs-spices` | 63 |
| `nuts` | 40 |
| `oils` | 22 |
| `snacks-seeds` | 22 |
| `dates` | 11 |
| `celebration-boxes` | 8 |
| `essentials` | 8 |
| `murabba-jaat` | 7 |
| `dry-fruits` | 4 |
| `gift-boxes` | 2 |
| **Total** | **252** |

## Notes

- All 20 remaining held drafts (13 approved in round 2 + 7 approved in round 3) were updated to `/images/held-ai-20261120/<id>.webp` and published live via `scripts/publish-ready-drafts-20261118.ts --execute` (`docs/catalog/EXECUTE_PUBLISH_20261120_FINAL.json`).
- `docs/catalog/IMAGE_HOLD_20261119.txt` is now cleared (0 held IDs remaining).
- **Important for Railway deploy:** Merge `ag/20261120-held-and-covers` into `claude/celebrations-foundation-20261112` promptly so Railway serves all 20 newly published `/images/held-ai-20261120/*.webp` assets on `allbarka.com`.
