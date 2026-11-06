# Overnight Autonomous Execution Record  AllBarka Launch Engineering

> [!NOTE]
> **Owner Direction (01 Nov 2026):** Manual cloud provisioning (creating GCP/Firebase project `allbarka-preview`, IAM role assignments, billing, live credential rotation, and merchant price/recipe confirmations) is explicitly deferred until the owner is active on PC. These items remain on the GitHub/docs pending list. Autonomous launch engineering continues offline with verified local checkpoints and zero cloud mutations.

## 1. Master Tracker & Delivery Packages

| Package | Scope & Objective | Deliverables / Gates | Status | Checkpoint |
|---|---|---|---|---|
| **Package A: Catalog Readiness & Merchant-Data Preparation (M34)** | Bounded read-only catalog health reporter (`src/lib/catalogHealthReport.ts`), audit missing records (8 `BID_BOX_PRODUCTS`, 3 `hamperBoxes`, recipes, kg rates, media, taxonomy), merchant review data packets (`merchant-data-entry-packet.json`), admin editing retention & 409 conflict test on `memoryFirestore`. | Health report utility & CLI, schema-valid data-entry packets with unconfirmed blanks, test suite `tests/catalog-health-report.test.ts` (6/6 PASS), admin persistence & projection refresh verification. | **DONE (offline verified)** | Local checkpoint |
| **Package B: Offline Order & Inquiry Integration Gaps** | Close uncovered edge cases in inquiry, durable-order, outbox, and bundled n8n receiver tests against current contracts. Test repricing, unavailable data, stale submissions, persisted receipts, retries, mismatched acknowledgements, duplicate handling via local adapters. | Test suite `tests/stage6-order-inquiry-gaps.test.ts` (5/5 PASS), 1kg rate formula & recipient/message hash integrity preserved, receiver-before-sender ordering verified. | **DONE (offline verified)** | Local checkpoint |
| **Package C: Offline Launch Smoke & Release Preparation** | Customer/admin/staff routes on actual built application (`dist/`). Audit initial HTML metadata, OpenGraph, canonical URLs, `robots.txt`, `sitemap.xml`, 404/missing routes, preview indexing protection (`X-Robots-Tag: noindex`). Measure bundle/assets and provide runnable smoke procedure & preview/release/rollback checklists. | `docs/LAUNCH_SMOKE_PROCEDURE.md`, `docs/PREVIEW_RELEASE_ROLLBACK_CHECKLIST.md`, build asset report, route smoke tests (36/36 production checks PASS). | **DONE (offline verified)** | Local checkpoint |
| **Batch A: Product Facts & Admin Foundation (M11, M23, M33, M34)** | Product passport schema & validation, admin focal point & crop mode controls, verified claims gating on storefront, and content readiness health reporter issues. | `tests/product-passport.test.ts` (11/11 PASS), `tests/admin-passport-browser.test.tsx` (1/1 PASS), typecheck (0 errors), hooks lint (0 warnings). | **DONE (offline verified)** | `15f6be4` |
| **Batch B: Discovery & Comparison (M10, M27, M31, M06)** | "Find Your Taste" attribute/texture matching & scoring, Variety Comparison modal with peer harvest criteria & in-modal cart action, local-language search aliases (Roman Urdu, Urdu, Arabic, colloquial packaging terms), and editorial category routing. | `tests/batch-b-discovery.test.ts` (3/3 PASS), `tests/batch-b-browser.test.tsx` (1/1 PASS), typecheck (0 errors), hooks lint (0 warnings), production checks (36/36 PASS). | **DONE (offline verified)** | `c35aa6e` |
| **Batch C: Entertaining & Occasions (M12, M13, M30)** | Mehmaan Table Planner (`MehmaanTablePlannerModal.tsx`, `mehmaanPlanner.ts`), Occasion & Event Planning Kit (`OccasionInquiryModal.tsx`, `occasionPlanning.ts`), lead-time calculations, WhatsApp inquiry builders, in-modal cart actions, and browser acceptance. | `tests/batch-c-entertaining.test.ts` (2/2 PASS), `tests/batch-c-browser.test.tsx` (1/1 PASS), typecheck (0 errors), hooks lint (0 warnings), production checks (36/36 PASS). | **DONE (offline verified)** | `3d97bec` |
| **Batch D: Studio Preview & Restore (M32)** | Full Studio preview (Desktop vs Mobile 390px frame, Draft vs Live switch), atomic `/api/admin/storefront-content/restore` endpoint with expected revision validation, live baseline draft rollback, and browser acceptance. | `tests/batch-d-studio.test.ts` (1/1 PASS), `tests/batch-d-browser.test.tsx` (1/1 PASS), `tests/admin-expansion-content-browser.test.tsx` (1/1 PASS), typecheck (0 errors), hooks lint (0 warnings), production checks (36/36 PASS). | **DONE (offline verified)** | Local checkpoint |
| **Package D: Polish Selected UI Work** | Polish typography/RTL consistency, motion/failure states, luxury Error Boundary (`ErrorBoundary.tsx`), branded 404 page (`NotFoundPage.tsx` with authentic Urdu/Arabic), and verify full test suite. | Refined luxury `ErrorBoundary.tsx` adhering to ivory/emerald/gold tokens, authentic Urdu/Arabic RTL-compatible `NotFoundPage.tsx`, full test suite verified (88 files, 770 passed, 21 backend passed, 36 production passed). | **DONE (offline verified)** | Local checkpoint |

