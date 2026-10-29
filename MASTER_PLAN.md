# AllBarka — visual identity and experience master plan

29 October 2026 — **M20-FILTER1 / IN_PROGRESS; affected 7/7 PASS**. Resumed PR #16 from `a594920`. Reproduced and corrected same-URL Back history leaving the mobile filter draft open and page locked; existing CategoryPLP effect now observes the router entry key. Complete regression 714/715 FAIL at the existing enlarged-navigation focus assertion (FH02); task remains unfinished. Filter-history checks pass in the complete run. Latest remote save/read-back result belongs in PR #16. [Current task and five remaining core work blocks](docs/FILTER_HISTORY.md). Prior completed stages, optional proposals and deferred provider/release gates are preserved.

28 October 2026 — **M20-NAV1 / DONE locally for the bounded slice**: bounded mobile navigation lifecycle and overlay keyboard/short-height pass. Verified: route/Back/Forward and desktop breakpoint close the menu and release scroll lock; native keyboard brand navigation and single-entry history work; menu/cart focus handoff and 25 layouts (24 matrix plus doubled landscape text) pass. Enlarged social links wrap without clipping. Final full 715/715 across 79 files, 21 backend and 36 production checks PASS. See [evidence](docs/NAVIGATION_LIFECYCLE.md). Reuse existing components. Provider/key/release work remains deferred.

28 October 2026 — **M21 live motion preference / DONE locally**. Continue approved cross-page motion work while the owner defers keys/config and final release. Scope: subscribed device preference for existing consumers, retained state during preference changes and mounted browser/SSR verification. Final 715 tests / 21 backend / 36 production checks pass; see [current evidence](docs/MOTION_PREFERENCE.md). Provider/factual/photography dependencies remain open.

27 October 2026 — **V6-R01 recovery / correction DONE; source saved and verified in PR #16**. Recovered baseline `81eedbfe0b09cdd29ba599f4733968a05a60fdbe` already contains completed Stage 3-to-M18 work. The current checkpoint adds the bounded mobile-menu close correction; inspect PR #16 head before continuation. [Current recovery evidence](docs/RESUME_VERIFICATION.md) records 30 fresh targeted passes, the matching build fingerprint and the final passing full suite (713 tests / 21 backend / 36 production checks). Railway metadata is now accessible, and a fresh public catalog snapshot contains 97 products; private semantic/provider checks remain blocked. Earlier dated checkpoints below retain their historical scope.

27 October 2026 — latest work: [M18 cart/checkout continuity](docs/PREMIUM_PURCHASE.md), SELECTED / DONE locally for the bounded purchase pass. Cart/drawer/checkout presentation, shared saved-gift details and current server-quote line prices are verified:53 affected tests and713 full tests across78 files,21 backend and36 production checks PASS. Preserve completed gifting/V1/V2/M15/M19. Next: V6 live integration readiness with authorized Railway/environment access and current merchant catalog snapshot. Current live audit and original Stage6 provider/release gates remain BLOCKED; no deploy or key change.

27 October 2026 — latest continuation: [V4 gifting](docs/PREMIUM_GIFTING.md). Bounded landing, contents/current-catalog builder and existing-message preview are DONE locally for the bounded scope: affected19/19 and final712/712 tests across77 files,21 backend and36 production checks pass. Source/evidence checkpoint: `57e2a0dc707268640e41d9032c4b68eb7a683206`; final documentation records the completed gates. Full V4 remains IN_PROGRESS: merchant printing/accurate assets and broader M18 cart/checkout presentation remain open. Existing Stage6 live blockers and live catalog audit remain BLOCKED. Next independent slice: M18 cart/checkout visual continuity.

27 October 2026: owner-requested emerald/arched hero and motion revision is locally verified. M01/M02 are DONE for this bounded pass; M04–M06/M21 have completed portions and pending broader work. Final offline suite: 707 tests, 21 backend and 36 production checks passed. Read [current revision](docs/PREMIUM_V1_REVISION.md). Earlier completed work and live Stage 6 blockers remain.

