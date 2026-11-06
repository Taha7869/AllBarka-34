## 6 November 2026 — voice panel position on language changes

- Realign the open voice panel after the document direction changes. A browser regression reproduces the late RTL/LTR commit and verifies the panel stays within the tablet viewport. [Evidence](docs/execution-2026-11-04/WEBSITE_COMPLETION_2026-11-05.md).

## 6 November 2026 — quote form language pass

- Localize the quote form, notices, retry and confirmation in English, Urdu and Arabic.
- Display catalog-provided product names and keep the persisted event, variant, price and WhatsApp contract stable.
- Verify that switching languages after an inquiry save error preserves the entered details and permits a successful retry. [Evidence](docs/execution-2026-11-04/WEBSITE_COMPLETION_2026-11-05.md).

## 4 November 2026 — verification checkpoint / unfinished release gate

## 5 November 2026 — recipient inquiry handoff and storefront clarity

- Add neutral recipient guidance with validated/idempotent inquiry persistence, admin visibility and WhatsApp draft continuity.
- Preserve explicitly unselected custom requests; improve modal focus, background isolation, theme and short-height controls.
- Replace unsupported homepage process claims with shopping/gifting/delivery guidance and useful links.
- Verification and release limits: [current report](docs/execution-2026-11-04/WEBSITE_COMPLETION_2026-11-05.md).

## 5 November2026 — CI-404-NAV1 recovery/telemetry synchronization

002250f branch CI passed; PR merge failed only the Batch F404 recovery fixture-path assertion after a500ms sleep. Focus/hover/voice/layout checks passed in both runs. Select the actual404 recovery link and await URL, committed fixture route and removed404 surface; await actual view/add-cart telemetry instead of fixed timing. Original strict assertions retained; no application behavior change. Affected1/1 and typecheck/hooks pass; renewed full/hosted verification in progress. [Evidence](docs/execution-2026-11-04/VOICE_02_IMPLEMENTATION_2026-11-05.md).

## 5 November2026 — CI-STAFF-FOCUS2 / CI-HOVER-PREMISE2

Observed39facbd PR merge PASS838/0/1 but branch FAIL836/2/1 at recurring staff focus and showcase hover checks. The staff test now proves the pending real focus-frame ordering, releases it and waits actual focus before retaining strict keyboard/revoke assertions. Showcase waits actual fonts, moves the pointer inside a stable panel and asserts CSS:hover before/after15s while retaining resume timing. No application logic or acceptance assertion is weakened. Fresh static/build gates, targeted12/12 and full838/0/1 plus backend/assets/36 production pass; hosted reruns are in progress. [Evidence](docs/execution-2026-11-04/VOICE_02_IMPLEMENTATION_2026-11-05.md).

## 5 November 2026 — VOICE02-LAYOUT1 responsive follow-up

Additional checks reproduced a360px English voice-panel edge and enlarged-text shop-toolbar overflow. Align the shared panel layout within viewport margins on resize/scroll/locale/content changes; wrap the existing filter/saved controls, give the saved control a useful wrapping basis and preserve word-readable label width. Expanded browser journey passes30 layout/theme/language/enlarged-text cases; final39facbd local full verification passes838/0/1 plus backend/assets/36 production checks; hosted checks remain in progress until observed. Initial754d969 full-suite evidence remains historical. No commerce/filter logic, new dependency or live changes. See [current evidence](docs/execution-2026-11-04/VOICE_02_IMPLEMENTATION_2026-11-05.md).

## 5 November 2026 — VOICE-02 website implementation

Owner authorized completing available work now. Extended existing shared website microphone control to45s with a countdown, graceful auto-stop and4MiB raw guard. Decode/resample allocation is bounded to60s; excluded audio is disclosed. Single WAV requests stay below2MiB; metadata-aware strict server validation uses real PCM bytes. Preparation and upload deadlines are separate. Up to4,000 transcript characters are preserved for review, with the existing1,000-character submission limit enforced explicitly. Animated drawer close cancels mic/TTS before unmount. English/Urdu/Arabic recovery copy updated; no dependency, pricing, order-storage, credential or deployment change.

Service/server tests and real UI/HTTP fixture expanded for duration boundaries, overrun warning, large capture cleanup, metadata/malformed input, preserved overlong text, fresh upload deadlines and cancellation before exit unmount. Historical staff/hover failures did not reproduce in12 local diagnostics; both9d6075f hosted workflows subsequently passed, so no speculative application fix is included. Full exact gates, self-review, remaining WhatsApp intake/provider/phone/live blockers and save state: [VOICE-02 implementation evidence](docs/execution-2026-11-04/VOICE_02_IMPLEMENTATION_2026-11-05.md).

## 5 November 2026 — VOICE-02 website and WhatsApp plan

Owner selected the corrected voice approach for both channels and deferred implementation to their PC session. Saved a continuation specification: website45s capture with a single WAV request,60s defensive ceiling with visible truncation warning, optional duration-correct chunking, partial recovery, safe timer/mic/TTS lifecycle and separate verified WhatsApp media/confirmation flow. Existing VOICE-01 runtime remains unchanged. Reconciled the supplied audit: mic release, Buffer guard, TTS cancellation and most vocabulary terms already exist; metadata WAV support is a compatibility improvement. No zero-failure promise or silent long-note truncation.

Read actual PR16 merge-run41909530222 logs:833 pass,2 fail,1 emulator skip at merge3c88379; staff-dialog focus and showcase hover-delay failures need reproduction and root-cause diagnosis. Older passing results are preserved separately. Updated entry guides, master plan, AI/integration overview, execution index/current status and handoff. Required build/privacy and document-review outcomes are recorded in [VOICE-02 evidence](docs/execution-2026-11-04/VOICE_02_PLAN_2026-11-05.md). This is documentation only: no implementation, keys, live workflow edit, messages, order sync, production merge/deploy, dependency change or tracked removal.

5 November 2026 — CI-GALLERY1 / CI-VOICE-SYNC1: gallery diagnostics saved02fa4a2; committed hero voice assertion saved203623404979b52837963c4750d7724acdfec305. Latest typecheck/hooks/build/privacy, affected gallery3/3 and voice9/9, full835PASS/0FAIL/1 emulator SKIP across106 files plus21 backend,97-product/115-reference asset audit and36 production checks PASS locally. Hosted outcomes are recorded separately in the execution evidence; historical404 trigger and real provider/device/merchant/live gates remain open. [Evidence](docs/execution-2026-11-04/GALLERY_VERIFICATION_2026-11-05.md).