---

## 2. External Blockers & Deferred Items (Pending Interactive PC Session)

The following items are strictly external / manual and are deferred until the owner is active on PC:
1. **GCP/Firebase Preview Project Creation:** Provisioning `allbarka-preview` (Project ID, Web App, Storage Bucket, Firestore database).
2. **Cloud IAM & Credentials:** Service account keys and environment secrets (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) for preview environment.
3. **Cloud Billing & Quotas:** Project billing activation for external services.
4. **Merchant Pricing Confirmations:** Authoritative selling prices for 8 celebration boxes and 3 hamper boxes; confirmed ingredient recipes and kg rates.
5. **Production Deployment & DNS:** Switching live DNS / Railway deployment targets.

---

## 3. Current Execution Log

- **01 Nov 2026 — Package A (Catalog Readiness & M34 Foundation) Completed:**
  - Implemented `src/lib/catalogHealthReport.ts` (`generateCatalogHealthReport` and `runCatalogHealthAudit`) providing bounded, read-only catalog health auditing across products, hamper boxes, taxonomy, 1kg rates, recipes, and media references.
  - Added CLI script `scripts/report-catalog-health.ts` supporting human-readable output, `--json`, and `--output=<path>`. Zero secrets, zero customer PII, zero mutations.
  - Audited 97 products and 3 hamper boxes; clearly separated `DEFINITE_FAILURE` vs `MERCHANT_JUDGMENT`.
  - Created merchant review packet: `docs/evidence/catalog-audit/merchant-data-entry-packet.json` and `docs/evidence/catalog-audit/MERCHANT_REVIEW_PACKET.md` with all unconfirmed prices/recipes left strictly `null` (no invented prices).
  - Verified admin editing path, 409 revision conflict on stale edit, and public projection refresh on `memoryFirestore` (`tests/catalog-health-report.test.ts`: 6/6 PASS).
  - Gates: `npm run typecheck` PASS (0 errors), `npm run lint:hooks` PASS (0 errors).
- **01 Nov 2026 — Package B (Offline Order & Inquiry Integration Gaps) Completed:**
  - Audited existing order, inquiry, outbox, and n8n tests.
  - Implemented comprehensive regression test suite `tests/stage6-order-inquiry-gaps.test.ts` (5/5 PASS):
    - Gap 1: Verified `QuoteChangedError` triggers when catalog prices change before transaction commit, failing closed without creating orphan orders.
    - Gap 2: Verified saved idempotent receipts are returned with original totals without repricing even if merchant database rates change subsequently.
    - Gap 3: Verified idempotency conflict error when changed payload is submitted under the same key.
    - Gap 4: Verified direct order creation strictly fails closed with `QUOTE_REQUIRED` for incomplete custom hampers.
    - Gap 5: Verified outbox retry handles mismatched acknowledgements without false delivery confirmation.
  - Invariants preserved: 1kg rate formula (`kgRate * grams / 1000`), recipient/message hash integrity, receiver-before-sender ordering.
