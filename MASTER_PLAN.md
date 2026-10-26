# AllBarka — visual identity and experience master plan

26 October 2026: owner requested stronger visual character and premium internet/motion references. Current M01/M02/M04–M06/M21 revision is IN_PROGRESS, not yet verified after workspace recovery. Read [current revision](docs/PREMIUM_V1_REVISION.md). Earlier completed work and live Stage 6 blockers remain.

Updated: 25 October 2026 (Asia/Karachi).

**Current checkpoint: bounded V1 hero/discovery implementation.** Owner confirmed balanced retail + gifting and existing assets first. Work/evidence is in [PREMIUM_V1.md](docs/PREMIUM_V1.md); remaining proposals are retained below. Mandatory review, catalog-matching and delivery rules are in [RULES.md](RULES.md).

Roman Urdu: **Yahan pending, chal raha kaam, rukawat aur verified done ka hisaab rahega. Sirf idea likhne ya UI banne se feature DONE nahi hota. Naya agent current branch aur yeh files parh kar agla kaam shuru kare.**

## Start here

- Read [AGENTS.md](AGENTS.md), [RULES.md](RULES.md), [instructions.md](instructions.md), [design.md](design.md), this file and the [current admin handoff](docs/admin-expansion/HANDOFF.md).
- Continue the existing review branch `codex/admin-catalog-foundation-20261023` and [draft PR #16](https://github.com/Taha7869/AllBarka-34/pull/16). Inspect its current head before editing/saving; do not use an older ZIP as the implementation baseline.
- Inspected implementation parent: `2df0571e52c2281f39f70ed660abef8b62e50784`; source tree `f2af11803c3383bfb743db48c1e2ed3787846e63`. At inspection, both `main` and `launch` were `5e6349051980abd1a20f719f289a24a3fd2cba7b`. These are historical pins, not permanent current-head claims.
- This is the single feature register for the premium proposal. [Admin roadmap](docs/admin-expansion/ROADMAP.md) and [Stage 6 progress](docs/admin-expansion/STAGE6_PROGRESS.md) retain authority for prior work and external release gates.
- Source presence, local tests, browser fixtures and live verification are different evidence. Current documentation validation is in [PREMIUM_PLANNING_CHECKPOINT.md](docs/PREMIUM_PLANNING_CHECKPOINT.md).

## Current status

| Workstream | State | Evidence / next action |
| --- | --- | --- |
| Previous admin expansion Stages 1–5 | DONE under recorded local gates | Preserve the existing implementation; see the admin handoff. |
| Previous interaction refinement P0–P3 and admin finishing F01–F06 | DONE under recorded local gates | Preserve cart acknowledgement, explicit gallery controls, responsive header and unsaved-edit protections. |
| Previous expansion Stage 6 | IN_PROGRESS; external gates BLOCKED | See its tracker. Planning does not close Firebase/Auth/Storage/n8n/order/deployment checks. |
| Current planning, rules and continuation links | DONE for documentation; inspect the commit containing this file for the saved checkpoint | Two root guides, catalog audit protocol and handoff links; see checkpoint evidence. |
| New premium implementation | SELECTED / DONE — bounded local V1 | M01/M02 locally complete; asset inventory and hero type portion complete. Full M03/M04 pending; see PREMIUM_V1.md. |
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
| M01 | Signature hero with distinct desktop/mobile composition, useful CTA and resilient media. | `AllBarkaHero.tsx`, current RootLayout and Studio; M03/M04. | V1 | SELECTED / DONE (local V1; see PREMIUM_V1.md) |
| M02 | Record A/B/C decision and a single visual storyboard. | Recommend A; owner's commercial priority informs balance. | V0 | SELECTED / DONE (local V1; see PREMIUM_V1.md) |
| M03 | Consistent product/packaging/scale photography, provenance inventory and responsive exports. | Existing media provider; authentic merchant assets. | V1/V3 | SELECTED / IN_PROGRESS — inventory/reuse DONE; original photography pending |
| M04 | Typography, readable prices, spacing and Urdu/Arabic line-height pass. | Existing tokens/fonts and LanguageContext. | V1–V5 | SELECTED / IN_PROGRESS — hero/discovery DONE; other pages pending |
| M05 | Compact homepage: hero, collections, one showcase, gifting, truthful brand story and useful feedback/info. | `HomePage.tsx`, published section order/visibility. | V2 | PROPOSED / TODO |
| M06 | Editorial pantry/hosting/occasion entrances that expose real catalog breadth. | Current category/collection routes; no silent ID renaming. | V2 | PROPOSED / TODO |
| M07 | Photo framing, clear selected-quantity price, readable titles and touch actions on product cards. | `ProductCard.tsx`, CartAddButton, carousel/media provider. | V2 | PROPOSED / TODO |
| M08 | Gift Atelier: accurate photo arrangement, contents/quantity summary and canonical total. | Existing `CustomHamperBuilderModal.tsx`, hamper validation and real box photos. | V4 | PROPOSED / TODO |
| M09 | EN/UR/AR personalized card preview with merchant-supported fonts/styles and persisted message/style. | Existing personalization; verify cart, reload, order and packing handoff end to end. | V4 | PROPOSED / TODO |
| M10 | Find Your Taste from real taste/texture/occasion attributes and current prices/availability. | Existing SelectionGuide; explain no-match and missing attributes. | V3 | PROPOSED / TODO |
| M11 | Verified product passport: origin, variety, roast, ingredients, allergens and storage. | Existing typed attributes/content/public projection; owner facts required. | V3 | PROPOSED / TODO |
| M12 | Mehmaan Table planner with guest count, editable quantities and visible serving assumptions. | Merchant serving guidance, current units/MOQ/cart services. | V5 | PROPOSED / TODO |
| M13 | Occasion/date planner showing city, requested date, quantity and current preparation constraints. | Existing shipping/preparation rules; requests are not guaranteed arrival dates. | V5 | PROPOSED / TODO |
| M14 | Optional private gift reveal with hidden prices and a greeting QR/link. | Separate private server contract; unguessable token, expiry/revoke, no indexing/private preview leakage. No automatic recipient message. | V5 | PROPOSED / TODO |
| M15 | Product-detail art direction: useful gallery and clear purchase/inquiry panel, distinct food/packaging needs. | Existing PDP, gallery/viewer, custom quantity and sticky controls. | V3 | PROPOSED / TODO |
| M16 | Dedicated gifting composition with occasion/budget/recipient discovery and exact included contents. | Existing `/gifting` route and `GiftsHampersDestination.tsx`; preserve current routing/filter contracts. | V4 | PROPOSED / TODO |
| M17 | Shop/category intros, relevant filters, selected states and reliable back/scroll restoration. | ShopPage/CategoryPLP, filter sheet and URL state. | V2 | PROPOSED / TODO |
| M18 | Cart/checkout continuity for actual photo, variant, quantity, message and authoritative cost breakdown. | Current persisted receipt, quote recovery and idempotency. | V4 | PROPOSED / TODO |
| M19 | Story/journal layouts with actual people/process/serving content and meaningful related products. | InfoPage/JournalPage and existing Studio articles. | V3 | PROPOSED / TODO |
| M20 | Route-appropriate mobile search/filter/buy controls, safe areas and no competing fixed bars. | Existing header/menu/cart/sticky controls; keyboard/overlay tests. | V2/V6 | PROPOSED / TODO |
| M21 | One restrained motion language with touch/keyboard/reduced-motion equivalents. | Completed interaction foundations; refine, do not recreate. | V1–V6 | PROPOSED / TODO |
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

## Phased delivery proposal

V labels intentionally differ from previous admin Stages 1–6 and interaction P0–P3.

| Phase | Scope | Exit gate / dependency | Current state |
| --- | --- | --- | --- |
| V0 — Plan and inputs | Capture scope, rules, priorities, hero direction and source map. | Documents saved; owner decisions/assets recorded separately. | DONE for V1 inputs; further merchant facts remain open. |
| V1 — Identity and hero | M01–M04, M25, baseline M24; related Studio fields and M33. | Actual mobile/laptop hero, typography and media fallbacks reviewed; original utilities remain reachable. | First bounded hero/discovery slice DONE locally; full asset/editor extensions pending. |
| V2 — Discovery | M05–M07, M17, M20/M22, M31 and category audit/M34. | Current products reachable through correct taxonomy/search, one homepage showcase, usable mobile states. | TODO |
| V3 — Product and story | M10/M11/M15/M19/M26/M27. | Verified facts/media and actual selected-option behavior; no invented product claims. | TODO |
| V4 — Gifting and purchase | M08/M09/M16/M18/M30; relevant M32 controls. | Configuration/message survives cart/quote/order/packing; canonical total and error/recovery checks. | TODO |
| V5 — Optional signature tools | M12–M14/M28/M29 when selected. | Merchant guidance and backend/privacy dependencies resolved per feature. | TODO; optional selections open |
| V6 — Release verification | Review, regression, responsive/accessibility/performance and supported live integrations. | Every selected acceptance gate evidenced, original Stage 6 dependencies respected, separately authorized rollout. | TODO |

Recommended first slice: **A + M01/M03/M04/M05/M07/M15/M16**, with M25/M26/M33 supporting it; M08 follows once accurate box/content assets are ready. This is a sequencing recommendation, not a claim that all ideas must launch together.

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

## Next session

1. Fetch current PR #16 head; read `AGENTS.md`, `RULES.md`, `instructions.md` and this file.
2. Read this checkpoint and the original Stage 6 blockers. Do not repeat completed admin/interactions or call them live-certified.
3. Owner replies are recorded: retail + gifting balanced; existing assets first. Do not ask again. Read PREMIUM_V1.md for current gates.
4. Continue from the exact V1 evidence/status; preserve completed hero behavior. Next planned slice is V2 collections/product cards, with live category audit still blocked.
5. Use R03/R04/R11 as applicable, update status/evidence/next action, save against the verified remote parent and verify the saved checkpoint.

## References used for these recommendations

- [Baymard: in-scale product images](https://baymard.com/research-articles/in-scale-product-images) — supports showing a real reference for product size; AllBarka's specific layout is a design recommendation.
- [Google web.dev: Web Vitals](https://web.dev/articles/vitals) — metric thresholds and field/lab distinction, checked 25 October 2026.
- Current repository source and existing admin evidence at the implementation parent above. Live merchant records were not read in this checkpoint.

25 Oct 2026: owner confirmed balanced retail + gifting and existing assets first. Bounded V1 is locally verified: 706 tests, 21 backend, 36 production checks. Next planned slice: V2 collections/product-card presentation; preserve V1 and obtain live catalog snapshot when authorized access is available.

Saved V1 source/evidence checkpoint: `7b35e5e9cfbe4fe7188f1f95a856692729beaf91` in PR #16. Remote tree/head/parent verified; 883 blobs, no deletions. This documentation-only successor records verification; inspect the current PR head before the next task.
