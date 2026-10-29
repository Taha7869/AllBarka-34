# AllBarka expansion change log

## 29 October 2026 — M20-FILTER1 same-URL history recovery

Before: an open mobile filter draft survived Back/Forward between identical URLs, retaining the sheet and background inert/scroll lock. After: CategoryPLP cancels the draft on router entry-key changes, reusing the existing sheet cleanup. Existing browser journey now asserts Back/Forward, discarded budget, released inert/scroll lock and fresh committed defaults. No commerce, catalog assignment, translation, dependency or production change.

Affected browser/filter tests: 7/7 PASS; full regression 714/715 FAIL at the existing enlarged-navigation focused-link viewport assertion (FH02). An isolated test-wait experiment did not resolve complete-context failure and was reverted. This is an explicitly unfinished source checkpoint, with no release or passing-full-suite claim. [Task, evidence and remaining core work](docs/FILTER_HISTORY.md).

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