- **01 Nov 2026 — Package C (Offline Launch Smoke & Release Preparation) Completed:**
  - Audited and updated `public/robots.txt` to strictly disallow `/staff` along with `/admin`, `/api/`, `/checkout`, `/cart`, and `/success`.
  - Updated `src/lib/routeDocument.ts` to automatically apply `noindex: true` to all `/admin` and `/staff` routes.
  - Updated `server.ts` to enforce `X-Robots-Tag: noindex, nofollow` across the entire application in preview mode (`isPreview`).
  - Executed production build & privacy audit (`$env:ALLBARKA_SKIP_LOCAL_ENV="true"; npm run build`): 84 artifacts audited clean.
  - Executed `node scripts/verify-production.mjs`: 36/36 production checks PASS.
  - Created runnable operational procedures:
    - `docs/LAUNCH_SMOKE_PROCEDURE.md` (exact commands for automated gates, catalog audit, and interactive manual journey).
    - `docs/PREVIEW_RELEASE_ROLLBACK_CHECKLIST.md` (step-by-step checklist for owner on PC covering GCP provisioning, secrets, release gates, and rollback instructions).
- **01 Nov 2026 — Package D (Polish Selected UI Work) Completed:**
  - Redesigned `src/components/ErrorBoundary.tsx` adhering to AllBarka luxury design tokens: ivory canvas (`#FAF9F5` / `#120F17`), gold curved border (`#D4AF37`/35), emerald accents (`#043327`), Playfair Display typography, "Refresh Boutique" and "Return to Table" buttons, and graceful error recovery.
  - Rewrote `src/pages/NotFoundPage.tsx` with authentic Urdu (`صفحہ دستیاب نہیں ہے`) and Arabic (`الصفحة غير موجودة`) text, replacing corrupted mojibake strings, with `dir="rtl"` support and luxury button links.
  - Rebuilt production bundle clean (`$env:ALLBARKA_SKIP_LOCAL_ENV="true"; npm run build`) with 84 artifacts audited clean.
  - Executed full offline test suite (`node scripts/run-all-tests.mjs`):
    - 88 test files passing
    - 770 passed, 0 failed, 1 skipped (duration 295.7s)
    - 21 backend production test checks passing (pricing, phone validation, n8n, safety, idempotency, rewards, delivery schedules)
    - 36 production checks passing (security headers, SPA routes, private files, auth, preflight, abuse protection)
  - `npm run typecheck`: 0 errors.
  - `npm run lint:hooks`: 0 warnings.
  - All 4 offline launch engineering packages (A, B, C, D) are 100% complete and verified offline. Cloud provisioning and manual merchant price confirmations remain strictly deferred for the owner on PC.

