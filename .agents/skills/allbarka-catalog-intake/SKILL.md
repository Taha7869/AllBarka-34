---
name: allbarka-catalog-intake
description: >-
  How to add, rename, price or publish AllBarka products without guessing. Use when
  the owner sends a new item list, a supplier list, asks to add items, asks how many
  items exist or are missing, or asks to rename, price or publish products.
---

# Catalogue intake

## Where the truth is
- Website seeds: `src/data/products.ts` (97). Live authority: Firestore `products` (not readable without credentials).
- Draft batches (create-only, all `status: draft`, `active: false`): `src/data/catalogIntake20261110.json`, `…20261113.json`, `…20261114.json` (bundles), `…20261115.json`.
- **Full list:** `docs/catalog/MASTER_PRODUCT_LIST.csv` — regenerate with `npx tsx scripts/export-master-list.ts`. Price/photo/publish register: `npx tsx scripts/export-intake-register.ts`.
- Answer "how many / what is missing" from that CSV, never from memory.

## Adding items
1. Check the CSV for the item under every name (English, Urdu, Roman Urdu). If it exists, say so.
2. New items go in a **new dated batch** (copy the latest `src/lib/catalogIntake2026xxxx.ts`, its import script and test; add the batch to both export scripts and to the collision guard).
3. Each product needs EN/UR/AR name, description, usage, sourcing; `careKind` from `src/data/care/types.ts`; pack options; `claimsVerification: unverified`; placeholder image `/images/product-placeholder.svg`.
4. Rates are placeholders unless the owner gave one. Mark them as estimates.
5. Bundles: `componentIds` and `components[{productId, unitWeightG | unitVolumeMl}]`; names say what is inside.
6. Run the batch test, the earlier batch tests, typecheck, then regenerate both CSVs.

## Importing to Firestore (owner yes required)
`npx tsx scripts/import-catalog-intake-<batch>.ts --project=<id> --database=<db> --confirm-project=<id> --actor-uid=<admin uid>` → read-only plan. Add `--execute` only after the owner approves the plan. It never overwrites existing documents and never publishes.

## Do not
- Do not edit live product names or prices in seeds without the owner (live docs also need an admin edit).
- Do not add health claims; the tests reject them.
