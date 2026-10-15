# AllBarka release finalization — 15 October 2026

Target: the existing Railway service and `allbarka.com`, using `launch`.

**Status: release candidate verified; production rollout awaits connected Railway and Firebase accounts.** The owner has requested the release. No further report-approval gate is being imposed.

## Reconciled source

- `launch` is at `36111e6a28ba674162f2c22352c92b659588959b`.
- Part 4 is at `7258942d19e86e97fbeebbc4da6ed82bb1a8eeaf`, exactly four commits ahead of launch with no divergent commits. It includes Parts 1–3. The earlier draft PRs are #11–#14.
- GitHub reports a successful Railway status for launch commit `36111e6`. Production health is responding and its database reports connected. Its older health response has no runtime commit identity, so that response alone cannot pin the deployed source.
- The public production API returns all 89 products. All 89 public pricing records validate against the new schema, and their fixed prices match this release's registry. Public output does not prove which records are stored in Firestore: the older server could overlay defaults. Actual database inspection remains required.
- Deployed SVG/ICO favicons are byte-identical to the repository assets and are preserved.

## Included work

| Area | Release content |
| --- | --- |
| Part 1 | Server-only canonical orders; authenticated customer/loyalty APIs; launch/image reconciliation; deployment identity and CI |
| Part 2 | Validated Firestore catalogue; admin price/version/audit controls; shared quotes, order transactions, hampers and AI pricing; create-only migration |
| Part 3 | Default unlimited stock 9999; optional atomic reservations; four fulfilled rewards and cancellation recovery; cursor lists/CSV; faster durable notifications |
| Part 4 | Compact catalogue transport; route metadata/404s; keyboard/RTL/recovery work; optional consent-based analytics; transfer budgets |
| Finalization | Repair admin-price routing middleware: cookies and JSON now precede guarded pricing routes; defensive cookie access prevents bearer requests from crashing |
| Finalization | Add `/api/ready` and use it for Railway health checks. A release needs auth initialization, a successful read-only database probe and the complete validated Firestore product/box view. An offline/static preview is never marked production-ready |
| Finalization | Limit homepage bestsellers to eight featured active products; keep a link/count for the complete collection |
| Finalization | Replace device-time urgency with the current server's Pakistan-time 6 PM dispatch calendar. After cutoff/Sundays, show the actual next dispatch date. English, Urdu and Arabic supported |

Existing prices, shipping formulas, promotions and the stock default remain intact. No new dependency was added. Analytics stays off without configuration and customer consent. No live n8n workflow or customer messaging was changed.

## Fresh verification

| Check | Result |
| --- | --- |
| Full Node commerce suite | 586 passed, 0 failed; 54 test files |
| Backend checks | 21 passed |
| Actual production-bundle HTTP checks | 54 passed |
| Build, TypeScript, hooks lint, whitespace | Passed |
| Catalogue assets | 89 products, 107 references, 103 unique files; no missing files |
| Entry JavaScript gzip | 97,359 bytes; below 105 KiB limit |
| Static JavaScript graph gzip | 279,994 bytes; below 300 KiB limit |
| Offline seed preview | 89 products + 3 boxes for an empty database; no production reads/writes |
| Read-only production checks | Public health/database readiness, all product prices and deployed favicons inspected |

A new production-server regression uses a local Auth-emulator response to verify anonymous rejection, non-admin rejection, verified admin routing, bearer-over-cookie precedence and parsed JSON reaching price validation. It makes no production calls or price writes. Dispatch rollover and deployment dependency failures are also covered.

Browser visual/keyboard QA and Lighthouse remain pending: the local Chromium download failed with a truncated archive. No browser-policy workaround was used. These tests do not establish live browser layout, Cloud index readiness, external message delivery or a throughput SLA.

## Rollout sequence

1. Connect the existing Railway and Firebase accounts. Confirm the actual project and named database from the running service; do not infer the target from the checked-in public config. Keep secrets in provider configuration.
2. Run the read-only catalogue seed plan using the existing server identity and `FIRESTORE_DATABASE_ID`:

   ```bash
   node --import tsx scripts/migrate-products.ts
   ```

   Review its missing/invalid records, then run `node --import tsx scripts/migrate-products.ts --execute` for create-only missing records. Preserve existing merchant prices. Invalid existing records stop the migration without writes. The offline 92-record preview is not a claim about production's missing records.
3. Publish `firestore.rules` and `firestore.indexes.json` to that actual database; wait for required indexes to be ready. Verify the configured rules prevent direct customer reads of private canonical orders. Railway does not publish Firebase rules/indexes.
4. Run the bounded order-search backfill in read-only mode, then execute the reviewed plan. Leave stock unlimited until real available quantities are entered. See `COMMERCE_OPERATIONS.md` for commands and cursor continuation.
5. Verify authenticated admin save/conflict/audit, customer privacy, quote reconfirmation, immutable old receipt/retry, voucher/cancellation flows and exports in staging. Check mobile EN/UR/AR, dark mode, keyboard and reduced motion.
6. Promote this release candidate to `launch` without overwriting concurrent work. Confirm the existing Railway source branch is `launch`, run its deployment and inspect logs. The configured readiness endpoint must return HTTP 200 with the release commit/branch and all dependency checks true. Health alone is insufficient.
7. Verify production catalogue/ETags, one controlled guest and authenticated checkout, admin access, metadata/404s and the current outbox. Any test that sends an external message needs its own explicit sending instruction. Do not replay historical outbox events automatically.

The four earlier PRs can be marked superseded/merged once the cumulative release is actually promoted. Preserve the previous launch commit for operational recovery; follow the stock/reward rollback caveats in `COMMERCE_OPERATIONS.md`.

## Remaining owner/service-dependent work

- Current account access: Railway deployment/logs and the actual Firebase rules, indexes, seed plan and migration.
- Authentic product/packaging photographs, final sellable weights/rates where placeholders remain, and review provenance/permission. This release does not certify existing marketing testimonials as purchase-verified.
- Actual remote WhatsApp/n8n acknowledgement and status tests; the inactive workflow changes need a separate live workflow rollout.
- Real browser/field performance and contention/load measurements, monitoring/alerts, backup/restore verification, and measured CSP/shared abuse-control hardening. Offline tests do not replace these operational checks.

No Railway settings, Firestore documents/rules/indexes or live workflow were changed while preparing this candidate. Production promotion remains pending the connections and checks above.