- **02 Nov 2026 — Repair of Confirmed Findings in Checkpoint 77c6e86:**
  - **Corrected Merchant Packet (`merchant-data-entry-packet.json` & `MERCHANT_REVIEW_PACKET.md`):**
    - Corrected classification to `M34-MERCHANT-REVIEW-WORKSHEET` (`REVIEW_WORKSHEET_NOT_DIRECT_WRITE_PAYLOAD`).
    - Rebuilt from compiled definitions (`src/data/products.ts`, `src/lib/hamperCatalog.ts`) and dated audit evidence (`R04-CAT1` on 30 Oct 2026).
    - Preserved exact stable IDs (8 celebration boxes, 3 hamper boxes) and exact historical variant labels and compiled prices (e.g. `bid-box-luxury-tin` empty 1 pc is 140, filled is 'Filled Standard (Assorted Dry Fruits)' at 1150; `bid-box-umrah-tabarruk` empty 1 pc is 200, filled is 'Filled Standard (Irani Dates, Badam, Kaju & Kishmish)' at 850; removed invented Ajwa/Zamzam options).
    - Preserved dynamic Rule D1 MOQ (`calculatePackagingMoq`: `min(25, max(1, ceil(5000 / perPiecePrice)))`) with `moqOverride: null`. No hardcoded MOQ 10.
    - Preserved standalone retail custom-weight pricing (`pricePer100g` via `resolveCustomWeight`); clarified that 1kg rate requirement is strictly for filled gift recipes and hamper estimation under `FILLED_GIFT_PRICING.md`.
    - Removed unsupported certification/physical claims; recorded copy discrepancies as review questions for the merchant.
  - **Repaired Catalog Health Reporter (`src/lib/catalogHealthReport.ts` & `scripts/report-catalog-health.ts`):**
    - Supported explicit offline snapshot input via `--snapshot=<path>` (`loadCatalogHealthSnapshotFile`) capable of loading audit reports (e.g. `r04-cat1-audit.json`) and catalog exports with full provenance and timestamp.
    - Default static check clearly reports `source: 'default_static'` and notes compiled-reference limitations.
    - Dynamically incorporated custom categories, collections, and occasions from `config.taxonomy` (preventing false orphan flags).
    - Distinguished store read failures (`storedProductReadStatus: 'UNREADABLE'`) from confirmed empty collections, preventing false missing document claims when database reads fail.
    - Separated retail custom weight capability from filled gift ingredient estimation (missing 1kg rate on retail items with valid `pricePer100g` is classified as `MERCHANT_JUDGMENT`, not a definite failure).
  - **Repaired Release & Smoke Documentation (`docs/LAUNCH_SMOKE_PROCEDURE.md` & `docs/PREVIEW_RELEASE_ROLLBACK_CHECKLIST.md`):**
    - Corrected Node/npm prerequisites to `>=22.12.0 <25` and `npm 11.x` per `package.json` engines.
    - Added explicit warning that local server with production credentials is not an isolated test environment.
    - Removed false claim that `migrate-catalog-v2.ts` imports json; documented actual existing revisioned admin workflow (`updateAdminProduct`, `updateHamperBoxPricing`, `/admin/studio`).
    - Removed blind rollback instructions to `8cf4410` and false schema/order guarantees; documented factual rollback compatibility analysis (schema, receipt replay, outbox, n8n receiver alignment).
    - Re-emphasized receiver-before-sender ordering invariant.
  - **Completed Touched UI Localization & Verification (`src/components/ErrorBoundary.tsx`, `src/pages/NotFoundPage.tsx`, `src/contexts/LanguageContext.tsx`):**
    - Added localized translations for error boundary across EN, UR, and AR with full `isRtl` layout support.
    - Removed unsupported assurance that stored selections "remain secure", replacing with honest, elegant boutique messaging.
    - Verified 404 page in EN, UR, and AR with RTL layout and luxury focus-ring buttons.
  - **Regressions Verified:** Added tests in `tests/catalog-health-report.test.ts` (11 tests) and `tests/error-surfaces.test.tsx` (6 tests). All 17 tests PASS.

- **02 Nov 2026 — Repair of Snapshot Evidence Accuracy & Real Error-Surface Browser Verification (Checkpoint 3e3fc4b):**
  - **Snapshot Evidence Accuracy (`src/lib/catalogHealthReport.ts`):**
    - Enforced rigorous input shape and row validation for both `perProductAudit` and `products` arrays; rejects malformed top-level JSON, non-arrays, and invalid product rows.
    - Derived stored document presence strictly from explicit evidence with documented scope: missing evidence marks `NOT_AUDITED` rather than confirmed empty or confirmed persisted.
    - Nonzero hamper box counts without explicit doc IDs mark `storedHamperBoxReadStatus: 'NOT_AUDITED'` rather than false missing assertions.
    - Projection-only products arrays without explicit `storedProductDocIds` mark `storedProductReadStatus: 'NOT_AUDITED'`.
    - For CAT1 (`r04-cat1-audit.json`), products are constructed strictly from observed merchant fields without substituting compiled `PRODUCTS` seeds. Evidence scope accurately notes that unrecorded recipes and media were not in the audit scope.
    - Added regressions in `tests/catalog-health-report.test.ts` for nonzero/unknown hamper counts, projection-only products, malformed snapshots, and CAT1 observed facts (15/15 PASS).
  - **Actual Error-Surface Browser Verification (`tests/error-surfaces.test.tsx`):**
    - Replaced mocked boundary tests with real browser integration tests using `launchTestBrowser()`, Express static server, and esbuild bundling the actual `ErrorBoundary` and `NotFoundPage`.
    - Triggered a controlled child failure inside the real `ErrorBoundary`, verifying display of accessible fallback with `role="alert"`, `aria-live="assertive"`, and honest boutique copy.
    - Verified recovery via `onReset` restoring healthy children, and custom fallback prop rendering.
    - Verified default navigation: "Return to Table" navigates to `/`, 404 page navigates to `/shop` and `/`.
    - Verified parity matrix across viewports (Mobile 390x844, Desktop 1440x900), languages (EN, UR, AR), RTL direction, themes (light/dark), keyboard focus/tabbing, and 200% text zoom with zero horizontal overflow.
    - Captured browser screenshot evidence in `docs/evidence/error-surfaces/`.
    - Retained fast SSR tests for initial markup and context isolation (5/5 PASS).


