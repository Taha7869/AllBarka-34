---
description: Answer "how many products / what is missing" from the repository list, not from memory
---
1. `npx tsx scripts/export-master-list.ts` — prints the total and per-section counts and rewrites `docs/catalog/MASTER_PRODUCT_LIST.csv`.
2. For a list the owner sent, match each item by English, Urdu and Roman Urdu name against that CSV with `grep -i`.
3. Report three numbers: on the website (seed), in drafts, missing. Say that live Firestore was not checked unless you queried it.