Hosted source4065e35 verification subsequently completed PASS:834 tests,0 failures,1 emulator-only skip across106 test files, plus backend/assets/36 production checks; run41851671404. This does not erase the local gallery404 or verify real providers/live. [CI](https://github.com/Taha7869/AllBarka-34/actions/runs/41851671404).

4 November 2026 — Final local gate on source 4065e357633586f186143191282c5809584e6f9a: typecheck/hooks/build and targeted 20/20 PASS; complete npm test FAIL (833 PASS, 1 FAIL, 1 emulator SKIP; 835 total). Remaining failure: tests/interaction-polish-browser.test.tsx:206, one unexpected HTTP404 console event. Exact resource URL was not captured; do not assume it is the intentionally missing preview or suppress arbitrary404s. Local execution environment became unavailable during the URL diagnostic. Voice/source checkpoint is saved, but release verification remains unfinished. [Evidence](docs/execution-2026-11-04/FINAL_STATUS.md). No runtime or test assertion changes in this documentation checkpoint.

## 4 November 2026 — VOICE-01 and search integration

4 November 2026 — VOICE-01: bounded Groq transcription, editable Buddy/hero/shop input, matching device read-aloud, unit-aware product search and dedicated filter focus target. Typecheck/hooks/build and targeted 20/20 PASS. At the code-save checkpoint the full result was pending; the newer final local result above is FAIL; real provider/device/live gates remain open. [Evidence](docs/execution-2026-11-04/PHASE_3.md).

## 4 November 2026 — Phase 2 merchandise clarity

4 November 2026 — Phase 2: default shortlist/combos, available pumpkin 250g card selection and truthful bundle net-weight/component summaries. No price or saved-settings mutation. Type/hooks/build PASS; targeted 38/38 PASS. Earlier whole-suite hover-clock failure remains a caveat pending final rerun. [Evidence](docs/execution-2026-11-04/PHASE_2.md).

## 4 November 2026 — Phase1 CI synchronization

Post-save editor reload is now explicitly awaited before stale-revision mutation; asserts outgoing revision2, HTTP409 and preserved concurrent revision5. RTL tests await actual locale/surface state. NotFound adds a stable test marker only. Type/hooks/build and targeted6/6PASS; full820P/1F/1S with a separate hover-clock blocker. [Evidence](docs/execution-2026-11-04/PHASE_1.md). No runtime price/auth changes.

## 4 November 2026 — DOC-CLEAN-01 / AI guide, review reconciliation and safe cleanup

- Before: mixed continuation/history in instructions.md, obsolete browser-localhost/Ollama README, stale phase summaries and reviewer claims could misdirect new agents.
- After: concise canonical instructions.md, instruction.md entry alias and refreshed AGENTS/README-AI; original root history retained under docs/archive/2026-11-04. trash.md records baseline blobs, recovery paths and **zero tracked file deletions**.
- MASTER_PLAN/design/RULES/handoff now carry owner-confirmed unpaid hosting, deferred box3D, delegated merchandising, printing capability with samples pending and selected VOICE-01. Existing M01–M34 IDs and business/runtime contracts remain.
- Source review flags pumpkin100g tier and DailyGrind comparison without changing merchant prices/contents; corrects unsupported Rs2200 TastingFlight assertion and blanket completion/provider certification. M34 price warnings and dual packaging remain proposals.
- Review: direct self-review; exact checks and known baseline CI failures in [cleanup evidence](docs/CLEANUP_VERIFICATION_2026-11-04.md). No runtime/price/config/key/workflow/live data or deployment change.

03 November 2026 — **FINAL-20261103 / bounded repairs DONE locally, full offline gate PASS**. Reviewed the eight-layer AI reference against the existing application. Implemented QA-NET1 required-resource failure diagnostics (removing blanket OS-error suppression), S7-FINAL1 provider cancellation/late-catalog deadline guard and bounded private-safe timings, and M32-PARITY1 actual shared storefront iframe preview with EN/UR/AR, theme and 390/768/1440 breakpoints. Focused checks, final static/build gates and full offline suite PASS: 821 passed, 0 failed, 1 emulator-only skip across 103 test files, plus 11 hardening, 21 backend and 36 production checks. A separate read-only offline CI workflow is added; GitHub-hosted execution remains unverified until observed. See [final verification evidence](docs/FINAL_VERIFICATION_20261103.md) for actual results, failure/fix records and the explicit code/manual/live pending list. Historical “DONE locally” entries do not certify live integrations or erase M04/M05/M16 remaining scope. Public deployed commit differs from this branch; no production mutation or deployment performed.

## 01 November 2026 — Stage 6 client preview bootstrap repair & operational integration verification

- **Correction of Premature Completion Claim & Scope**:
  - Corrected premature completion claim from checkpoint `a11bac7`: browser client bootstrap previously ignored Vite's `import.meta.env.MODE`. Because browser code does not receive unprefixed `ALLBARKA_MODE`, running Vite in preview mode with a unique project ID (such as `allbarka-preview-123`) entered production/fallback behavior.
  - Repaired client preview bootstrap in `src/lib/environmentConfig.ts`: recognizes actual Vite preview mode (`env.MODE === 'preview'`) independently of project naming.
  - In preview mode: strictly requires explicit SDK fields needed by existing email and Google authentication (`VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`); rejects production targets (`PRODUCTION_TARGET_REJECTED`); and never substitutes production JSON values from `firebase-applet-config.json` for missing preview fields.
  - Preserved server-mode and production backwards compatibility without exposing server environment variables or broadening `envPrefix`.
  - Added behavioral regressions in `tests/stage6-operational-integration.test.ts`:
    1. Browser-shaped environments containing `MODE` and `VITE_*` fields only (valid unique project ID, missing required auth fields fail closed, accidental production targets rejected, production browser mode compatibility).
    2. Actual Vite preview-mode transform/build verification using `vite.build({ mode: 'preview' })` (unique project ID execution in VM sandbox, incomplete config rejection, accidental production target rejection).
- **Quality Gates**:
  - `tests/stage6-operational-integration.test.ts`: 2/2 tests PASS (including actual Vite preview builds).
  - 61 affected catalog/staff/commerce/persistence/auth tests PASS.
  - `npm run typecheck` (`tsc --noEmit`): PASS (0 errors).
  - `npm run lint:hooks` (`eslint src`): PASS (0 errors).
  - `$env:ALLBARKA_SKIP_LOCAL_ENV="true"; npm run build`: PASS (84 artifact privacy audit clean, 0 esbuild warnings).
  - Full offline suite (`node scripts/run-all-tests.mjs`): PASS.

## 31 October 2026 — R04-KG1-W1 historical inquiry replay compatibility (follow-up)

- Both `/api/quotes` and `/api/inquiries` now pass the historical hash and canonical request composition to `persistInquiryAtomically`; replay requires hash match plus `isHistoricalHamperReplayEquivalent` against the stored original inquiry. Fail-closed 409 when the stored configuration is missing/incomplete (limitation; no migration).
- Fixed `/api/inquiries` legacy hash eventType (was inquiry type).
- Results: `tests/stage6-inquiry-flow.test.ts` 30/30 (2 new endpoint suites; mutation check confirmed they fail if equivalence is bypassed); typecheck 0; `lint:hooks` 0 warnings; build + privacy audit exit 0 (84 artifacts); focused browser/hamper/pricing suites exit 0; full offline suite exit 0: 757 passed, 0 failed, 1 skipped (emulator-only), 21 backend, 36 production checks.

## 31 October 2026 — R04-KG1-W1 filled box and custom-weight net filling repair & integration

- **Status**: `IN_PROGRESS` (repaired locally on isolated fixtures; live catalog data seeding pending merchant confirmation).
- **Repaired Defects**:
  1. *Server Weight Boundary & Resolution*: Normalized weight once at server boundary (`normalizeAndValidateInquiryWeightAndHamper` in `src/lib/inquiriesRouter.ts`). Constructs canonical `hamperConfiguration` merging `canonicalNetFillingGrams`. Explicit weights bypass the historical 200g-per-selection formula (e.g. 750g request with 4 selections yields honest unpriced 750g inquiry, never 800g / Rs. 18,008 estimate). Rejects conflicting top-level and nested weights with HTTP 400 `CONFLICTING_NET_FILLING_WEIGHT`.
  2. *Packaging-Only Price vs Complete Estimate Separation*: In `CustomQuoteModal.tsx`, server response, persisted inquiry, and WhatsApp URL generation, when `resolveHamper` returns no complete estimate (`estimatedTotalPkr == null`), consistently outputs `requiresTeamQuote: true`, `standardPrice: null`, and `estimatedTotalPkr: null`. Never uses packaging price as a complete estimate. Preserved `QUOTE_REQUIRED` in `orderValidation.ts` and `CartContext.tsx`.
  3. *Hamper Composition Idempotency Hashing*: `computeInquiryPayloadHash` now includes canonical sorted selections, boxId, recipientName, giftMessage, and netFillingGrams. Replaying identical requests succeeds; changed composition under same key triggers HTTP 409 `IDEMPOTENCY_PAYLOAD_MISMATCH`. Historical replay compatibility (corrected 31 Oct 2026, follow-up): the previous claim was unsupported because both endpoints omitted the legacy hash argument and a legacy-hash match alone ignored composition. Now both endpoints pass the historical hash plus the canonical request composition to persistInquiryAtomically, which replays a historical intent only if the legacy hash matches AND isHistoricalHamperReplayEquivalent (src/lib/inquiryService.ts) confirms the stored original inquiry has the same box, selections (order-insensitive), effective weight, recipient and message. The original record, totals and reference are returned unchanged. Changed configuration returns 409 IDEMPOTENCY_PAYLOAD_MISMATCH. Limitation: a historical inquiry whose stored hamperConfiguration is missing or incomplete cannot be verified and fails closed with 409 (the customer must submit a fresh inquiry); no data migration was performed. Also fixed the /api/inquiries legacy hash, which used the inquiry type instead of the event type and could never match.
  4. *Gift-Weight UI Alignment & Validation*: Removed invented `min=50, max=5000, step=50` input constraints, aligning with shared server validation (`min={1}, max={10000}, step="any"`). Blank custom input triggers localized validation error (`quote.customWeightRequired`) and preserves form draft. Valid non-50g-multiples (e.g. 775g) submit and persist cleanly. Localized across EN, UR, and AR with RTL support.
- **Verification Evidence**:
  - `tests/stage6-inquiry-flow.test.ts`: 28/28 PASS.
  - `tests/filled-gift-journey-browser.test.tsx`: 14/14 stages PASS (including 390px viewport, blank input error, 775g keyboard entry, dark mode, and UR/AR RTL).
  - `tests/hamper-catalog.test.tsx`: 9/9 PASS.
  - `tests/filled-gift-pricing.test.ts`: 21/21 PASS.
  - `npm run typecheck` (`tsc --noEmit`): PASS (0 errors).
  - `npm run lint:hooks` (`eslint src`): PASS (0 errors).
- **Remaining Live Business Data**:
  - 8 `BID_BOX_PRODUCTS` in live Firestore remain to be confirmed/created.
  - 3 `hamperBoxes` (`box-wood`, `box-velvet`, `box-tin`) remain to be confirmed/seeded.
  - Live product recipes for filled gift options remain to be entered by merchant.
  - These business data items are tracked as external merchant prerequisites before live deployment.

## 31 October 2026 — R04-KG1 verification gap closure (production build & privacy audit, real ThemeProvider dark switch, 390px RTL visual parity, 10-hamper HTTP endpoints)

- **Production build & privacy audit**:
  - Executed `$env:ALLBARKA_SKIP_LOCAL_ENV="true"; npm run build` on source revision `dc9a7d41211453e45b7df4b7e081fa56a91adeb8` (Build source: `04402a72aab5f441`). Vite v6.4.5 built frontend assets in ~8.7s, esbuild bundled `build/server.cjs` (1.0mb), and `scripts/audit-release.mjs` audited 84 text artifacts with zero private values printed. Exit code: 0.
- **Admin recipe editor browser test corrections (`tests/admin-recipe-editor-browser.test.tsx`)**:
  - Mounted real `ThemeProvider` (`src/contexts/ThemeContext.tsx`) wrapping `LanguageProvider` and `CatalogProvider`.
  - Switched app theme via supported hook mechanism (`useTheme().setTheme('dark')`), asserting `document.documentElement.dataset.theme === 'dark'` and `classList.contains('dark')`.
  - Verified recipe controls at 390px viewport width in Urdu RTL (`fixtureSetLanguage('ur')`, `dir="rtl"`, `lang="ur"`).
  - Checked for zero horizontal overflow on `document.documentElement`, modal `dialog`, and `#item-section-recipe` (`scrollWidth <= clientWidth`).
  - Verified that all recipe controls (ingredient selects, grams inputs, remove and add buttons) are visible, usable (enabled), have positive bounding box dimensions, and stay strictly within the 390px viewport (`box.x >= -1 && box.x + box.width <= 390 + 1`). Mere `textContent` presence explicitly rejected as insufficient evidence.
- **Ten-hamper acceptance fixture via real HTTP endpoints (`tests/filled-gift-journey-browser.test.tsx`)**:
  - Added Stage 13 verifying the 10-hamper acceptance fixture: 4 ingredients at Rs. 1,001/kg (`pista`, `kaju`, `badam`, `akhroot`), 200g each, 10 hampers, packaging Rs. 1,000 each (`box-wood`).
  - Contents subtotal exact: 4 × 1001 × 0.2 × 10 = Rs. 8,008. Packaging total: 10 × 1000 = Rs. 10,000. Authoritative total: Rs. 18,008. Nominal unit price: Rs. 1,801.
  - Verified across both real HTTP endpoints: `POST /api/quotes` and `POST /api/inquiries`.
  - Asserted `record.estimatedTotalPkr === 18008` in persistent `memoryFirestore` and WhatsApp URL message text `• *Estimated Total Ref:* Rs. 18,008 PKR`, confirming zero drift to 18,000 or 18,010.
- **Test suite status**:
  - `tests/admin-recipe-editor-browser.test.tsx`: 12 stages PASS.
  - `tests/filled-gift-journey-browser.test.tsx`: 13 stages PASS.
  - `tests/hamper-catalog.test.tsx`: 9/9 tests PASS.
  - `tests/filled-gift-pricing.test.ts`: 20/20 tests PASS.
  - `npm run typecheck` (`tsc --noEmit`): PASS (0 errors).
  - `npm run lint:hooks` (`eslint src`): PASS (0 errors).
  - Status remains explicitly `IN_PROGRESS` pending merchant execution of live catalog migration/seeding.

## 31 October 2026 — R04-KG1 builder & recipe editor precision unification, blank row validation and acceptance fixture

- **Custom Hamper Builder & Admin Recipe Editor shared estimator unification**:
  - `src/components/CustomHamperBuilderModal.tsx`: Replaced separate `selectedItems.reduce(..., hamperSelectionPrice)` total summation with `calculateFilledGiftEstimate` / `resolveHamper`, ensuring individually rounded lines do not determine aggregate or order totals.
  - `src/components/AdminRecipeEditor.tsx`: Replaced line-by-line rounded summation in `defaultSummary` and `variantSummary` with `calculateFilledGiftEstimate`, computing exact order-level precision totals.
  - `tests/hamper-catalog.test.tsx`: Added test verifying `CustomHamperBuilderModal` renders shared estimator contents subtotal Rs. 801 and total Rs. 2,601 for 4 × Rs. 1,001/kg selections. Passed 9/9 tests.
- **Explicit merchant selection & grams on new recipe rows**:
  - `src/components/AdminRecipeEditor.tsx`: New ingredient rows initialized as `{ productId: '', grams: 0 }` for both default recipes and variant recipes, requiring explicit merchant selection instead of auto-selecting the first candidate or assigning 50g. Displays `Select an ingredient product` badge when `productId` is empty and placeholder `e.g. 50` when grams is 0. Preserved intentional copying of existing configured default recipe when enabling custom variant override.
  - `src/components/AdminItemForm.tsx`: Added client-side fail-closed validation guards rejecting save when `recipeIngredients` or `filledRecipes` contain incomplete rows.
  - `src/contexts/adminExpansionTranslations.ts`: Added localized translations for `selectProductRequired` across English, Urdu, and Arabic.
- **Acceptance fixture & browser journey verification**:
  - `tests/admin-recipe-editor-browser.test.tsx`: Extended to 12 stages, verifying:
    - Blank new row initialization and client-side validation rejection with `INVALID_RECIPE_INGREDIENT` on incomplete save attempt.
    - Intentional recipe copying when enabling custom variant override and blank row initialization on variant `Add Ingredient`.
    - Acceptance fixture: 4 ingredients at Rs. 1,001/kg, 200g each, Rs. 1,000 packaging: 4 rows showing `→ Rs. 200 PKR / box` each, aggregate preview showing `Total filling mass: 800g per box` and `Total ingredient estimate: Rs. 801 PKR / box`.
    - Mobile (390×844), RTL (Urdu `dir="rtl"`), and dark mode parity with zero console/page errors.
- **Owner confirmation**:
  - Manual final quotation via WhatsApp is the confirmed and permanent workflow. No automated approval-token or durable quote-to-order conversion system will be built.
- **Test suite status**:
  - All 85 test files (745 passed, 0 failed, 1 skipped), 21 backend tests, 36 production checks, `tsc --noEmit`, and `eslint src` PASS.
  - `R04-KG1` explicitly remains `IN_PROGRESS` pending merchant execution of live Firestore catalog data migration/seeding.

## 31 October 2026 — R04-KG1 custom hamper precision, encoding restoration and admin visual recipe editor

- **Custom-hamper order-level precision policy**:
  - `src/lib/hamperCatalog.ts`: Added `quantity: number = 1` parameter to `resolveHamper`. Implemented order-level BigInt scaling: `exact += BigInt(kgRate) * 200_000n * BigInt(validQty)`. Computed `ingredientsSubtotal = roundHalfUp(exact, MICRO)`, `packagingTotal = box.price * validQty`, `estimatedTotalPkr = ingredientsSubtotal + packagingTotal`, and display unit price `unitPrice = Math.round(estimatedTotalPkr / validQty)`. Returned `packagingPrice`, `ingredientsSubtotalPkr`, `estimatedTotalPkr`, and `quantity` on `ResolvedHamper`.
  - `src/lib/inquiryResolution.ts`: Passed `quantity` to `resolveHamper` and preserved `estimatedTotalPkr`.
  - `src/components/CustomQuoteModal.tsx`: Passed `quantity` to `resolveHamper` and preserved `estimatedTotalPkr`.
  - `tests/hamper-catalog.test.tsx`: Added acceptance test for 4 ingredients at Rs. 1,001/kg, 200g each, 10 hampers: ingredient subtotal = Rs. 8,008; packaging total (Rs. 1,000 × 10) = Rs. 10,000; total = Rs. 18,008 (nominal unit price Rs. 1,801). Passed 8/8 tests.
- **UTF-8 character encoding restoration**:
  - `server.ts`: Restored `👑 *ALLBARKA LUXURY BOUTIQUE ORDER* 👑` on line 426.
  - `src/lib/inquiriesRouter.ts`: Restored `—` em-dash on line 143 in contact WhatsApp URL. Preserved Urdu and Arabic script fidelity.
- **Admin visual dynamic recipe editor**:
  - `src/components/AdminRecipeEditor.tsx`: Created visual recipe editor component with candidate ingredient selection from catalog, grams per box input with live cost calculations (`kgRate * grams / 1000`), net filling grams, total ingredient estimate per box, warning badges for unconfigured 1kg rates, localized customer recipe descriptions (`recipe_en/ur/ar`), and variant-specific recipe overrides (`filledRecipes`) with enable/disable checkbox and per-variant ingredient lists.
  - `src/components/AdminItemForm.tsx`: Wired `AdminRecipeEditor`, inserted `'recipe'` into `ITEM_SECTIONS` at index 4 (preserving index 3 `seo` for tests), rendered `<details id="item-section-recipe">`, connected patch handlers, and added recipe review preview to `#item-section-review`.
  - `src/contexts/adminExpansionTranslations.ts`: Added 24 localized translation entries (English, Urdu, Arabic) for recipe fields, labels, summaries, hints, and error reasons (`reason.INVALID_RECIPE_*`).
  - `src/lib/catalogSchema.ts`: Allowed variant labels that exist in `seed.commerce?.options` in `validateCatalogPricing`.
  - `src/contexts/CatalogContext.tsx`: Passed `effectiveSeed` with `raw.commerce` to `pricingFromLegacy` in `refresh()`.
  - `tests/admin-recipe-editor-browser.test.tsx`: Created 10-stage end-to-end mounted browser journey test verifying navigation, live rate calculation, localized text, variant override, review preview, admin API save to `memoryFirestore`, record persistence with revision 2, round-trip reload, and recipe clearing with revision 3.
- **Test suite status**:
  - All 85 test files (744 passed, 0 failed, 1 skipped), 21 backend tests, 36 production checks, `tsc --noEmit`, and `eslint src` PASS.
  - `R04-KG1` explicitly remains `IN_PROGRESS` pending merchant execution of live Firestore catalog data migration/seeding.

## 31 October 2026 — R04-KG1 hamper box authority, precision policy and fallback removal

- **Hamper box pricing authority & catalog snapshot binding**:
  - `src/lib/inquiriesRouter.ts`: Added `getHamperBoxes` & `getSnapshot` options and implemented `resolveCatalogAndBoxes()` resolving both `products` and `hamperBoxes` from the same fresh snapshot via `loadAuthoritativeCatalog(db, { fresh: true })`. Passed `hamperBoxes` to `resolveInquiryProductVariant` in both `/api/quotes` and `/api/inquiries`.
  - `server.ts`: Omitted redundant `getCatalog`, allowing `createInquiriesRouter` to fetch unified catalog snapshots directly from database.
  - `src/lib/hamperCatalog.ts`: In `resolveHamper`, strictly validated `option.active !== false && Number.isSafeInteger(option.price) && option.price > 0`. Zero-priced, disabled, or missing hamper boxes fail closed immediately.
  - `src/lib/inquiryResolution.ts`: Passed `hamperBoxes ?? []` to `resolveHamper`, strictly preventing fallback to compiled `HAMPER_BOXES` default seeds when hamper boxes are unsupplied or missing.
  - `src/contexts/CatalogContext.tsx`: Added `hamperBoxes` state and exported `useCatalogHamperBoxes()` hook to deliver reactive updates on catalog refresh.
  - `src/components/CustomQuoteModal.tsx` & `src/components/CustomHamperBuilderModal.tsx`: Connected `useCatalogHamperBoxes()` to map over dynamic authoritative hamper boxes instead of static seeds.
- **Non-divisible money precision preservation**:
  - `src/lib/inquiryResolution.ts`: Added `authoritativeEstimatedTotalPkr` tracking from `calculateFilledGiftEstimate` for filled gifts. Preserves exact order total `estimatedTotalPkr` directly rather than recalculating `standardPrice * quantity`.
  - `src/lib/inquiryWhatsApp.ts`: Formatted `• *Estimated Total Ref:* Rs. ${Number(params.estimatedTotalPkr).toLocaleString()} PKR` when `estimatedTotalPkr != null && Number(estimatedTotalPkr) > 0` and team quote is not required.
  - `docs/admin-expansion/FILLED_GIFT_PRICING.md`: Documented the precision policy across display, persistence, and WhatsApp messaging.
- **Legacy card fallback removal**:
  - `src/components/BidBoxesSection.tsx`: Removed `cfg.filledMin` numeric fallback. When recipe or ingredient rates are missing, card renders an honest `Quote on Request` state with zero numeric pricing.
- **12-stage mounted browser journey verification**:
  - `tests/filled-gift-journey-browser.test.tsx`: Extended from 9 to 12 stages, adding:
    - Stage 10: Stored hamper box rate authority (Rs. 2,200), dynamic updates (Rs. 2,500), and fail-closed handling of inactive/disabled boxes without compiled seed fallback.
    - Stage 11: Non-divisible money precision preservation (Rs. 1,001/kg × 50g × 10 boxes = Rs. 501 ingredient subtotal + Rs. 1,000 packaging = Rs. 1,501 total preserved end-to-end without rounding drift to Rs. 1,500).
    - Stage 12: Unconfigured recipe card display verifying honest `Quote on Request` state and absence of any numeric `Filled: Rs.` pricing.
- **Test suite status**:
  - All 84 test files (742 passed, 0 failed, 1 skipped), 21 backend tests, 36 production checks, `tsc --noEmit`, and `eslint src` PASS.
  - `R04-KG1` explicitly remains `IN_PROGRESS` pending visual recipe editor in `AdminProductEditModal`.

## 30 October 2026 ? R04-KG1 actual inquiry submission journey and mounted browser evidence

- **End-to-end inquiry submission journey alignment**:
  - `src/lib/inquiriesRouter.ts`: Both `/api/quotes` and `/api/inquiries` pass `hamperConfiguration` to `resolveInquiryProductVariant`, recompute authoritative recipe estimates server-side, ignore client-supplied rates and totals, and persist distinct `standardPrice`, `estimatedTotalPkr`, and independent customer `offeredPrice`. Generated WhatsApp URL path reflects computed estimates without legacy Rs9,000 prices.
  - `src/lib/inquiryResolution.ts`: Added `hamperConfiguration` and `hamperBoxes` parameters to `resolveInquiryProductVariant`. Validates custom hampers server-side via `resolveHamper`; valid hampers get `isVerifiedCatalogProduct: true`, `standardPrice`, and structured configuration, while arbitrary custom-hamper strings fail verification (`isVerifiedCatalogProduct: false`, `requiresTeamQuote: true`, `standardPrice: null`). In filled mode, dynamic estimates are computed via `calculateFilledGiftEstimate`, leaving missing recipes/rates unpriced without legacy fallback.
  - `src/lib/inquiryWhatsApp.ts`: Added structured hamper configuration formatting to customer WhatsApp URL (`Hamper Coffer`, selections with 200g portion mass, recipient name, and gift message).
  - `src/lib/storefrontSubmissions.ts`: Added `hamperConfiguration`, `boxMode`, `mode`, and `variantLabel` to `CustomQuoteSubmissionInput`.
  - `src/components/CustomQuoteModal.tsx`: Preserves `hamperConfiguration`, renders hamper estimate via `resolveHamper`, passes configuration to `submitCustomQuoteInquiry` and WhatsApp links, and added Escape key handler.
- **Fail-closed empty packaging deletion/disablement rule**:
  - `src/lib/filledGiftPricing.ts`: In `resolveEmptyPackagingUnitPrice`, if variants or prices are configured on the product and empty packaging is deleted or all empty variants are disabled, returns `null` immediately. Strictly prevents resurrecting stale compiled `bidBoxConfig.emptyTiers` when stored empty pricing is deleted or disabled.
- **Hamper builder inquiry workflow**:
  - `src/components/CustomHamperBuilderModal.tsx`: Removed `onAddToCart` call from `finish()`. Requesting a hamper quote leaves shopping bag item count unchanged (0) while opening `CustomQuoteModal` with complete structured configuration, recipient name, gift message, empty customer budget, and catalog reference rate.
- **Mounted browser & authoritative API journey verification**:
  - `tests/filled-gift-journey-browser.test.tsx`: New end-to-end mounted browser and API test verifying all 9 journey stages against isolated `memoryFirestore`:
    1. Card display estimate (Rs. 150/box; never legacy Rs. 9,000 or Rs. 9,050).
    2. Modal opening & budget independence (Catalog Reference Rate Rs. 150/box & Est. Rs. 1,500 total for 10 boxes; customer budget starts empty; customer enters independent budget offer).
    3. Quote submission & agreement (persisted record has `standardPrice: 150`, `estimatedTotalPkr: 1500`, `offeredPrice: 120`; decoded WhatsApp message matches).
    4. Changed authoritative kg rate (Rs. 2,000/kg -> Rs. 200/box; server strictly ignores forged browser rate/subtotal).
    5. Missing recipe / kg rate / packaging remains unpriced (`standardPrice: null`, `requiresTeamQuote: true`; legacy packaging IDs unpriced for new inquiries).
    6. Deleting / disabling stored empty pricing cannot resurrect compiled tier.
    7. Hamper inquiry journey (cart count unchanged at 0, structured configuration validated server-side, arbitrary custom-hamper rejected).
    8. Direct order submission strictly fails closed with `QUOTE_REQUIRED`.
    9. Idempotency deduplication and payload mismatch protection.
- **Test suite status**:
  - All 84 test files (742 passed, 0 failed, 1 skipped), 21 backend tests, 36 production checks, `tsc --noEmit`, and `eslint src` PASS.
  - `R04-KG1` explicitly remains `IN_PROGRESS` pending visual dynamic recipe editor in `AdminProductEditModal`.

## 30 October 2026 — R04-KG1 estimate consistency and inquiry journey slice

- **Estimate consistency between card, modal, and server**:
  - `src/lib/filledGiftPricing.ts`: Updated `resolveEmptyPackagingUnitPrice` to check both `product.prices` and `product.bidBoxConfig.emptyTiers`, returning the actual packaging unit price even when requested quantity is below the smallest pack tier (falling back to the smallest pack tier unit rate).
  - `src/components/BidBoxesSection.tsx`: Removed misleading `activeFilledOpt?.price` fallback. Displays localized `catalog.quoteOnRequest` ('Quote on Request') when recipe/rates are missing. Option buttons compute per-box estimates via `calculateFilledGiftEstimate` or show 'Quote on Request', eliminating outdated filled prices.
  - `src/components/CustomQuoteModal.tsx`: Resolves actual empty packaging unit cost via canonical `resolveEmptyPackagingUnitPrice(selectedProduct, quantity)` and passes to `calculateFilledGiftEstimate`. Computes `effectiveReferenceRate` to show per-box estimate (and total for quantity > 1) or 'Custom Quote on Request (Team Review)', never displaying legacy Rs. 9,000 filled option prices. Connected `effectiveReferenceRate` to budget placeholders, WhatsApp inquiry URLs, and quote persistence.
  - `src/lib/orderValidation.ts`: In filled packaging mode, dynamically evaluates filled packaging recipes at authoritative pricing boundary (`validateAndPriceOrder`), matching customer quotes and rejecting invalid/missing recipe or kg rates with `PRICING_UNAVAILABLE`, while preserving historical compatibility for known legacy packaging labels.
- **Custom Hamper Builder inquiry journey**:
  - `src/components/CustomHamperBuilderModal.tsx`: Updated Step 3 action copy to "Request Hamper Quote" (`t('add')`) across EN, UR, and AR. In `finish()`, dispatches `openCustomQuoteModal` with complete coffer name, 200g portion details for each selection, recipient name, gift message, and target price, while maintaining `onAddToCart` for client bag state.
  - `src/lib/inquiryResolution.ts`: Added support for `custom-hamper` product IDs in `resolveInquiryProductVariant`, enabling seamless quote modal prefill and review.
- **Trilingual localization**:
  - `src/contexts/catalogTranslations.ts`: Added `'catalog.quoteOnRequest'`: EN `'Quote on Request'`, UR `'قیمت رابطہ پر دستیاب'`, AR `'السعر عند الطلب'`.
- **Comprehensive test verification**:
  - `tests/filled-gift-pricing.test.ts`: Added Test 20 verifying the acceptance scenario across 12 assertions (A through L):
    - Ingredient Rs. 1,000/kg (50g/box = Rs. 50/box), empty packaging Rs. 100/box, old filled option Rs. 9,000.
    - Verified estimate is Rs. 150/box (Rs. 1,500 for 10 boxes), never Rs. 9,050/box or Rs. 90,000.
    - Card, modal, and authoritative server estimate strictly agree.
    - Rate updates (Rs. 2,000/kg) update estimates accurately (Rs. 200/box, Rs. 2,000 for 10 boxes).
    - Missing recipe, missing kg rate, or missing packaging strictly fail closed to unpriced state and server `PRICING_UNAVAILABLE`.
    - Customer budget remains strictly separate from catalog estimate.
    - Hamper builder configuration is preserved upon quote dispatch.
    - Direct order creation strictly fails closed with `QUOTE_REQUIRED`.
  - All 20/20 `tests/filled-gift-pricing.test.ts` pass. Full offline suite (741 tests across 83 files, 21 backend, 36 production checks) pass.
- **Status tracking**:
  - Maintained `R04-KG1` as `IN_PROGRESS` in all documentation pending: (1) Visual admin recipe editor in `AdminProductEditModal`, (2) Merchant quote-approval workflow, (3) Live Firestore catalog seeding.

## 30 October 2026 — R04-KG1 inquiry guard persistence boundary security repair

- **Fixed client-controlled inquiry bypass in order creation**:
  - Removed `allowInquiryItems: Boolean(payload.allowInquiryItems)` from `createDurableOrder` (`src/lib/orderDatabase.ts`). Client payloads can no longer authorize unquoted filled packaging or custom hampers into accepted orders.
  - Strictly separated read-only estimates (`/api/orders/quote` / `quoteOrderForCustomer`) from atomic order acceptance (`/api/orders` / `createDurableOrder`). Receiving a quote or submitting a matching `expectedFinalTotal` does not grant merchant checkout approval.
  - Fail-closed: Without an authoritative merchant approval mechanism in this branch, all unapproved filled/custom order attempts strictly reject with `QUOTE_REQUIRED`.
- **Honest test fixtures & outbox dispatch verification**:
  - Removed `allowInquiryItems: true` bypass from `tests/shipping-policy.test.ts`. Directly assert `QUOTE_REQUIRED` on unapproved hamper submissions and test historical receipt replay and WhatsApp message details via seeded database records.
  - Removed `allowInquiryItems: true` bypass from `tests/stage6-order-handoff.test.ts`. Assert `QUOTE_REQUIRED` on unapproved filled packaging submissions, and use `seedHistoricalOrder` helper for verifying outbox worker delivery and receiver wire projections.
- **Added positive inquiry guard boundary tests in `tests/filled-gift-pricing.test.ts`**:
  - Test 15: Direct order creation fails with `QUOTE_REQUIRED` for filled packaging and custom hampers.
  - Test 16: Client payloads cannot bypass inquiry guard with omitted flags, `true`, `false`, strings (`"true"`), numbers (`1`), or aliases (`allowPackagingQuote`, `permitInquiry`, `isQuoteRequest`, `quoteApproved`, etc.).
  - Test 17: Quoting an order and submitting with matching `expectedFinalTotal` strictly fails with `QUOTE_REQUIRED`.
  - Test 18: Empty packaging (`Empty Pack (25 pcs)`) and ordinary products (`badam` `1kg`) continue to create orders normally without inquiry rejection.
  - Test 19: Idempotency replays of already-persisted orders succeed without re-evaluating inquiry guards.
- **Status tracking**:
  - Maintained `R04-KG1` as `IN_PROGRESS` in `FILLED_GIFT_PRICING.md`, `HANDOFF.md`, `MASTER_PLAN.md`, and `instructions.md`, documenting remaining open items (admin visual recipe editor, merchant quote approval workflow, and live Firestore catalog seeding).

# AllBarka expansion change log

## 30 October 2026 — R04-KG1 kilogram-based filled gift estimates and inquiry guard

- **Before:** Existing hamper ingredient pricing prorated the 250g packaged retail option (`price_250g * 200 / 250`); `BidBoxesSection.tsx` added filled packaging variants to the cart for direct checkout; `orderValidation.ts` only enforced quote requirements at the product level (`quoteOnly || orderMode === 'inquiry_quote'`), allowing direct checkout of filled packaging variants when `orderMode === 'both'`.
- **After:**
  1. Implemented shared deterministic kilogram estimator in `src/lib/filledGiftPricing.ts`:
     - `resolveAuthoritativeKgRate(product)`: resolves the current Firestore 1kg selling rate from commerce options, base rates, variants, and prices; strictly fails closed (`null`) if missing, disabled (`available: false` or `inStock: false`), draft, archived, or quote-only; rejects calculated commerce derived from base packs < 1000g (e.g. 250g); ignores shipping mass (`weightGrams: 1000`); never synthesizes from 250g/500g packs or per-100g rates.
     - `calculateIngredientEstimate(kgRatePkr, gramsPerBox, requestedBoxes)`: exact `(K * g * n) / 1000` formula with half-up integer PKR rounding at final boundary.
     - `calculateFilledGiftEstimate`: multi-ingredient mixture estimate with separate packaging and ingredients totals; exposes `ingredientsSubtotalPkr` while keeping `estimatedTotalPkr` null if packaging price or an ingredient rate is missing/disabled (`MISSING_PACKAGING_PRICE`).
     - `classifyPackagingVariant(product, label)` & `isFilledPackagingVariant(label)`: canonical classification defaulting unclassified packaging variants to inquiry (`default-deny`).
     - `packagingVariantRequiresInquiry(product, label)`: enforces inquiry on configured recipes and filled packaging variants.
  2. Updated `src/lib/hamperCatalog.ts`: updated `hamperSelectionPrice` to calculate portion price via `resolveAuthoritativeKgRate(product) * HAMPER_PORTION_GRAMS / 1000`.
  3. Additive schema in `src/types.ts` and `src/lib/catalogSchema.ts`: added `RecipeIngredient`, allowlisted optional `recipeIngredients` and `filledRecipes` in `PUBLIC_PRODUCT_FIELDS` and validated them in `validateDynamicProduct`.
  4. Authoritative server guard in `src/lib/orderValidation.ts`, `src/lib/orderQuote.ts`, and `src/lib/orderDatabase.ts`:
     - Parameterized `validateAndPriceOrder` with `allowInquiryItems` (aliased with `allowPackagingQuote`, defaulting to `false`).
     - Strictly enforces checkout mode in direct order creation, rejecting unquoted custom hampers and filled packaging variants with `QUOTE_REQUIRED` (`ValidationError`).
     - Quotes (`quoteOrderForCustomer`) explicitly pass `allowInquiryItems: true`, calculating valid prices and shipping without bypassing checkout guards.
  5. Storefront UI journeys in `src/components/BidBoxesSection.tsx`, `src/components/CustomQuoteModal.tsx`, and `src/pages/ProductDetailPage.tsx`:
     - `BidBoxesSection.tsx`: connected to `calculateFilledGiftEstimate` for per-box estimate display (`displayFilledPrice`), preserving selected bulk tier quantity without hardcoding 50 boxes or inflating customer budget.
     - `CustomQuoteModal.tsx`: calculates and displays live recipe breakdown (ingredients, packaging, total) when `mode === 'filled'`.
     - `ProductDetailPage.tsx`: routes filled packaging variants to `openCustomQuoteModal`.
- **Verification:**
  - `tests/filled-gift-pricing.test.ts`: 14/14 tests PASS covering the owner 50g example (Rs. 50/box, Rs. 500 for 10 boxes), multiple ingredients with packaging totals, dynamic kg rate updates, pack price independence, missing/disabled kg rate failure closed, standalone retail/custom-weight price preservation, direct checkout rejection with `QUOTE_REQUIRED`, empty packaging checkout success, calculated base < 1kg rejection, shipping mass exclusion, conflicting/disabled variant fail-closed, subtotal exposure with null total, unquoted hamper rejection, canonical variant classification.
  - `tests/hamper-catalog.test.tsx`: 7/7 tests PASS.
  - `tests/authoritative-quote.test.ts`: 7/7 tests PASS.
  - `tests/stage6-legacy-packaging.test.ts`: 4/4 tests PASS.
  - `tests/stage6-order-handoff.test.ts`: 4/4 tests PASS.
  - `tests/premium-gifting-browser.test.tsx`: 1/1 test PASS.
  - `tests/admin-expansion-content-browser.test.tsx`: 1/1 test PASS.
  - `tests/admin-finishing-browser.test.tsx`: 1/1 test PASS.
  - `npm run typecheck` (`tsc --noEmit`): PASS (0 errors).
  - `npm run lint:hooks` (`eslint src`): PASS (0 errors).
  - `ALLBARKA_SKIP_LOCAL_ENV=true npm run build`: PASS (84 text artifacts release privacy audit passed).
  - `node scripts/run-all-tests.mjs`: PASS (735 passed, 0 failed, 1 skipped across 83 test files; 21 backend tests passed; 36 production checks passed).
  - `git diff --check`: PASS (0 errors).

## 30 October 2026 — R04-KG1 owner kilogram pricing policy and architecture

- **Before:** Existing hamper ingredient pricing prorates the 250g pack rate; CAT2 records Rs960 for a 200g pista portion. Filled/custom inquiry enforcement and final executable missing-record payloads remain pending, despite earlier prose implying completion.
- **Owner-confirmed target:** Calculate food fillings from the current stored 1kg selling rate and explicit net recipe grams; Rs1000/kg gives Rs50 for 50g even when the 250g pack is Rs350. Filled/custom totals are estimates with final WhatsApp confirmation. Missing kg/recipe data remains unpriced. Existing standalone retail/custom-weight rates and ordinary checkout are preserved.
- **Changed:** Recorded D14, the linked filled-gift pricing architecture/acceptance, root agent/rules/instructions/design guidance, master task and current handoff/audit correction. **Policy documentation only; implementation TODO.** No live writes, price resets, code changes, key changes or deployment.
- **Review/verification:** Codex documentation self-review and checkpoint checks are recorded in [FILLED_GIFT_PRICING.md](docs/admin-expansion/FILLED_GIFT_PRICING.md). No new live verification or runtime-test result is claimed.

## 30 October 2026 — R04-CAT2 catalog remediation reconciliation and admin-editable proposals

- **Before:** `R04-CAT1` (`0ccb8c373889296eb791abd96869b6c03b1972d7`) enumerated the 89 live Firestore `products` documents, 8 missing `BID_BOX_PRODUCTS`, 3 missing `hamperBoxes`, and taxonomy/copy exceptions, but did not yet provide a consolidated per-option merchant review table separating publication `status` from `orderMode`, verified-fact replacement descriptions for `ajwa-dates` / `medjool-dates`, or a local fixture dry run validating exact candidate payloads and concurrency preconditions.
- **After:** Prepared the `R04-CAT2` merchant review table and executed a zero-write local fixture dry run against `memoryFirestore`:
  1. Reconciled price reference discrepancies between CAT1 and CAT2 across `bid-box-luxury-tin` (140 vs 180 base), `bid-box-jute-pouch` (75 vs 40 base), `bid-box-sweet-nikkah` (180 vs 95 base), and `hamperBoxes` (1800/1400/950 vs 2000/2500/1200 PKR), tracing values to their actual compiled symbols in `src/data/products.ts` and `src/lib/hamperCatalog.ts` committed in `2c94349`.
  2. Preserved canonical variant keys (`'Empty Box (1 pc)'`, `'Empty Pack (10 pcs)'`, etc.) over informal promotional tier labels, documenting downstream compatibility risks for cart line matching, quote requests, admin schema validation (`legacyPackagingLabels`), and n8n order webhooks.
  3. Prepared schema-valid draft/inquiry candidate payloads and analyzed schema validation blockers for unpriced items in `validateDynamicProduct` and `validateHamperBoxPricing`.
  4. Resolved policy mechanics: proved why Rule D1 25-piece cap yields sub-Rs. 5,000 order totals for sub-Rs. 200 items, derived the Rs. 960 pista hamper portion from the 250g packaged retail rate, documented why filled packaging options require bespoke inquiry while standard boxes permit direct checkout, and removed unsupported claims (including "sealed food-grade packaging") from replacement date descriptions.
  5. Traced the admin price propagation architecture (Admin Save -> Firestore -> Cache Invalidation -> Backend Quote/Catalog -> Storefront Refresh), verifying that newly persisted seed products gain durable revisions and become fully editable without server restart, cache timeout, or redeployment.
  6. Tabulated all 8 missing `BID_BOX_PRODUCTS` (highlighting `bid-box-luxury-tin`, `bid-box-jute-pouch`, and `bid-box-sweet-nikkah` as Priority 1 confirmation items because they are currently publicly purchasable via compiled seed fallback) and all 3 missing `hamperBoxes` (`box-wood` `1800` PKR ref, `box-velvet` `1400` PKR ref, `box-tin` `950` PKR ref), listing every individual option label, shipping weight, dynamic Rule D1 MOQ (`calculatePackagingMoq`), and UNCONFIRMED reference PKR price, and separating `status` (`published` / `draft` / `archived`) from `orderMode` (`standard` / `inquiry_quote` / `both`).
  2. Validated candidate payloads through existing adapters (`updateAdminProduct`, `validateDynamicProduct`, `storedCatalogRecord`, `validateHamperBoxPricing`, `storedHamperBoxRecord`, `loadAuthoritativeCatalog`), confirming that `pista` (`revision: 2`: `1200 / 2200 / 4500` PKR, `pricePer100g: 500`, 200g hamper portion `960` PKR) and all 88 other stored product prices remain untouched, `moqOverride` stays unset (no hardcoded seed MOQ of `10`), no 5% import markup is reapplied, and stale `expectedRevision` fails closed with `409 CATALOG_REVISION_CONFLICT`.
  3. Prepared minimal additive taxonomy proposals (`collections: ['gift-boxes']` on the 5 hamper/gifting bundles and additive `occasions` tags) and verified-fact replacement descriptions (`desc_en`, `desc_ur`, `desc_ar`) for `ajwa-dates` and `medjool-dates` while flagging conflicting `Irani Muzafati` / `Panjgur Amber` claims in `src/data/catalogOrigins.ts`, `src/data/care/dry.ts`, and bundle copy.
- **Paths & evidence:** [CATALOG_AUDIT.md](docs/CATALOG_AUDIT.md), [r04-cat2-remediation-dry-run.json](docs/evidence/catalog-audit/r04-cat2-remediation-dry-run.json), [MASTER_PLAN.md](MASTER_PLAN.md), [instructions.md](instructions.md), [HANDOFF.md](docs/admin-expansion/HANDOFF.md), and [STAGE6_PROGRESS.md](docs/admin-expansion/STAGE6_PROGRESS.md). Zero live writes executed. Proportional verification (`git diff --check` and `ALLBARKA_SKIP_LOCAL_ENV=true npm run build` 84-artifact release privacy audit) PASS.

## 30 October 2026 — R04-CAT1 read-only live Firestore catalog and taxonomy audit

- **Before:** `docs/CATALOG_AUDIT.md`, `MASTER_PLAN.md`, and `docs/admin-expansion/STAGE6_PROGRESS.md` recorded only the 27 October 2026 public GET projection (`97` products: `92` active, `5` inactive on deployed `8cf4410`) while private live Firestore reconciliation remained `BLOCKED / NOT_RUN`, leaving it unverified whether `bid-box-umrah-tabarruk`, `bid-box-pyramid-favor`, `bid-box-card-nikkah`, and `bid-box-birth-announcement` were missing documents, intentionally inactive drafts/archives, or failing validation on stored Firestore data.
- **After:** Completed a read-only audit of live Firestore (`allbarka-live` / `(default)`), feature-branch authoritative catalog projection (`loadAuthoritativeCatalog` at `922f7c72c42e96a3501326d208c2914b8c66232a`), and deployed public projection (`https://allbarka.com` at `8cf4410d4cc9d1a2d4840a62cf0f328c4bdaaee0`). Established that:
  1. Live Firestore contains `89` `products` documents (`1` canonical `schemaVersion: 1` document `pista` at `revision: 2`, `updatedAt: 2026-10-17T07:37:57.667Z` with merchant selling prices `250g: PKR 1,200`, `500g: PKR 2,200`, `1kg: PKR 4,500`, `pricePer100g: PKR 500`; `88` legacy documents: `87` with valid positive integer PKR prices across `202` options + `1` inquiry-only `corporate-gifting`), `0` `hamperBoxes` documents (`box-wood`, `box-velvet`, `box-tin` absent), and `0` persisted documents in `catalogSettings/main`, `merchandising/settings`, `merchandising/preview`, or `storefrontContent/main`.
  2. All `8` `BID_BOX_PRODUCTS` (`bid-box-umrah-tabarruk`, `bid-box-pyramid-favor`, `bid-box-card-nikkah`, `bid-box-birth-announcement`, `bid-box-luxury-tin`, `bid-box-jute-pouch`, `bid-box-sweet-nikkah`, `bid-box-acrylic-royal`) are **absent from the Firestore `products` collection** (`exists: false`). The 4 target packaging items (`bid-box-umrah-tabarruk`, `bid-box-pyramid-favor`, `bid-box-card-nikkah`, `bid-box-birth-announcement`) have 6 compiled variant labels exceeding `40` chars (`41`–`76` chars, including 53/76-char Umrah labels exceeding the 50-char n8n wire bound), which feature branch `922f7c72` allowlists for stored records (`legacyPackagingLabels` in `src/lib/catalogSchema.ts:41-48` and `src/services/n8nOrderNotification.ts`) while `requiresStoredLegacyPackagingPricing` (`src/lib/catalogStore.ts:210`) intentionally keeps missing Firestore records `unavailable` (`active: false`) so compiled prices are never auto-seeded.
  3. Identified semantic taxonomy/copy items requiring merchant decision before any write: `/category/gift-boxes` currently matches only `deal-1` and `deal-2` (`bundle-silver-hamper`, `bundle-gold-hamper`, `bundle-platinum-hamper`, `bundle-ramadan-ready`, and `corporate-gifting` are in `bundles` with `collections: []`), `occasions` is empty (`[]`) on all 89 Firestore documents (`ramadan` and `corporate` filters match `0` products), and `ajwa-dates` / `medjool-dates` carry copied descriptions from `khajoor` / `aseel-dates`.
- **Paths & evidence:** [CATALOG_AUDIT.md](docs/CATALOG_AUDIT.md), [r04-cat1-audit.json](docs/evidence/catalog-audit/r04-cat1-audit.json), [MASTER_PLAN.md](MASTER_PLAN.md), [instructions.md](instructions.md), [HANDOFF.md](docs/admin-expansion/HANDOFF.md), and [STAGE6_PROGRESS.md](docs/admin-expansion/STAGE6_PROGRESS.md). Zero Firestore writes, seed operations, price edits, rules changes, credential rotations, or workflow executions were performed; no credentials or raw private exports were printed or committed. Proportional verification (`git diff --check` and `ALLBARKA_SKIP_LOCAL_ENV=true npm run build` 84-artifact release privacy audit) PASS.

## 30 October 2026 — M20-FILTER2 mobile filter sheet reachability, 200% enlarged-text, safe-area and focus lifecycle

- **Before:** (1) on short screens (`844×390`, `360×640`) at 200% enlarged text with zero-results status, unbounded `.catalog-filter-heading` (`131px` at `844×390`, `252px` at `360×640`) and `.catalog-filter-actions` (`177px` at `844×390`, `222px` at `360×640`) squeezed `.catalog-filter-scroll` down to `81px` (`114px` at `360×640`), and `<bdi>({savedCount})</bdi>` inside `.catalog-filter-saved-label` was double-scaled to 400% (`52px`) because its parent `<span>` also held a direct text node; (2) `CatalogFilterSheet.tsx` unconditionally called `requestAnimationFrame(() => close.current?.focus())`, stealing focus from an early user interaction inside the sheet; (3) `Tab`/`Shift+Tab` wrapped first/last focus without scrolling focused controls (or enclosing `.catalog-filter-toggles label` rows) into view inside `.catalog-filter-scroll`; (4) unmount cleanup left focus on `document.body` when opened without prior button focus (e.g., touch tap) and called `previous.focus()` even on route changes.
- **After:** `src/styles/catalog-filters.css` bounds header/footer heights (`max-height: 28dvh` / `38dvh`), converts typography to `rem` / `clamp(1.25rem, 4.5vh, 1.6875rem)`, refines `@media (max-height: 660px)` and `@media (max-height: 540px)` spacing, adds flex wrapping and `>= 44px` touch targets, and supports `--catalog-safe-area-bottom` fallback alongside `env(safe-area-inset-bottom, 0px)`; `src/components/CatalogFilterSheet.tsx` wraps `<span>{t('shop.saved')}</span>` so `<bdi>` scales once (`26px`), guards initial focus with `if (!dialog?.contains(document.activeElement))`, scrolls focused controls into view via `scrollIntoView({ block: 'nearest', inline: 'nearest' })`, and restores focus to a visible control on the same route (including after touch open or `>= 1024px` desktop resize) while releasing `#root.inert` and scroll lock without stealing focus on route changes. At `844×390` 200% enlarged text (`en`), `.catalog-filter-scroll` `clientHeight` increased from `81px` to `161px` (`193px` in `ur`/`ar`), and at `360×640` from `114px` to `245px`.
- **Paths & evidence:** `src/components/CatalogFilterSheet.tsx`, `src/styles/catalog-filters.css`, `tests/premium-browsing-browser.test.tsx`, [FILTER_HISTORY.md](docs/FILTER_HISTORY.md), [verification.json](docs/evidence/filter-history/verification.json) and before/after landscape enlarged-text screenshots. Affected tests 8/8 and full offline suite 721/721 non-skipped tests (722 total, 0 fail, 1 emulator-only skip for `tests/firestore-security.test.mjs`) across 82 files, 11 hardening, 21 backend, catalog asset audit (97 products / 115 references / 111 unique files) and 36 production checks PASS; typecheck, hooks lint and build/privacy audit (84 text artifacts) PASS. Simulated CSS safe-area checks are distinguished from physical-device verification; private catalog reconciliation (`R04`) and `SEC01` live credential/provider gates remain separate.

## 29 October 2026 — SEC01 admin and credential security hardening

- Owner authorized security corrections and rotation of credentials found at risk; no actual secret value was available or changed.
- Replaced cached admin-only authority with current Auth account checks across admin APIs and receipt admin access; bearer tokens now check revocation. Disabled/deleted/demoted identities fail closed.
- Prototype Firestore rules route private catalog/inquiry/quote operations through the backend and close unused legacy arbitrary favorites writes; valid customer contact fields and public content/reviews retain their prior behavior.
- n8n private catalog export now uses existing required header authentication and blocks missing configuration; URL secrets no longer authenticate. Bundled HTTP caller declares private Header Auth; current remote workflows remain unedited and must be checked before release.
- Fullstack privacy audit now scans hosting environment values, enforces the shared public VITE allowlist and rejects provider-shaped tokens without exposing values.
- Updated existing vulnerable dependencies and added scoped patched grpc override; npm audit changed from 23 findings to 0.
- Evidence and exact remaining integration/release gates: [SECURITY_HARDENING.md](docs/SECURITY_HARDENING.md). Affected security tests, demo rules emulator, staff browser and required local build checks pass. Full regression: 720 PASS, existing FH02 navigation-focus FAIL, 1 emulator-only SKIP (rules tested separately). Existing FH02/Stage 6 blockers are preserved. No merge, deployment or live Firebase/Meta/n8n write.


## 29 October 2026 — M20-FILTER1 same-URL history recovery and FH02 reduced-motion transition fix

Before: (1) an open mobile filter draft survived Back/Forward between identical URLs, retaining the sheet and background inert/scroll lock; (2) `@media (prefers-reduced-motion: reduce)` in `src/index.css:471` set `transition-duration: 0.01ms !important` on `*, ::before, ::after`, creating 50 `CSSTransition` animations when 200% inline font sizes were applied in `#mobile-navigation-menu` so `Shift+Tab` (`last.focus()`) ran against 1x geometry (`top: 314, bottom: 358`, `scrollTop: 824`) before `.overflow-y-auto` expanded (`scrollHeight: 1538`, `scrollTop: 1107`), leaving `Instagram` off-screen (`top: 430, bottom: 480 > 390` at `tests/interaction-polish-browser.test.tsx:169`). After: `CategoryPLP.tsx` cancels the draft on router entry-key changes (`location.key`), and `src/index.css:471` sets `transition-duration: 0s !important` under reduced motion so enlarged-text layout updates synchronously and `Shift+Tab` scrolls `.overflow-y-auto` to `scrollTop: 1229` (`top: 308, bottom: 358 <= 390`). No commerce, catalog assignment, translation, dependency or production change.

Affected browser/filter/navigation/motion tests: 23/23 PASS; full offline suite: 721/721 non-skipped PASS (722 total, 0 fail, 1 emulator-only skip) across 82 test files, plus 21 backend checks, catalog asset audit (97 products / 115 references / 111 unique files) and 36 production checks PASS; typecheck, hooks lint and build/privacy audit (84 text artifacts) PASS. [Task, geometry evidence and remaining core work](docs/FILTER_HISTORY.md).

28 October 2026 — **M20-NAV1 navigation lifecycle / DONE locally for the bounded slice**. [Scope/evidence](docs/NAVIGATION_LIFECYCLE.md). Existing menu closes on route/history and desktop breakpoint changes; brand keyboard action and early user focus are preserved, duplicate parent navigation removed. Native brand target is at least 44px; enlarged social actions wrap without clipping. Isolated affected 13/13, final all-module-context journey 1/1 and full 715/715 across 79 files, 21 backend and 36 production checks PASS. 25 navigation layouts include doubled landscape text. Saved-checkpoint details are in the linked evidence. Keys/configuration and final release remain deferred.

28 October 2026 — current **M21 live motion preference** slice: [scope/evidence](docs/MOTION_PREFERENCE.md). Existing 35 Motion preference consumers use one subscribed hook; ScrollReveal retains child state. Typecheck/hooks/build/privacy and 21 targeted tests pass; final full regression passes 715/715 across 79 files, 21 backend and 36 production checks; source persistence is recorded in the linked checkpoint. Owner deferred keys/configuration and final release. Preserve prior Stage 3-to-M18 and recovery checkpoints.

## 27 October 2026 — recover saved Stage 3-to-M18 work and refresh integration evidence

- **Before:** implementation `81eedbfe` was saved, but PR #16 still summarized gifting and the M18 remote-save checkbox remained open. Older records reported Railway access unavailable.
- **After:** recovered all runtime/source/test assets with matching Git blob hashes and reproduced the saved runtime fingerprint. The targeted Stage 3/pricing/SSR run passes 30/30. Full-suite verification passes 713/713, 21 backend and 36 production checks; source checkpoint `4ee28a08a71d2df7f0a6e3636b693f6ad76630bd` is saved and verified; final PR summary is updated at delivery, tracked in docs/RESUME_VERIFICATION.md.
- **Live evidence:** authenticated Railway metadata now identifies the existing production deployment, source revision and 32 configured application variable names (values withheld). Read-only public endpoints return 97 products. Full private semantic/catalog, Auth/Storage, accepted-order/n8n and release gates remain unresolved.
- **Paths:** master/instructions/current handoff, M18 save record, Stage 6/release/testing/catalog records, this log and sanitized recovery evidence. The full run exposed an intermittent menu-exit overlay blocking checkout. MobileMenu now disables closed-surface input/focus immediately and discards stale route animation; its existing browser regression checks the interaction boundary. Package/lock, merchant data and service configuration remain unchanged; no production merge or deploy.

Each stage records the prior behavior, resulting behavior, reason, affected paths and actual verification. Earlier renovation work remains in its existing reports.

## 25 October 2026 — V1 Signature Table hero/discovery

Previously logo, heading, search, categories and guide shared the image overlay. Existing AllBarkaHero now gives retail/gifting their own responsive editorial composition and moves tools into a compact discovery band. Existing assets are reframed; generated gift art is captioned as inspiration. Published Studio settings, category IDs, single showcase and commerce remain. Keyboard/media recovery and enlarged-text control widths are corrected. Type/hooks/build/privacy and full offline suite pass: 706 tests, 21 backend and 36 production checks. Source, asset limitations, review findings, exact tests and continuation are in docs/PREMIUM_V1.md. No new dependency, price/data/keys change, merge or deployment.

## 25 October 2026 — premium planning, review rules and catalog audit protocol

- **Before:** the current repository tracked the admin expansion but did not contain the newly supplied 24-item premium shortlist or a dedicated cross-task review/category/delivery rules file.
- **After:** MASTER_PLAN.md retains the 24 ideas and ten additional proposals with scope/status, phased sequencing, owner inputs and acceptance criteria. RULES.md requires final-diff review, semantic catalog/category reconciliation after relevant changes, honest evidence and an updated handoff before delivery. CATALOG_AUDIT.md explicitly records that the current live audit has not run and provides complete-scope reporting requirements.
- **Continuation:** AGENTS.md, instructions.md, README.md, design.md and the admin handoff/roadmap link the new process while retaining completed work and separate external blockers. New recommendations are not silently treated as approved or implemented.
- **Paths/evidence:** documentation only; exact verification, self-review and limits are recorded in docs/PREMIUM_PLANNING_CHECKPOINT.md. No runtime, dependency, price, category record, key or environment changed.
- **Next:** record owner priorities/assets, select the first premium slice and apply the rules on the existing feature branch. A rules document does not install an automated monitor, perform live Firestore corrections or certify deployment.

## 25 October 2026 — verified admin finishing with existing keys retained

- **Before:** long item forms required manual scrolling; configuration-only edits were outside the parent dirty/dismissal state; settings saves could leave competing actions usable; errors did not intentionally receive focus.
- **After:** eight gold-edged desktop shortcuts and a compact mobile selector open existing sections and focus their headings. Item and category/template edits have independent dirty guards for close/Escape/reload. Pending configuration saves block dismissal/competing item actions through catalog refresh; unsaved settings must be saved before item save/publish can close the editor. Failed edits remain visible and error summaries receive focus.
- **Preservation:** original mandatory/optional labels, fields/units/prices/photos/SEO/languages, upload/publish/cart workflow and canonical backend remain intact. Owner reconfirmed existing Firebase and other keys/configuration; no rotation or new credentials.
- **Paths:** existing AdminItemForm/AdminCatalogConfiguration, translations, admin-item.css, focused browser and precise original SEO selector; design/component inventory and linked continuation/release documents. No new component/dependency/schema.
- **Checks:** 705/705 tests across 72 files, 21 backend, 36 production, type/hooks/build/privacy/assets/diff checks pass. Original and new focused browser 2/2; 18 responsive/language/theme layouts, 200% enlarged text/control sizes, real cancelled reload, held saves/refresh, conflict input/focus and two inspected fixture JPGs. Actual failures and infrastructure correction are recorded in TESTING_RELEASE.md.
- **Remaining:** real provider/private merchant/order/n8n and preview/rollback checks under the authorized environment. No live writes, account changes, rule/workflow publication, merge or deployment. Stage 6 remains IN_PROGRESS.

## 25 October 2026 — Stage 6 connected order and receiver compatibility

- **Before:** catalog validation accepted exact historical long selections, but two Umrah labels (53/76 characters) exceeded the n8n sender/receiver's 50-character wire bound. The connected test reproduced a persisted event becoming terminal FAILED before dispatch.
- **After:** canonical projection reuses the existing per-product identity predicate; the inactive standalone receiver accepts only those two original over-bound labels. Receipt IDs/labels, merchant rates and canonical totals stay unchanged. Arbitrary long/altered/wrong-product selections remain rejected; new-commerce labels retain their separate bound.
- **Connected evidence:** actual admin-created custom mg/liquid options and six historical packaging selections traverse quote, durable transaction, outbox, transport and checked-in receiver code. Stale totals leave no checkout writes; idempotent replay and dispatch use the saved receipt after merchant repricing; wrong acknowledgement retries the same event and duplicate mirror without a second order/row.
- **Paths:** catalogSchema identity predicate, n8nOrderNotification, inactive allbarka-website-integration validator, stage6-order-handoff.test.ts and linked integration/release/continuation docs. Only the validator code changes in the 17-node JSON; credentials/resource placeholders and inactive state remain intact.
- **Checks:** 4 new / 58 targeted cases pass; full 704/704 tests across 71 files, 21 backend, 36 production, type/hooks/build/privacy/assets/diff checks pass. An initial fixture shipping expectation was corrected to the existing per-unit whole-gram policy; runtime shipping was unchanged.
- **Release dependency:** verify compatible receiver before enabling this sender path under separate authorization. Do not automatically requeue historical terminal/disabled events. Memory/loopback rehearsal does not certify real Firebase/n8n/Sheets. No application key/environment file, live workflow/order/account/rule, production merge or deployment changed. Stage 6 external gates remain BLOCKED.

## 24 October 2026 — Stage 6 legacy compatibility and bounded diagnostics

- **Before:** four saved packaging products could fail canonical validation because historical filled-option labels exceed 40 characters. A metadata-only edit to an already-public legacy product without explicit status could apply the new-product draft default.
- **After:** only exact existing long labels on original packaging IDs are accepted; canonical selection IDs, merchant rates and order/export agreement are preserved. Known active legacy publication state survives admin reads/metadata saves. Explicit drafts/archives, configured/new product defaults and strict new-commerce labels remain intact.
- **Missing data:** the four affected missing records still resolve unavailable; the corrected parser never newly activates compiled fallback prices. No records are created or migrated by reads, and existing order/receipt selections are not renamed.
- **Diagnostics:** a bounded credential-free three-GET script records allowlisted health/readiness/catalog flags. Actual old deployed build reports database connectivity, not durable order verification; it differs from the feature parent and all four public items remain unavailable. No private saved-record cause or feature deployment is claimed.
- **Paths:** catalogSchema/catalogStore, impact/preflight scripts, two Stage 6 test files, sanitized evidence and continuation/release documents.
- **Verification:** final 700/700 tests across 70 files; 21 backend, 36 production; type/hooks/build/privacy/assets/diff checks. Six focused cases cover merchant-edited rates, exact labels/IDs, canonical order/export, lifecycle privacy, missing records and diagnostic output/origin/response guards. Earlier failure and correction are recorded in TESTING_RELEASE.md. Impact: 97/97 saved fixture price lists unchanged, 93 empty-store products unavailable, zero writes/conversions.
- **Remaining:** private merchant export/review, feature Auth/Storage/rules, accepted-order/n8n execution, deployment smoke and rollback rehearsal. No key/environment change, live write, merge or deployment.

## 24 October 2026 — verified boutique interaction refinement

- **Before:** add actions used different button feedback and the PDP acknowledged the click through an unconditional timer. Gallery arrows/swipe existed without an intentional second-photo hover preview. Full header content could exceed 360px and desktop row width.
- **After:** ProductCard, CategoryPLP and PDP share CartAddButton, acknowledging only an actual matching committed cart increase. No-op/capped additions cannot claim success. The existing immediate cart-open behavior remains; the PDP's redundant delayed reopening is removed. MagneticButton now forwards anchor/div clicks, native button disabled state and caller styles in reduced-motion/coarse-pointer mode.
- **Photos and motion:** resolved real second-photo preview for fine-pointer mouse hover; manual/keyboard/touch selection wins and image failure leaves a usable cover. Native gallery/link/quick-view behavior remains. Finite press/selected/underline/reveal feedback uses existing components, with reduced-motion alternatives. Toasts are RTL-aware, capped at three and clean up timers; checkout busy semantics/spinner follow its actual pending state.
- **Responsive fixes:** mobile logo/control sizing fits the real 360px header while retaining four 44px utility targets. Desktop navigation moves to a centered second row from 1280px so the brand/menu/utilities fit. Existing menu routes/actions and the single homepage showcase remain.
- **Paths:** CartAddButton, ProductCard, CategoryPLP, ProductDetailPage, ProductImageGallery, MagneticButton, ScrollReveal, ToastManager, BubbleMenu/MobileMenu, RootLayout, checkout presentation, interaction-polish.css and main import; component inventory and continuation documents.
- **Verification:** 694/694 tests across 68 files, 21 backend, 36 production, assets, typecheck/hooks/build/privacy audit and diff check. New real-layout browser covers 48 PDP/cart layouts, actual committed cart behavior, photo/error/keyboard/touch, menus, reduced motion and held/failed quote. Focused existing media/render tests: 19/19. Screenshot scope and exact results: TESTING_RELEASE.md.
- **Boundary:** documentation was saved first for model/chat continuation. No package/lock or original photo change; no canonical price/shipping/MOQ, admin/staff/content backend or live integration mutation. Original Stage 6 external checks and four packaging findings remain pending.

## 24 October 2026 — interaction refinement continuation contract

- **Before:** expansion documentation covered Stages 1–6; the newly supplied interaction references and approved design judgment were only in chat.
- **After:** instructions.md now consolidates the original feature inventory, required reading/resume sequence, verified remote parent, preservation rules, checkpoint discipline and current task. INTERACTION_POLISH.md adds passes P0–P3, acceptance items I01–I14, source entry points and all carried-forward external blockers. Design, roadmap and handoff link to the new scope.
- **Evidence:** documentation and link/status review; git diff check. No new interaction implementation or runtime verification is claimed by this documentation checkpoint.
- **Next:** P1 shared feedback/control work, then P2 photo/navigation refinement, then P3 complete verification. Previous Stage 6 live integration/merchant-data findings remain pending.

## 24 October 2026 — Stage 5: published content controls and premium refinement

- **Before:** hero copy, primary navigation, FAQ and journal entries were compiled; the admin could not privately preview and publish approved content as one revisioned record.
- **After:** Storefront studio edits separate EN/UR/AR content, hero/image/CTA URLs, announcement, approved section order/visibility, existing primary menu labels/destinations, FAQs and plain-text journal additions/overrides. Draft save and private preview are separate from explicit publication; actual customer components, initial journal metadata and sitemap consume published settings.
- **Safety:** server allowlists/size bounds, safe internal links/media, hidden-body exclusion, stable article slugs, expected revisions and atomic before/after audits. Stale errors preserve edits. Private preview follows subsequent edits; unsaved changes trigger browser unload, link and workspace-tab discard protection. Studio images accept URLs; product file upload remains in the item editor. Preview covers hero/banner/FAQ only.
- **Design:** restrained emerald/ivory/gold light, existing real hero photography, responsive editorial FAQ and Studio controls. One homepage product showcase remains. No package/lock, price/shipping rules or live settings changed.
- **Paths:** storefrontContent/router and contentPresentation utilities; provider/translations; AdminContentPanel, StorefrontBanner, FAQSection; hero/home/menu/journal/SEO/server integrations; premium-content.css; source/API/browser tests and stage evidence.
- **Verification:** typecheck/hooks/build/privacy audit; 693 tests across 67 files, 21 backend checks, 36 production checks and assets. Browser verifies edit/save/private preview/publish/reload, both menus, journal/initial metadata, conflict preservation, 12 viewport/language/theme combinations and reduced motion.
- **Harness correction:** existing carousel tests now install their controlled clock before page navigation, keeping original assertions. Screenshots default to temporary test output; opt-in `ALLBARKA_CAPTURE_EVIDENCE=true` refreshes repository evidence so routine checks do not dirty past checkpoints.
- **Stage 6 offline packet:** read-only impact script preserves 97 stored fixture records and compares 93 valid seed price lists with zero writes. Four compiled packaging seeds fail existing variant validation and are explicitly flagged for live merchant-data review. No rates/labels were guessed or changed. See RELEASE_PACKET.md for live gates and rollback.
- **Remaining:** Stage 6 deployed Firebase/Storage/Auth/n8n and actual merchant-data checks; optional external CodeRabbit review unavailable. No deployment, production merge, keys, rules publication or live writes.

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


## 26 October 2026 — visual/motion revision, unfinished recovery checkpoint

Reconstructed the owner-requested emerald/arched hero and collection presentation, moved assurances after configurable sections, corrected position-dependent collection badges and date imagery fallback. Added finite photography/arrow motion inspired by referenced premium ecommerce work. Current verification pending; see docs/PREMIUM_V1_REVISION.md. No production release or live data change.


## 27 October 2026 — verified emerald hero and restrained motion revision

- **Before → after:** pale split hero becomes an emerald opening with ivory/gold editorial type, arched existing tabletop imagery, supporting gift inset and existing crest. Collection frames repeat the arch; discovery stays separate. Configurable sections now precede secondary assurances while retaining one product showcase.
- **Motion:** finite photo/gift settle, fine-pointer photo zoom and directional keyboard/hover arrow feedback; immediate actions, static reduced-motion behavior, unchanged custom Studio artwork contract.
- **Correctness:** default collection badges follow destination IDs after merchant reorder; explicit merchant badges remain. Existing generated date illustration is presentation fallback only, with no catalog reclassification.
- **Verification:** final self-review, typecheck/hooks/build/privacy audit, affected browser journeys and full runner passed: 707 tests, 21 backend, 36 production checks. Three existing test suites extended; stale CSS/theme paint and native gallery scroll timing corrected in fixtures without removing acceptance assertions. Six current screenshots and matrix saved under docs/evidence/premium-v1-revision.
- **Continuity:** MASTER_PLAN, instructions and handoff updated; full evidence and pending scope in docs/PREMIUM_V1_REVISION.md. This completes the bounded local revision, not all premium proposals. No deployment, live Firestore/provider mutation, key/config/dependency or pricing change.


## 27 October 2026 — six-phase continuation plan

Owner accepted the revised opening and requested a phased sequence. MASTER_PLAN now maps six delivery phases to the existing V1–V6/M IDs, separates completed V0 planning from delivery phases, records acceptance of the current look, and selects V2-A product cards/collection continuity as the next bounded slice. Each phase includes admin integration where needed, testing, self-review and a saved checkpoint. Optional signature tools can be deferred; factual assets and live Stage 6 gates remain named dependencies. Instructions/handoff link the immediate scope and acceptance. Documentation only; no new runtime feature or live verification claimed.


## 27 October 2026 — V2 product cards and browsing

Homepage/shop cards now share restrained framing, full-photo contain treatment, stronger name/quantity/price hierarchy and clearer controls matching the accepted hero. Existing category masthead/discovery controls follow the same styling. Category Back restores current-tab scroll and loaded depth; fresh navigation and same-path filters retain appropriate behavior. Removed/disabled variants resolve consistently and an empty purchasable option set cannot be added. Existing admin media/ordering, gallery, cart and canonical price authority retained; no new component/dependency or live mutation. Exact final gates, scope and limitations: docs/PREMIUM_V2.md.


## 27 October 2026 — V3 product-detail art direction

Existing PDP now has contained photography, a distinct editorial purchase surface, proper RTL direction/type, a live selection summary and selected portion state. Packaging opens relevant details first, with food-only taste/guarantee content omitted. Generic sourcing/personalization claims replaced by neutral headings/reference wording. Missing-product recovery and packaging headings/actions translated, dark fallback improved, related cards resolve an enabled positive price or inquiry. Existing canonical pricing/MOQ/custom quantity/gallery/media/cart contracts retained. No new component/dependency/product image or live mutation. Current gates and pending broader V3 work: docs/PREMIUM_V3.md.

V3 final local verification: typecheck/hooks/build/privacy passed; 709 tests across 75 files, 21 backend and 36 production checks, zero missing/retired assets. Seven fixture screenshots and layout matrix saved; M15 DONE locally, M19 and original Stage 6/live catalog blockers retained.


## 27 October 2026 — story and journal editorial pass

Added distinct standalone story opening/reading/retail-gifting/journal routes using existing copy and assets. Journal overview/article now have editorial typography, functional category/search discovery, native contents links and shared related ProductCards. Fixed featured article omission under category filters, premature quick-add acknowledgement and unawaited clipboard success. Scoped grid sizing fixes mobile related-card overflow; localized recovery/labels and themed surfaces. Existing content publication, commerce and InfoPage modal/other routes retained. No new component/dependency, claims/people photos, live write or deploy. Final verification/status: docs/PREMIUM_EDITORIAL.md.

Final M19 gates: 710 tests across 76 files, 21 backend, 36 production, type/hooks/build/privacy and 72 layouts plus enlarged-text checks PASS after wrapping fixes. Eight before/after screenshots and two matrices retained. Bounded layout scope DONE locally; missing authentic photography/factual validation/editor extensions remain separate.


## 27 October 2026 — V4 gifting continuation

Before: gifting used duplicate product cards and a long opening; builder lacked persistent contents/cost breakdown and a live message preview. After: emerald gifting entrance with compact mobile product/title, shared current-option cards, occasion/starting-pack budget discovery, existing-box/contents/current-catalog summary and recipient/message preview. Current provider snapshots are passed explicitly to the shared resolver (the global registry already refreshes). Invalid/ineligible hamper selections and missing packaging fail closed; unavailable preselections can be removed. Escape restores the original launcher after language/theme changes. Existing200g formula, prices, gift membership, saved configuration, shipping and schema remain. No new component/dependency/raster, backend price policy or live write. Final type/hooks/build/privacy and affected19/19 PASS; full712/712 tests across77 files,21 backend,36 production and asset checks PASS. Shared price/Quick View row now wraps under doubled text; all six landing language/theme enlargement checks pass. Source/evidence saved at57e2a0dc707268640e41d9032c4b68eb7a683206. Details/findings/admin limits/full V4 dependencies in docs/PREMIUM_GIFTING.md. Next independent slice: broader M18 cart/checkout visual continuity.


## 27 October 2026 — M18 cart and checkout continuity

Before: cart/drawer used truncated names and several English-only labels; saved hamper personalization was hidden; checkout normal item summaries could show older cart line prices beside current quote totals. After: editorial cart, contained imagery,44px controls, revised drawer scrolling/focus, responsive checkout overview and shared read-only gift details. Current checked quote items feed both normal checkout summaries through the existing guarded receipt adapter; calculation/order/retry contracts stay with existing services. Missing-image fallback and reference-art labels are explicit. Existing CartTools, payment preference, quantity caps/MOQ, saved cart/input, shipping/coupons and receipt recovery are preserved. No dependency/schema/live write. Final type/hooks/build/privacy,53 affected and713 full tests across78 files,21 backend,36 production and asset checks PASS. SSR matchMedia/root markup compatibility fixed with existing assertions retained. See docs/PREMIUM_PURCHASE.md; original Stage6 blockers remain.