- **02 Nov 2026 — Batch A (Product Facts & Admin Foundation) Completed:**
  - Owner updated scope to execute full premium roadmap (M01–M34) across Batches A through F.
  - Implemented M11 Verified Product Passport in `src/types.ts`, `src/lib/catalogSchema.ts`, and `src/components/ProductDetailAccordion.tsx` (variety, harvest season, roast level, processing method, ingredients, allergen warnings, storage guidance, shelf life).
  - Implemented M23 Media Focal Point (x, y coordinates) and Crop Mode ('cover' | 'contain' | 'custom') in `src/types.ts`, `src/lib/catalogSchema.ts`, `src/components/AdminItemForm.tsx`, and `src/components/ProductImageGallery.tsx`.
  - Implemented M33 Verified Claims & Content Readiness: `claimsVerification` schema, unverified claims display safety rule (certified badges only render when verified), and internal verification notes.
  - Implemented M34 Content Audit: Extended `src/lib/catalogHealthReport.ts` with `UNVERIFIED_CERTIFICATION_CLAIM`, `DISCREPANT_CLAIMS`, and `MISSING_ALLERGEN_ADVISORY` under `MERCHANT_JUDGMENT`.
  - Added #item-section-passport to `AdminItemForm.tsx` with localized translations in `src/contexts/adminExpansionTranslations.ts`.
  - Created test suite `tests/product-passport.test.ts` (8/8 PASS); verified `tests/catalog-health-report.test.ts` (15/15 PASS).
  - Passed quality gates: `npm run typecheck` (0 errors), `npm run lint:hooks` (0 warnings).
- **02 Nov 2026 — Batch A Repair Completed & Real Browser Verified:**
  - **Public Data Privacy Fixed:** Implemented strict nested public projection in `stripPrivateProductFields` (`src/lib/catalogSchema.ts`). Suppressed internal verification notes, discrepancy details, and review evidence from public DTOs (`/api/catalog` and `/api/catalog/products/:productId`). Certifications in `passport.certifications` are strictly suppressed in the public DTO unless `claimsVerification.status === 'verified'`.
  - **Persistence & Clearing Fixed:** Explicit null handling added to `updateAdminProduct` (`src/lib/catalogStore.ts`) for `passport`, `claimsVerification`, `mediaFocalPoint`, and `cropMode`, preventing accidental resurrection of deleted fields. Preserved existing values on omit. Fixed shelf life clearing in `AdminItemForm.tsx` so clearing `bestBeforeDays` sets it to `undefined` rather than converting to 0.
  - **Re-verification Safety Enforced:** In `updateAdminProduct`, modifying certifications or passport facts on a previously verified product automatically revokes verified status to `'unverified'` and clears `verifiedAt` unless explicitly re-confirmed.
  - **Storefront & Admin Preview Wiring:** Wired `mediaFocalPoint` (objectPosition percentages) and `cropMode` ('cover' | 'contain') into `ProductDetailPage.tsx`. Localized enums for harvest, roast levels, and certifications across EN/UR/AR in `catalogTranslations.ts` and rendered in `ProductDetailAccordion.tsx`.
  - **Real Browser Acceptance Verified (`tests/admin-passport-browser.test.tsx`):** Mounted real `AdminItemForm` and `ProductDetailAccordion` via Playwright (`launchTestBrowser()`), verifying full edit, save, reopen, clearing, public PDP/API privacy, stale revision conflict (409), mobile viewport (390x844), RTL (Urdu), and Dark Mode.
  - **All Quality Gates Green:** `npm run typecheck` (0 errors), `npm run lint:hooks` (0 warnings), build passing, `node scripts/verify-production.mjs` (36/36 passed), `tests/product-passport.test.ts` (11/11 passed), `tests/admin-passport-browser.test.tsx` (1/1 passed).
