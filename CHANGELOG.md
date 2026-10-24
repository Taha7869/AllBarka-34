# AllBarka expansion change log

Each stage records the prior behavior, resulting behavior, reason, affected paths and actual verification. Earlier renovation work remains in its existing reports.

## 24 October 2026 — Stage 4: orders-only staff access

- **Before:** all operational order screens required admin claims; staff had no restricted reader.
- **After:** administrators can find a verified existing account and grant/revoke only order reading, using revisioned server-only grants and atomic audits. The separate staff workspace shows bounded order list/details with search, status/date filters and no writes/export/catalog controls.
- **Safety:** fresh account/grant checks on every request, disabled/revoked sign-in rejection, dedicated nested DTO allowlists, independent admin guards and immediate revoke handling on the next read. Existing Auth custom claims, prices, order mutations and live rules remain unchanged.
- **Paths:** staff contracts/access router, staff workspace/team panel, shared dialog, bounded GET-only client, translations/CSS; integrations in server/App, existing admin/account navigation, SEO/robots and evidence documents.
- **Verification:** 688 tests, 21 backend and 36 production checks passed; browser grant/read/detail/revoke plus 12 viewport/language/theme combinations. External CodeRabbit auth was unavailable and is documented without claiming a review.
- **Remaining:** Stage 5 content/premium storefront and Stage 6 final integration/release packet. No production deploy/merge or live data/account writes.

## 24 October 2026 — Stage 3: shared item workflow and customer integration

- **Before:** separate create/edit modals duplicated field state; create supplied example rates and omitted descriptions/media/SEO. Flexible Stage 2 options, templates and taxonomy had no complete editing or discovery workflow.
- **After:** both modal entry points share `AdminItemForm`, `AdminItemField` and `AdminDelimitedInput`. New rates are blank; IDs derive from the English name and remain editable before creation. Each field carries a translated mandatory/publish-required/optional marker. EN/UR/AR names/descriptions/origin and SEO inputs stay separate. Draft, preview, save and publish are distinct. Fresh-record failures block saves, mutation failures preserve input, and revision conflicts are explicit.
- **Options and compatibility:** the complete unit/manual/calculated/custom form uses the existing product routes and canonical price resolver. Legacy prices stay with the existing editor until a template is explicitly applied. Saved differences from a calculated base become visible overrides before option edits. Metadata-only saves omit pricing changes. Disabled option prices are retained, and ambiguous legacy packaging labels require explicit piece-count review. Explicit blank legacy translations now remain blank; absent legacy translations retain their compatibility fallback.
- **Media:** added authenticated bounded raw raster upload through the existing Firebase Admin app/bucket, cover selection/removal and gallery references. New catalog galleries feed actual card/detail media. No temporary-disk persistence or new application dependency. Live Storage remains unverified; provider failure is an honest error.
- **Taxonomy/templates:** added real revisioned editing controls and typed template attributes; visible entries feed shop discovery and exact collection/occasion matching. Hidden built-in categories use public ID/type tombstones to suppress compiled navigation defaults. Custom category routes receive initial metadata/sitemap entries.
- **SEO/customer flow:** saved localized metadata and photo alt text feed the storefront; initial HTML uses the saved English metadata and stable canonical product ID. Custom quantity controls use the configured unit/min/max/increment while the old gram path remains intact.
- **Paths:** shared form/configuration/field components; `adminItemForm.ts`, `productSeo.ts`, upload client/router, `adminExpansionTranslations.ts`, `admin-item.css`; integrations in existing catalog panel/provider, schema/configuration router, media resolver, category matching, PLP/shop/PDP, SEO and server routing. Component inventory and stage documents updated.
- **Verification:** new service/upload tests and a real browser fixture create, save, reload, upload, publish, edit configuration, reject a stale edit, discover the item and add a custom quantity to the cart; authoritative order pricing ignores the browser-submitted price. Viewport/language/theme matrix covers 390×844 and 1440×900, EN/UR/AR, light/dark, with screenshots in `docs/admin-expansion/evidence/`. Final gate totals are in TESTING_RELEASE.md.
- **Regression harness:** existing autoplay timing tests exposed wall-clock drift between interactions on a slow runner. Their clock now stays paused between explicit `runFor` steps; their original assertions remain. The isolated 11-case timing suite passed after this correction.
- **Release boundary:** no keys/environment-file edits, live data writes, production merge, workflow changes, rules publication or deployment. Staff/content/overall storefront polish remain later stages. Stage 3 remote persistence was blocked by automatic approval review pending explicit repository-destination authorization; local checkpoint/patch prepared, PR #16 remains at Stage 2.

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
