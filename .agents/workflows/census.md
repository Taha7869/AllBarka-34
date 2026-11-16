---
description: Read-only count of the live Firestore catalogue (owner's PC only)
---
1. Read `FIREBASE_PROJECT_ID` and `FIRESTORE_DATABASE_ID` from `.env` (or `.env.local`; use that file name in step 2). These two are not secrets; never print any other value from the file.
2. Run, read-only: `node --env-file=.env --import tsx scripts/count-live-catalog.ts --project=<project id> --database=<database id>`
3. If it fails with LIVE_COUNT_FAILED, the `.env` admin credentials are missing; ask the owner, do not create keys.
4. Compare with the repository list: `npx tsx scripts/export-master-list.ts` (prints totals by section).
5. Write `docs/catalog/LIVE_CENSUS_<yyyymmdd>.md`: live total, active vs inactive, ids live but not in the repo, repo seeds missing live (for example the 8 `bid-box-*`), and any duplicates. Never write to Firestore in this workflow.
6. Finish with `/handoff`.