Updated: 28 October 2026 (Asia/Karachi).

**Current checkpoint: M20-NAV1 navigation lifecycle DONE locally for the bounded pass.** Read [NAVIGATION_LIFECYCLE.md](docs/NAVIGATION_LIFECYCLE.md) for final evidence and the verified source checkpoint. M18 purchase and M21 preference work remain complete for their recorded scopes. V1/V2/M15/M19 and gifting are preserved. Remaining live provider/catalog, photography, merchant printing/facts and optional proposal scopes retain their statuses; apply [RULES.md](RULES.md).

Roman Urdu: **Yahan pending, chal raha kaam, rukawat aur verified done ka hisaab rahega. Sirf idea likhne ya UI banne se feature DONE nahi hota. Naya agent current branch aur yeh files parh kar agla kaam shuru kare.**

## Start here

- Read [AGENTS.md](AGENTS.md), [RULES.md](RULES.md), [instructions.md](instructions.md), [design.md](design.md), this file and the [current admin handoff](docs/admin-expansion/HANDOFF.md).
- Continue the existing review branch `codex/admin-catalog-foundation-20261023` and [draft PR #16](https://github.com/Taha7869/AllBarka-34/pull/16). Inspect its current head before editing/saving; do not use an older ZIP as the implementation baseline.
- Inspected implementation parent: `2df0571e52c2281f39f70ed660abef8b62e50784`; source tree `f2af11803c3383bfb743db48c1e2ed3787846e63`. At inspection, both `main` and `launch` were `5e6349051980abd1a20f719f289a24a3fd2cba7b`. These are historical pins, not permanent current-head claims.
- This is the single feature register for the premium proposal. [Admin roadmap](docs/admin-expansion/ROADMAP.md) and [Stage 6 progress](docs/admin-expansion/STAGE6_PROGRESS.md) retain authority for prior work and external release gates.
- Source presence, local tests, browser fixtures and live verification are different evidence. Current documentation validation is in [PREMIUM_PLANNING_CHECKPOINT.md](docs/PREMIUM_PLANNING_CHECKPOINT.md).

Verified visual/motion source and evidence: `822deeafd723f6292d39232ea537263b7897f49b` (tree `99d25b7286354866b0bc82b957a86cf9b86d026f`), saved and read back on PR #16. The documentation successor records that save; inspect the current remote head before continuing. Full local gates pass; no live release.

Saved V2 implementation/evidence: `4441a671a97682b98be64c94744a5fee25e3158d`, verified remote tree/ref; follow-up documentation records the save. Current continuation: V2 core cards/shop browsing is locally verified (708 tests / 21 backend / 36 production), with scope and remaining proposals in [PREMIUM_V2.md](docs/PREMIUM_V2.md). M15 PDP slice is now locally complete in PREMIUM_V3.md; broader V3 story/journal/facts remain pending.

Saved V3 source/evidence: `3c6949a5e69ee5eadd28334ae1c35e2c113413df` (remote tree/ref verified). Latest implementation: **V3 product-detail slice (M15) DONE locally** — contained gallery, food/packaging purchase presentation, selection summary and localized recovery. 709 tests / 21 backend / 36 production passed; [PREMIUM_V3.md](docs/PREMIUM_V3.md) records limits. Full V3 and live release are not complete.

Saved M19 source/evidence: `1bf00c937ffe0718e0eb2f429670d83d7bd94553` (remote tree/ref verified). Latest continuation: **M19 story/journal presentation DONE locally**, with 710 tests / 21 backend / 36 production checks and 72 route/size/language/theme layouts plus enlarged-text checks. See [PREMIUM_EDITORIAL.md](docs/PREMIUM_EDITORIAL.md). M15 remains complete; original photography/facts and Stage 6 live gates are open. Next independent design work: V4 gifting.

## Current status

| Workstream | State | Evidence / next action |
| --- | --- | --- |
| Previous admin expansion Stages 1–5 | DONE under recorded local gates | Preserve the existing implementation; see the admin handoff. |
| Previous interaction refinement P0–P3 and admin finishing F01–F06 | DONE under recorded local gates | Preserve cart acknowledgement, explicit gallery controls, responsive header and unsaved-edit protections. |
| Previous expansion Stage 6 | IN_PROGRESS; external gates BLOCKED | See its tracker. Planning does not close Firebase/Auth/Storage/n8n/order/deployment checks. |
| Current planning, rules and continuation links | DONE for documentation; inspect the commit containing this file for the saved checkpoint | Two root guides, catalog audit protocol and handoff links; see checkpoint evidence. |
| New premium implementation | SELECTED / IN_PROGRESS — V1/V2/M15/M19 locally complete; bounded V4 landing/builder/message DONE locally; broader V4 pending | Current gifting evidence/limits in PREMIUM_GIFTING.md. M18 purchase pass now locally verified; printing, broader typography, photography and live gates pending. |
| Current live catalog/category reconciliation | BLOCKED / NOT_RUN | This session did not read live Firestore. See catalog audit record. |

## Scope and completion protocol

Scope labels: `PROPOSED` / `SELECTED` / `DEFERRED` / `REJECTED`. Work labels: `TODO` / `IN_PROGRESS` / `BLOCKED` / `DONE`. Use R02 in `RULES.md` and preserve stable IDs. Specific rows below carry current scope/work; remaining ideas are **PROPOSED / TODO**. Prior approval for the completed admin work remains intact.

Update the scope/work cell on the specific feature row at every transition. For each selected task, record owner/agent, acceptance, dependencies, changed paths, review findings, verification evidence, commit/PR, live status and next action in a linked task record. If a row becomes too large, put detail in a linked task record and keep this row current. Do not replace unresolved work with a percentage-complete claim.

## Creative recommendation — The AllBarka Table

**Recommended direction: A, The Signature Table.** Warm Lahore hospitality, daily pantry and thoughtful gifting. B (Gift Atelier) can guide the gifting page; C (Ingredient Story) can guide product/editorial pages. Use A as the working V1 composition based on confirmed balance; no explicit A/B/C ballot is claimed.

The story moves from **your pantry -> your mehmaan's table -> a gift for someone special**. Keep emerald/ivory, tactile natural materials, restrained gold, clear product detail and believable light. Reuse the existing logo, Playfair Display, Inter, Amiri and palette first. A working copy direction is “For your table. For your people.” Final brand copy needs owner review for tone and factual accuracy.

### Hero composition

| Surface | Proposed treatment | Acceptance |
| --- | --- | --- |
| Desktop/laptop | Asymmetric tabletop composition; a clean text area, a useful product grouping and one supporting gift cue. | One H1, short copy, primary shopping action and secondary gift route; clear at 1024/1280/1440px. |
| Mobile | Dedicated portrait composition/crop; product, brand and primary action appear early. | 360/390px, short height, enlarged text and RTL work without clipping to force one-screen height. |
| Discovery | Search/guide move into a quieter compact discovery area; collections remain understandable. | Existing search suggestions, keyboard behavior, guide, routes and category navigation still work. |
| Motion | One short entrance and subtle image/light response where useful. | Still composition, reduced motion, touch and keyboard remain complete; no required scroll sequence. |
| Slow/failure state | Fixed media geometry, readable text/CTA before image/font arrival, intentional fallback. | No large layout jump or unreadable contrast on image/font failure. |
| Merchant control | Existing Studio still supplies published text, URLs and actions; extend crop fields additively. | Draft privacy, validation, fallback and revision checks remain intact. |

### Photography plan

Audit existing provenance before choosing final art. The current default hero paths are under `public/images/generated/`; a filename in the repository is not proof of a real merchant shoot.

Priority shot list: wide/portrait table, product macro, actual pack front, open/closed gift box, exact included contents, size reference, card/printing detail and genuine packing/people/process. Record product ID, provenance/license, use, dimensions/crops, alt text and owner approval. Preserve real packaging and quantity. Existing suitable photos can support layout work while missing authentic photos remain a named dependency. Concept/generated atmosphere must not be passed off as proof of what a customer receives.

## Original shortlist — retained numbering

Selected rows below refer only to the bounded V1 **new upgrade**. Reuse notes describe existing foundations, not new completion.

| ID | Proposed deliverable / acceptance | Reuse or dependency | Phase | Scope / work |
| --- | --- | --- | --- | --- |
| M01 | Signature hero with distinct desktop/mobile composition, useful CTA and resilient media. | `AllBarkaHero.tsx`, current RootLayout and Studio; M03/M04. | V1 | SELECTED / DONE (locally verified visual/motion revision; owner accepted current look on 27 Oct 2026) |
| M02 | Record A/B/C decision and a single visual storyboard. | Recommend A; owner's commercial priority informs balance. | V0 | SELECTED / DONE (locally verified visual/motion revision; owner accepted current look on 27 Oct 2026) |
| M03 | Consistent product/packaging/scale photography, provenance inventory and responsive exports. | Existing media provider; authentic merchant assets. | V1/V3 | SELECTED / IN_PROGRESS — inventory/reuse DONE; original photography pending |
| M04 | Typography, readable prices, spacing and Urdu/Arabic line-height pass. | Existing tokens/fonts and LanguageContext. | V1–V5 | SELECTED / IN_PROGRESS — hero/discovery/PDP DONE for recorded scope; other pages pending |
| M05 | Compact homepage: hero, collections, one showcase, gifting, truthful brand story and useful feedback/info. | `HomePage.tsx`, published section order/visibility. | V2 | SELECTED / IN_PROGRESS — bounded rhythm portion DONE; full content work pending |
| M06 | Editorial pantry/hosting/occasion entrances that expose real catalog breadth. | Current category/collection routes; no silent ID renaming. | V2 | SELECTED / IN_PROGRESS — framing/date fallback portion DONE; full editorial entrances pending |
| M07 | Photo framing, clear selected-quantity price, readable titles and touch actions on product cards. | `ProductCard.tsx`, CartAddButton, carousel/media provider. | V2 | SELECTED / DONE — V2 card presentation and current-option fallback, locally verified |
| M08 | Gift Atelier: accurate photo arrangement, contents/quantity summary and canonical total. | Existing `CustomHamperBuilderModal.tsx`, hamper validation and real box photos. | V4 | SELECTED / IN_PROGRESS — contents/current-catalog summary DONE locally; accurate physical arrangement/assets pending |
| M09 | EN/UR/AR personalized card preview with merchant-supported fonts/styles and persisted message/style. | Existing personalization; verify cart, reload, order and packing handoff end to end. | V4 | SELECTED / IN_PROGRESS — existing-message preview/cart/reload DONE locally; merchant styles/printing/order handoff pending |
| M10 | Find Your Taste from real taste/texture/occasion attributes and current prices/availability. | Existing SelectionGuide; explain no-match and missing attributes. | V3 | PROPOSED / TODO |
| M11 | Verified product passport: origin, variety, roast, ingredients, allergens and storage. | Existing typed attributes/content/public projection; owner facts required. | V3 | PROPOSED / TODO |
| M12 | Mehmaan Table planner with guest count, editable quantities and visible serving assumptions. | Merchant serving guidance, current units/MOQ/cart services. | V5 | PROPOSED / TODO |
| M13 | Occasion/date planner showing city, requested date, quantity and current preparation constraints. | Existing shipping/preparation rules; requests are not guaranteed arrival dates. | V5 | PROPOSED / TODO |
| M14 | Optional private gift reveal with hidden prices and a greeting QR/link. | Separate private server contract; unguessable token, expiry/revoke, no indexing/private preview leakage. No automatic recipient message. | V5 | PROPOSED / TODO |
| M15 | Product-detail art direction: useful gallery and clear purchase/inquiry panel, distinct food/packaging needs. | Existing PDP, gallery/viewer, custom quantity and sticky controls. | V3 | SELECTED / DONE locally — bounded PDP pass; see docs/PREMIUM_V3.md |
| M16 | Dedicated gifting composition with occasion/budget/recipient discovery and exact included contents. | Existing `/gifting` route and `GiftsHampersDestination.tsx`; preserve current routing/filter contracts. | V4 | SELECTED / IN_PROGRESS — bounded landing/occasion/starting-pack budget scope DONE locally; richer recipient discovery/actual contents assets pending |
| M17 | Shop/category intros, relevant filters, selected states and reliable back/scroll restoration. | ShopPage/CategoryPLP, filter sheet and URL state. | V2 | SELECTED / DONE locally for existing core browse/filter UI and current-tab Back recovery; live catalog validation BLOCKED |
| M18 | Cart/checkout continuity for actual photo, variant, quantity, message and authoritative cost breakdown. | Current persisted receipt, quote recovery and idempotency. | V4 | SELECTED / DONE locally — cart/drawer/checkout presentation and saved/current-quote continuity DONE locally; live provider gates remain Stage6 |
| M19 | Story/journal layouts with actual people/process/serving content and meaningful related products. | InfoPage/JournalPage and existing Studio articles. | V3 | SELECTED / DONE locally for existing-content layout/functional fixes; authentic people/process assets and factual validation remain open |
| M20 | Route-appropriate mobile search/filter/buy controls, safe areas and no competing fixed bars. | Existing header/menu/cart/sticky controls; keyboard/overlay tests. | V2/V6 | SELECTED / IN_PROGRESS — bounded navigation lifecycle DONE locally; [M20-FILTER1 same-URL filter history](docs/FILTER_HISTORY.md) affected filter checks PASS; complete regression 714/715 FAIL at existing navigation FH02; unfinished checkpoint; broader mobile controls remain separate |
| M21 | One restrained motion language with touch/keyboard/reduced-motion equivalents. | Completed interaction foundations; refine, do not recreate. | V1–V6 | SELECTED / IN_PROGRESS — bounded hero motion DONE; device-preference synchronization DONE locally (35 consumers, 715 tests); remaining motion audit is separately pending |
| M22 | Branded loading, empty, unavailable, failure and 404 states with useful next actions. | Existing state/toast/error components; real request lifecycle. | V2–V6 | PROPOSED / TODO |
| M23 | Extend admin control for selected upgrades: crop/focal points, facts, styles, supported editorial content. | Existing Studio/item forms, revisions, validation and admin guards. | V1–V5 | PROPOSED / TODO |
| M24 | Baseline image/JS performance and useful consent-appropriate purchase-funnel measurement. | Inspect existing instrumentation; local/lab and live field evidence stay separate. | V1/V6 | PROPOSED / TODO |

M08-3D remains an optional **feasibility item**, not a prerequisite. Evaluate real model assets, weight/performance, accessibility, licensing and maintenance before deciding on true 3D. A CSS tilt is not a 3D product model.

## Additional recommendations

| ID | Addition | Customer/merchant value and completion gate | Priority | Scope / work |
| --- | --- | --- | --- | --- |
| M25 | Signature brand detail system | One subtle table/serving motif, border/radius/image treatment and consistent existing logo use across pages, favicon/social preview and order surfaces. Keep text and real product imagery dominant. | Early | PROPOSED / TODO |
| M26 | “What arrives” and size views | Closed/open box, exact contents, empty-vs-filled choice, pack size and a real scale reference; image/content follows selected option. Props/inclusions must be unambiguous. | Early | PROPOSED / TODO |
| M27 | Useful variety comparison | Extend existing comparison with merchant-verified taste, texture, use and pack/unit price; compare like units and explain missing fields. No fabricated ranking or health claim. | After facts | PROPOSED / TODO |
| M28 | Shop the table | Optional photo hotspots or an accessible caption list linking actual scene products to current catalog IDs; show unavailable items honestly and keep keyboard/touch equivalents. | Later | PROPOSED / TODO |
| M29 | Reorder with a fresh quote | Extend existing history/reorder behavior: review changed prices, stock, quantity and discontinued options before confirming. Never reuse an old receipt total as a current price. | Later | PROPOSED / TODO |
| M30 | Corporate/event inquiry kit | Extend existing inquiry with quantity, requested date, city, packaging/card choice and reviewed selection summary. A quotation request is not an accepted order or delivery promise. | Gifting phase | PROPOSED / TODO |
| M31 | Local-language product finding | Curated English/Urdu/Roman Urdu aliases for actual products and varieties, useful no-results suggestions and privacy-conscious measurement. Reuse current search/selection logic. | Discovery phase | PROPOSED / TODO |
| M32 | Full Studio preview and restore | Preview selected upgrades at actual mobile/desktop layouts with draft/live distinction; restore a supported revision into a new validated draft, then explicit publish. Existing preview is narrower. | Admin companion | PROPOSED / TODO |
| M33 | Verified claims and content readiness | Record evidence for origin, packing, freshness/process, certifications and reviews; publish only supported statements. Mark missing facts internally and avoid fake urgency/stock claims. | Early | PROPOSED / TODO |
| M34 | Catalog health report | Implement a read-only report for orphan taxonomy, broken/mismatched media, missing required facts and publish/discovery problems; actionable item IDs and completeness counts. Follow R04; a written protocol is not the automated report. | Foundation | PROPOSED / TODO |

## Six delivery phases — 27 October 2026

Owner accepted the current look ("Okay ha yaar") and asked how to divide the remaining work. Use **six delivery phases**, preserving V1–V6 IDs. V0 planning is already complete and is not a seventh implementation phase. These are distinct from previous admin Stages 1–6 and interaction P0–P3. Organizing a proposal into a phase does not silently select every optional feature.

| Phase | Customer-visible outcome | Scope / dependencies | Current state |
| --- | --- | --- | --- |
| **V1 — Brand opening** | Emerald Signature Table hero, balanced retail/gifting actions, separate discovery and restrained motion. | Completed M01/M02 and hero portions of M03/M04/M21. Remaining photography, site-wide typography and editor controls accompany the relevant later surfaces. | **DONE for bounded opening; owner accepted current look.** Local verification saved; not deployed. |
| **V2 — Browsing and product cards** | Matching collection entrances, readable product cards, better shop/category layout, filters and mobile browsing. | M05–M07/M17; relevant M20/M22, plus M04/M21/M23 as needed. R04 category audit accompanies discovery changes. M31 aliases/M34 automated report remain optional follow-ups. | **DONE locally for core cards/shop browsing, including in-session Back recovery.** See PREMIUM_V2.md; richer editorial/alias/monitoring proposals retain their own status. |
| **V3 — Product detail and brand story** | Distinct food/packaging product pages, useful photography, clear selected quantity/price/purchase panel, editorial story/journal. | M15/M19; M11/M26 only from verified facts and real contents/scale assets. Richer M10/M27 need catalog attributes. Typography/motion/admin support ship with each changed surface. | M15 and bounded M19 layouts DONE locally; factual/photo-dependent work remains pending. |
| **V4 — Gifting and purchase** | Dedicated gifting page, improved hamper configuration, personalization where supported, coherent cart/checkout. | M16/M08/M09/M18/M30. Accurate box/filling photos and merchant printing options before claiming a realistic preview. Keep canonical totals, MOQ/preparation and saved-order recovery. | IN_PROGRESS; bounded landing/builder/message scope DONE locally with recorded gates. M18 purchase pass also DONE locally; merchant-dependent physical/printing and live scope pending. |
| **V5 — Optional signature experiences** | Selected taste/hosting/occasion planners, useful comparison/reorder, optional shop-the-table or private gift reveal. | Remaining M10/M12–M14/M27–M29 when selected and supported by verified data. True 3D is separate feasibility work. | PROPOSED / TODO; can be deferred without blocking core launch. |
| **V6 — Integration and release readiness** | Consistent experience across devices/languages; verified performance, catalog freshness, admin editing and supported live checkout/integrations. | M24, remaining cross-page M20–M23/M25/M32/M33 as selected, existing R03/R04/R11 gates and original admin Stage 6 external blockers. | IN_PROGRESS — V6-R01 recovery and read-only Railway/public-catalog checks; private provider/release gates remain BLOCKED. See RESUME_VERIFICATION.md. |

**Every phase includes design → implementation/admin support → browser/functional verification → self-review/fixes → saved GitHub checkpoint.** Review, accessibility, localization, performance and tests start in the phase that changes a surface; they are not postponed until V6. Finish one reviewable slice before expanding scope. Keep the compact homepage and single product showcase.

### Immediate slice: V2-A — product cards and collection continuity

Owner/agent: Codex. Scope SELECTED / work DONE locally, plus bounded V2-B shop styling and Back recovery. Evidence: [PREMIUM_V2.md](docs/PREMIUM_V2.md). Richer editorial content, aliases and live audit retain their separate status.

- First inspect `ProductCard.tsx`, its selected-option/price/cart/media consumers, `the existing HomePage showcase consumers`, `CategoryCarousel.tsx`, existing shop/PLP consumers and `docs/COMPONENTS_INVENTORY.md`. Reuse their shared behavior.
- Give real product photography consistent framing, strengthen name/selected-quantity/price hierarchy, refine labels and 44px mobile actions, and align collection/card typography and spacing with the accepted hero. Use existing assets; do not clip labels or actual pack/contents details merely to match the arch.
- Preserve existing cart acknowledgement, second-photo preview, explicit gallery controls, unavailable/inquiry modes, merchant ordering/visibility, IDs and routes. Retain one homepage showcase. No backend pricing, stock or live product reclassification.
- Acceptance: correct selected quantity and price agree with the added cart option; card/quick-view/PDP navigation remains intact; configurable and legacy products, inquiry/unavailable cases, failed images and long names work. Check 360/390/tablet/1440, EN/UR/AR, light/dark, 200% text, keyboard/touch and reduced motion. Save comparable before/after actual-route evidence and pass required local gates.
- Begin R04 by checking for an available authorized live catalog snapshot/watermark. If unavailable, record BLOCKED and complete fixture/source checks; do not ask for keys or invent a live audit.
- V2-B core category/control styling, retained native filters and current-tab Back position/loaded-depth recovery are locally complete; see the task record for exact evidence and limits. New synonyms, automated catalog monitoring and broad editorial copy are not silently bundled into this first slice.

Existing assets, palette and retail/gifting balance are already answered. No further owner input is needed to begin V2-A. Request only factual product/printing/serving information when a dependent later feature reaches it; omit unsupported claims meanwhile.

## Owner inputs — ask once, keep the answers here

| Input | Why needed | Current record / safe interim approach |
| --- | --- | --- |
| Main commercial focus: daily retail, gifts/events, wholesale, or an explicit balance | Determines hero action and prominence. | CONFIRMED: retail + gifting balanced. |
| Five to eight priority products and two to three hero gift boxes, identified by names/IDs | Selects truthful hero/showcase content. | OPEN. Use existing catalog IDs for layout exploration; no invented bestseller claims. |
| Authentic pack/product/box photos and any current logo master | Determines final art and “what arrives” accuracy. | CONFIRMED: existing assets first; polish crops/framing/presentation. Original merchant shoot remains separate. |
| Verifiable brand/process facts, public review permissions and product facts | Supports story/passport/trust content. | OPEN. Omit unsupported statements. |
| Personalization/printing capabilities and any exceptions to existing preparation rules | Makes card preview and gifting requests deliverable. | OPEN. Preserve saved MOQ/preparation; do not invent options. |
| Priority/date and budget for new shoots, 3D or extra services if wanted | Controls sequence and assets. | OPEN. Existing stack/assets first; no paid commitment. |

Do not ask again for already established EN/UR/AR, dark mode, emerald/ivory/gold, compact homepage, canonical Firestore pricing or preservation of existing keys. A missing photo can block final photography while leaving layout/token/verification work available.

## Definition of done

Apply [RULES.md](RULES.md), especially review R03, catalog R04 and delivery R11. For a selected feature: satisfy its acceptance on real routes, record failed/fixed checks, include relevant browser evidence and explain any live blocker. New admin-editable fields must persist, validate, stay private when draft and reach the actual customer surface after publication.

Performance targets for field measurement are LCP <=2.5s, INP <=200ms and CLS <=0.1 at the 75th percentile, separated by mobile/desktop. Record baseline, device/network and lab/field source; these are targets, not results or a score guarantee. Before/after snapshots must use comparable conditions.

## Decision log

| Date | Decision / source | State |
| --- | --- | --- |
| 25 Oct 2026 | Owner supplied 24 ideas, requested further suggestions, needed inputs and a repository progress record before starting. | Planning selected; individual new features proposed. |
| 25 Oct 2026 | Owner added mandatory rules: review before delivery, correct categories after Firestore item changes, preserve working behavior, reduce repeated prompting. | Rules documentation implemented; future automation is separate M34. |
| 25 Oct 2026 | Recommend A / The Signature Table; preserve current brand and services. | Working V1 direction based on confirmed balanced priorities. |
| 27 Oct 2026 | Owner accepted current look and requested phased continuation. | Six delivery phases recorded; V2-A product cards/collection continuity selected as next slice. No new implementation claimed in this planning checkpoint. |

## Next session

1. Fetch current PR #16 head; read `AGENTS.md`, `RULES.md`, `instructions.md` and this file.
2. Read this checkpoint and the original Stage 6 blockers. Do not repeat completed admin/interactions or call them live-certified.
3. Owner replies are recorded: retail + gifting balanced; existing assets first. Do not ask again. Read PREMIUM_V1.md for current gates.
4. Preserve the accepted hero in PREMIUM_V1_REVISION.md. Follow the six-phase schedule above; M15 product-detail pass is locally complete in PREMIUM_V3.md; bounded M19 story/journal layouts and functional fixes are locally complete in PREMIUM_EDITORIAL.md; bounded V4 landing/builder/message continuation is tracked in PREMIUM_GIFTING.md; M18 purchase scope is now locally verified in PREMIUM_PURCHASE.md; next is V6 authorized integration readiness. Preserve pending factual/photo/printing dependencies. V2 core evidence is in PREMIUM_V2.md. Read the component inventory and existing card/media/cart consumers before editing; live category audit remains blocked until current authorized evidence is available.
5. Use R03/R04/R11 as applicable, update status/evidence/next action, save against the verified remote parent and verify the saved checkpoint.

## References used for these recommendations

- [Baymard: in-scale product images](https://baymard.com/research-articles/in-scale-product-images) — supports showing a real reference for product size; AllBarka's specific layout is a design recommendation.
- [Google web.dev: Web Vitals](https://web.dev/articles/vitals) — metric thresholds and field/lab distinction, checked 25 October 2026.
- Current repository source and existing admin evidence at the implementation parent above. Live merchant records were not read in this checkpoint.

25 Oct 2026: owner confirmed balanced retail + gifting and existing assets first. Bounded V1 is locally verified: 706 tests, 21 backend, 36 production checks. Next planned slice: V2 collections/product-card presentation; preserve V1 and obtain live catalog snapshot when authorized access is available.

Saved V1 source/evidence checkpoint: `7b35e5e9cfbe4fe7188f1f95a856692729beaf91` in PR #16. Remote tree/head/parent verified; 883 blobs, no deletions. This documentation-only successor records verification; inspect the current PR head before the next task.