- **02 Nov 2026 — Batch B (Discovery & Comparison: M10, M27, M31, M06) Completed & Browser Verified:**
  - **M31 (Local-language Search Aliases):** Extended `CATALOG_ALIASES` in `src/lib/catalogDiscovery.ts` with comprehensive Roman Urdu (`chalgoza`, `anjir`, `kismis`, `mamra`, `ajwa`, etc.), Urdu script (`چلغوزہ`, `انجیر`, `بادام`, `پستہ`), Arabic (`صنوبر`, `تين`, `تمر`), and colloquial packaging synonyms (`potli`, `dabba`). Enhanced `productSearchScore` to index `variety`, `ingredients`, `certifications`, `tasteProfile`, and `keywords`. Exact name matches strictly score higher than incidental keywords.
  - **M10 ("Find Your Taste" Attribute & Texture Finder):** Extended `SelectionPreferences` in `src/lib/selectionGuide.ts` with `taste` ('sweet' | 'savory' | 'salted' | 'rich') and `texture` ('crunchy' | 'chewy' | 'buttery'). Implemented weighted attribute scoring in `selectionMatches` matching customer preferences against passport attributes and catalog data. Updated `SelectionGuide.tsx` with taste/texture chip selectors, match badges (`data-match-attr`), and query preservation in `selectionResultsPath`.
  - **M27 (Variety Comparison Table):** Built `src/lib/varietyComparison.ts` (`getComparableProducts`, `VARIETY_CRITERIA`) and `src/components/VarietyComparisonModal.tsx` presenting side-by-side cultivar comparison with verified passport facts (Variety, Origin, Roast/Processing, Texture/Crunch, Flavor Profile, Best Before, Verified Certifications, Starting Price) and in-modal "Add to Bag" action. Integrated comparison trigger into `ProductDetailPage.tsx`.
  - **M06 (Editorial Entrances):** Connected category routes (`/shop/dry-fruits`, `/shop/dates`, `/shop/celebration-boxes`, `/shop/seeds-snacks`) and pantry browsing entrances with localized category definitions.
  - **Localization & Accessibility:** Full EN, UR, and AR translations in `trendTranslations.ts` and `catalogTranslations.ts`. `VarietyComparisonModal` enforces strict dialog accessibility (`role="dialog"`, `aria-labelledby`, `acquireScrollLock`, Escape key dismiss) and native `dir="rtl"` support.
  - **Playwright Real Browser Acceptance (`tests/batch-b-browser.test.tsx`):** Mounted real application routing with full context providers via `launchTestBrowser()`, verifying:
    - M10 Selection Guide launch, Sweet + Chewy chip selection, matched attribute tags rendering, in-guide "Add to Cart".
    - M27 PDP variety comparison modal launch, 7+ criteria rows, 3+ comparative harvest peers, in-modal "Add to Bag", and Escape close.
    - M31 Search query for `chalgoza` surfacing pine nuts.
    - Full Urdu RTL direction (`dir="rtl"`) on modal and layout.
    - Dark mode theme class propagation.
    - Responsive mobile viewport (390x844) with horizontal table scrolling.
  - **Quality Gates:** `tests/batch-b-discovery.test.ts` (3/3 PASS), `tests/batch-b-browser.test.tsx` (1/1 PASS in 9.2s), `npm run typecheck` (0 errors), `npm run lint:hooks` (0 warnings), production build passing in 10.9s, `verify-production.mjs` (36/36 PASS).
