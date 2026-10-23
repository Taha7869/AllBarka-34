# AllBarka expansion change log

Each stage records the prior behavior, resulting behavior, reason, affected paths and actual verification. Earlier renovation work remains in its existing reports.

## 24 October 2026 — Stage 2: catalog data and pricing foundation

- **Before:** custom portions were gram-only; templates/taxonomy had no revisioned admin service; flexible measurement, localized SEO/gallery extensions and complete publish validation had no shared contract.
- **After:** optional version-1 commerce configuration supports mg/g/kg/ml/L/piece/pack, manual/calculated canonical option prices with explicit overrides, food/liquid custom range/step, fixed pack piece counts, typed attributes, localized SEO/gallery validation and unpriced drafts/inquiry products. Missing translations stay empty. Products without the new configuration retain the legacy path.
- **Price safety:** exact half-up whole-PKR calculations run on explicit commerce saves; metadata saves preserve canonical prices. Purchase resolution rejects draft/archived/disabled choices, fingerprints configuration changes and ignores client prices. The old standalone price editor rejects configured products so Stage 3 can use a unified options form.
- **Settings:** added revision-checked, audited template/taxonomy configuration and a public visible-taxonomy allowlist. Archive/hide replaces destructive removal. No settings document was written to a live database.
- **Paths:** new `productCommerce.ts`, `catalogConfiguration.ts`, `catalogConfigurationRouter.ts`; integrations in `types.ts`, `catalogSchema.ts`, `catalogStore.ts`, `productVariants.ts`, packaging MOQ/classification/pricing, inquiry/AI resolution and server router mounting. Added `admin-expansion-commerce.test.ts`, `admin-expansion-persistence.test.ts` and isolated fixture helper.
- **Test infrastructure:** existing Stage 5A browser tests now share `tests/helpers/browser.mjs`; Chrome/Edge/bundled Chromium fallback plus optional operator-supplied test executable. Assertions are retained; no website environment file or package/lock version changed.
- **Evidence and limits:** exact final checks are recorded in `docs/admin-expansion/TESTING_RELEASE.md`. Complete admin forms, upload, taxonomy discovery, SEO rendering and customer custom-unit controls remain Stage 3; staff/content/premium UI remain Stages 4–5. No deployment, production merge, key change, rules publication or live data migration.

## 24 October 2026 — Stage 1: audit and working documents

- **Before:** expansion requirements were in conversation; existing renovation documents described earlier stages and contained some stale stack/category prose.
- **After:** the approved scope, six-stage plan, roles, design, fields, compatibility rules, evidence and next step are linked in `instructions.md`, `design.md` and `docs/admin-expansion/`.
- **Reason:** make continuation and future changes reviewable without repeating decisions or mistaking an existing partial feature for completed work.
- **Runtime behavior:** unchanged. No environment values, rates, products, shipping policy, permissions or production services changed.
- **Verification:** source snapshot hashes matched for 548 files. Existing locked install, baseline typecheck, hooks lint and production build passed. Expansion tests and live checks are pending.