- **02 Nov 2026 — Batch C (Entertaining & Occasions: M12, M13, M30) Completed & Browser Verified:**
  - **M12 (Mehmaan Table Planner):** Implemented `src/lib/mehmaanPlanner.ts` (`calculateMehmaanPlan`, `resolveBestPortion`, `MEHMAAN_SETTINGS`) providing transparent guest scaling (e.g. 5, 10, 20, 50 guests) across 4 traditional hosting styles ('chai', 'dawat', 'iftar', 'majlis'). Calculates transparent net gram breakdowns (nuts, dates, dried fruits) and maps table needs to whole catalog weights (`250g`, `500g`, `1kg`) without fractional or invalid units. Built `src/components/MehmaanTablePlannerModal.tsx` with live subtotal calculation and "Add All Selections to Bag" bulk cart action.
  - **M13 & M30 (Occasion & Event Planning Kit):** Implemented `src/lib/occasionPlanning.ts` and `src/components/OccasionInquiryModal.tsx` for weddings/nikkah, corporate gifts, and festive celebrations. Includes city transit lead times (Lahore: 1 day; Karachi/Islamabad: 2 days; other: 3 days) and packaging prep times (tin: 1 day; bespoke: 5 days). Computes lead-time status (`safe` | `tight` | `urgent`) with turn-around guidance banners. Submits structured inquiries to `/api/inquiries` and constructs pre-filled WhatsApp consultation URLs with disclaimers.
  - **Storefront & Navigation Wiring:** Wired event-driven triggers `openMehmaanPlannerModal` and `openOccasionInquiryModal` into `RootLayout.tsx`, `AllBarkaHero.tsx` (`.heritage-hero-mehmaan`), and `OccasionsDestination.tsx`.
  - **Localization & Accessibility:** Full EN, UR, and AR translations in `catalogTranslations.ts`. Native RTL direction (`dir="rtl"`) in Urdu/Arabic mode, scroll locking, and Escape dismiss.
  - **Playwright Real Browser Acceptance (`tests/batch-c-browser.test.tsx`):** Mounted real application routing via `launchTestBrowser()`, verifying:
    - M12 Mehmaan Table Planner launch from Hero, guest count adjustments to 20, switching to Iftar, recommendations rendering, and "Add All Selections to Bag" increasing cart items.
    - M13/M30 Occasion Inquiry Modal launch, Corporate event selection, Karachi city selection, 14-day date input with lead time calculation, quantity 100, client info, and submission dispatch to `/api/inquiries`.
    - Full Urdu RTL direction (`dir="rtl"`) on Mehmaan modal with authentic Urdu title.
    - Mobile viewport parity (390x844) with zero horizontal overflow.
  - **Quality Gates:** `tests/batch-c-entertaining.test.ts` (2/2 PASS), `tests/batch-c-browser.test.tsx` (1/1 PASS in 13.9s), `npm run typecheck` (0 errors), `npm run lint:hooks` (0 warnings), production build passing in 7.9s (84 artifacts clean), `verify-production.mjs` (36/36 PASS).
- **02 Nov 2026 — Batch D (Studio Preview & Restore: M32) Completed & Browser Verified:**
  - **M32 (Studio Preview & Restore Endpoint):** Extended `src/lib/storefrontContentRouter.ts` to support atomic `restore` action at `POST /api/admin/storefront-content/restore`. Enforces expected revision concurrency checks, admin authorization, and validates the live baseline into a fresh draft without touching the live published version. Advances revision monotonically and logs `CONTENT_DRAFT_RESTORED` audit events.
  - **Enhanced Studio UI (`AdminContentPanel.tsx`):**
    - Responsive device viewport switcher: Desktop mode vs Mobile frame (`390px` framed preview container).
    - Version switcher: Draft (`draft`) vs Live (`bundle.live`) with live revision badges.
    - Added "Restore live to draft" action with browser confirmation, resetting dirty state and updating draft immediately.
  - **Localization:** Added translations in `src/contexts/contentTranslations.ts` across EN, UR, and AR for restore prompt, confirmation, and responsive device modes.
  - **Playwright Real Browser Acceptance (`tests/batch-d-browser.test.tsx`):** Mounted real `AdminContentPanel` in Playwright via `launchTestBrowser()`, verifying:
    - Initial baseline draft save and publish.
    - Opening preview, switching between Desktop and Mobile (390px) device frames.
    - Editing draft, verifying draft preview updates while live preview preserves published baseline.
    - Executing "Restore live to draft" with confirmation, verifying draft resets to published baseline.
    - Verified existing `tests/admin-expansion-content-browser.test.tsx` still passes without regressions (1/1 PASS in 7.2s).
  - **Quality Gates:** `tests/batch-d-studio.test.ts` (1/1 PASS in 88ms), `tests/batch-d-browser.test.tsx` (1/1 PASS in 2.6s), `npm run typecheck` (0 errors), `npm run lint:hooks` (0 warnings), production build passing in 7.8s (84 artifacts clean), `verify-production.mjs` (36/36 PASS).
