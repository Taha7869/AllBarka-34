# AllBarka premium storefront and specialist AI plan

10 November 2026 (Asia/Karachi). Owner-confirmed decisions and source audit, **planning checkpoint**. Inspected parent `3b1a1ef71d0be2b34c0e879a0c549c99c3a0c18f`, `codex/premium-table-kit-20261108`, [draft PR #17](https://github.com/Taha7869/AllBarka-34/pull/17). Author/reviewer: ChatGPT/Codex, source inspection and self-review; no independent model/designer review claimed.

Read [CAUTION.md](../CAUTION.md) before implementing or improving these features. This file records the pending work without claiming that a prototype or selected idea has been integrated. Earlier M01–M34 and Stage 6 tasks remain intact in [MASTER_PLAN.md](../MASTER_PLAN.md).

## Owner answers — keep these decisions

| Answer | Confirmed direction | Implementation boundary |
| --- | --- | --- |
| 1 | Owner can provide new high-quality desktop/mobile films using their Google subscription. | Prepare precise asset briefs; do not claim unlimited generations, API credits or that new films were delivered. |
| 2 | Use a reference gift box while real packaging is finalized in parallel. | Label concept imagery; no claim that a rendered box, stationery or contents are the exact sellable package. True modeled 3D remains deferred. |
| 3 | Designer may choose visible, tasteful composer placements, including chatbot. | One full discovery composer below hero, compact launcher elsewhere, shared session/draft where appropriate; avoid duplicate fixed bars and competing chats. |
| 4 | Default shopping assistant, general food/nutrition tips, and friendly Gifting/Nikkah specialist. | Real server role routing and scoped knowledge; no provider-name dropdown pretending the split already exists. |
| 5 | Keep existing Groq integration now; other providers/keys can be connected when needed. | Preserve current n8n bridge and voice contracts; no key/account/billing changes. Owner means different models and relevant datasets. |
| 6 | Existing tips/knowledge should be reused and improved. | Audit existing facts, translations, policy code and bot before adding records. No duplicate catalog or unsupported health advice. |
| 7 | Include bounded attachments if practical; larger files go to WhatsApp. | ATTACH-01 below defines a conservative V1 proposal selected under delegated implementation judgment. Safe backend/storage work precedes showing it as working. |
| 8 | Mobile product browsing uses large photo cards, horizontal swipe and a next-card peek. | Preserve full product actions; main card opens details, explicit Quick View opens its modal. |
| 9 | Approximate Neelum Block location is sufficient; hours 10:00–19:00. | Lahore comes from existing contacts, not a verified new pin. Verify the intended Neelum Block locality before a location-specific maps URL; no invented coordinates, branch/phase or opening weekdays. Hours are Asia/Karachi. |

Additional explicit requirement: preserve the original detail page with a photo alongside scrolling details, plus original card animation, borders, Quick View and existing useful tools. A simpler isolated mockup is not permission to delete these features.

## Verified original code to preserve

| Surface | Inspected source / existing behavior | Integration acceptance |
| --- | --- | --- |
| Product cards | `src/components/ProductCard.tsx`: spring hover lift, surface/accent borders, wishlist, image gallery, native title/details links, weight controls, canonical price and cart action; background click excludes nested interactive elements. | Keep this component as the foundation. Add restrained sheen/depth without losing borders, content, keyboard targets or purchase behavior. No nested button/link trap. |
| Quick View | `src/components/QuickViewModal.tsx`: real modal, focus/scroll handling, photo/details, variant/quantity and full-details action. | Dedicated Quick View must never navigate or add automatically. Preserve focus return and scroll position. Current modal resets weight on open and full-details link omits selected variant: reviewed variant handoff is TODO, not already solved. |
| Product details | `src/pages/ProductDetailPage.tsx:280`: existing `pdp-gallery` with `lg:sticky lg:top-28`; adjacent detailed content, gallery/viewer, passport and purchase/inquiry controls. | Keep desktop side-by-side sticky photo and independent document scrolling; avoid transforms/overflow ancestors that break sticky. Mobile stacks cleanly with safe purchase controls; short-height/zoom behavior must work. |
| Navigation | `src/layouts/RootLayout.tsx`, `src/config/navigation.ts`, current desktop/mobile menus. | Inventory and preserve all existing destinations, utilities, EN/UR/AR, theme, search, account, wishlist and bag. No silent menu reduction. Keep dropdown reachable and open while traversing submenu. |
| Hero/discovery | `AllBarkaHero.tsx`, `AllBarkaHero.css`, `CategoryQuickPills`, `VoiceInputButton`, SelectionGuide, Mehmaan planner and Shop the Table. | Improve art direction and composition while preserving published Studio controls, working search/mic/guide routes, film failure poster, pause, visibility and reduced-motion handling. |
| Collections/showcase/gifting | `CategoryCarousel.tsx`, `BoutiqueSelections.tsx`, `FindGiftOccasionSection.tsx`, existing gifting route/modals. | Preserve taxonomy/routes and one configurable homepage showcase; no duplicate product grids or competing editors. |

These are source observations. Actual-route screenshots/browser checks have not been rerun for the proposed redesign in this checkpoint.

## Art direction and motion brief

Continue **The AllBarka Living Gallery**: cinematic emerald opening, clean ivory commerce, tactile real-product imagery and one signature gifting reveal. Keep Playfair Display / Inter / Amiri and semantic emerald/ivory/gold tokens. Fix scale, spacing, line length, Arabic/Urdu typography and image quality before proposing a font replacement. Maintain light/dark and readable contrast; bronze `#806326` on ivory `#FDFBF7` is a surface-specific pairing, not a universal gold-text rule.

1. **Opening film:** calm space for immediate headline and two real actions; desktop composition with platter scene beside text, dedicated portrait mobile framing. Subtle moving light/leaves and material detail; food, table and camera remain stable. No moving text baked into footage, audio autoplay, bottles/packaging not actually approved, fake 3D or morphing nuts.
2. **Hero-to-discovery:** a small scroll-linked widening/depth change reveals the ivory tools naturally. No scroll hijack, automatic page scrolling, mandatory loading intro or action blocked by animation. Reduced motion gets a composed still; manual pause remains available.
3. **Collections:** retain the curved collection carousel and controlled perspective. Drag/swipe, arrows, focus and touch work; pause any decorative movement on interaction/visibility loss. No auto-changing tabs while a customer reads.
4. **Selected for your table:** original cards with better photo crop, type hierarchy, fine gold boundary and subtle fine-pointer sheen. Mobile uses a swipe rail with visible next item; desktop retains readable editorial comparison. Bounce is short press/cart feedback, not continuous movement.
5. **Gift Atelier:** CSS perspective/separate layers or a matching rendered image sequence for closed box → open lid → contents → localized stationery. One open-box image alone cannot create an accurate opening. Stages 03/04 expose stable actions and a skip/end-state path; do not force a long pinned mobile sequence.
6. **Actionable gifting:** settle into existing ready-to-ship/custom inquiry choices. Composition, prices and availability come from catalog; custom ten-day preparation and final quote confirmation stay truthful. No hard-coded Tasting Flight price or invented ready-stock promise.

Asset request to owner: desktop landscape and mobile 9:16 locked-camera ambient loops, preferably 6–10 seconds with matched loop light, plus sharp poster frames; keep UI-safe empty areas and subject framing. Delivery target: responsive H.264/MP4 plus a browser-supported open-codec alternative where useful, poster WebP/AVIF, no audio track. Proposed starting payload budgets: mobile film <=2MiB, desktop <=4MiB and each poster <=250KiB, reviewed visually rather than degrading essential quality to hit a number. Do not load both film variants; prioritize the poster and avoid video on reduced-motion/data-saving conditions. Codec playback must be tested in the actual CI browser; MP4 failure is not established as Run #47's cause.

## AI-PROFILES-01 — server-selected models with scoped data

**SELECTED / TODO.** Current source has one shopping/celebration system, not three independent role integrations. Existing n8n owns the Groq model/credential. Current direct website transcription is a separate server configuration path; do not conflate text chat with voice availability or Google Pro with API entitlement.

| Customer role | Allowed context/tools | Boundaries |
| --- | --- | --- |
| AllBarka / default | Published canonical catalog and store policies; product search and validated recommendation links; existing authorized order lookup only through its own authenticated service. | No supplier/internal/draft data; no invented prices/delivery commitments; never let prompt text grant order access or modify order state. |
| Food & nutrition tips | Reviewed product ingredients, available storage/serving facts and separately curated, source-backed general food tips. | General education only; no diagnosis, medication, treatment/cure or personalized disease/allergy safety claims. Do not request medical files. Missing facts stay unknown. |
| Gifting / Nikkah buddy | Published boxes/contents/MOQ, occasion/budget/date/quantity preferences, merchant-supported stationery options and existing inquiry services. | Friendly recommendations and reviewable prefill; no unapproved supplier stock, package specification, firm custom quote or deadline. Saving/sending follows explicit customer confirmation and real server result. |

The server maps an allowlisted `assistantRole` to approved provider/model configuration, context sources, public tools, timeout and budgets. Never accept arbitrary provider URLs, key names or database collection paths from the browser. The customer sees useful role names; actual provider/model provenance must be truthful and may be available in a compact details view. Exact Groq text model remains **unknown until the current n8n credential/node configuration is inspected**.

Use one canonical database with separate access-controlled knowledge scopes, not independently editable price copies. Suggested future knowledge metadata: stable ID, role, locale, source URL/merchant evidence, reviewed status, content version, reviewedAt and expiry/review date. These are proposals; no schema was created. Retrieval/context injection is not training the underlying model. Reuse existing `health_*`, `storageTips_*`, taste/passport fields, translations, `aiBuddyResolution.ts` policies and medical fallback first. Bundled English repeated in Urdu/Arabic fields is not completed translation or a clinically reviewed knowledge base.

Fresh authoritative quotes remain mandatory. Role profiles do not by themselves reduce Firestore reads: the current chat path requests a fresh catalog. Optimize a bounded public context cache/retrieval projection with revision invalidation and explicit staleness, then measure reads/latency. Private order/customer context must never enter a public/shared cache. A role switch retains a deliberate conversation summary and draft but isolates role-specific sensitive context. Keep cancellation, timeout, provider failure and WhatsApp fallback truthful; no key rotation to evade provider limits.

## ATTACH-01 — bounded reference-image intake

**SELECTED / TODO; implementation limits proposed under owner delegation.** Start with a maximum of two JPEG/PNG/WebP reference images, <=3MiB each, <=6MiB total file content, <=4096px per side and <=12 megapixels per decoded image. Use multipart with a bounded allowance for metadata; do not globally enlarge the existing 128KiB JSON parser or send base64 blobs in chat history. PDFs, SVG/HTML, archives, office files and video are outside this first slice; show a helpful WhatsApp handoff for unsupported/oversize files.

Server validates count, real signature, complete decode, decompression/pixel bounds and request quota; re-encodes raster content and strips metadata. Store in a separate private object namespace with scoped authorization, unguessable IDs, limited expiry/access, no public catalog download tokens and deletion support. Reuse existing session/Auth design; anonymous uploads need a short-lived, rate-limited server-issued capability before they are enabled. Proposed cleanup: discard unsubmitted uploads after 24h; submitted-reference retention needs a documented business policy before launch. Do not silently adopt an indefinite retention period.

Show preview/remove/uploading/error/retry, and explicit review before attaching to an inquiry or sending image content to a model. Multimodal provider support must be verified before advertising AI image analysis. If unavailable, images can accompany the confirmed human inquiry; the AI must not claim it inspected them. No fake progress/success from timers. Existing voice 45s capture/60s processing bounds remain separate.

## Supplied component ideas — adaptation decisions

| Owner-supplied idea | Intended use / pending work |
| --- | --- |
| Prompt Bar / model menu | Adapt shape, composer controls and role selector into existing AIConcierge/discovery. Reuse send/cancel/history/translation; expose only real backend capabilities. Attachments are not functional merely because filenames appear. |
| Morphing Button | Expansion pattern for a useful existing action. Notification channel/email-vs-WhatsApp scope was not confirmed; keep it OPEN, do not introduce a new subscription promise. Form validation, pending/error/success and Escape/focus behavior are required. |
| Run Action Button / Thought Line | Public request statuses from actual state: listening/transcribing/searching/saving/failed/cancelled. No pretend work steps, model chain-of-thought display or always-success timer. |
| Minimal Carousel | Borrow shared-layout/selection transition where useful. Supplied sample is a click-to-expand card deck, not the approved horizontal product swipe rail; do not turn the main product tap into expansion. |
| Inline Disclosure Menu | Public Save/Share/View details where useful; Edit/Delete restricted to authorized admin UI/API. Needs focus/Escape/outside-click/viewport handling and translated labels. |
| Tags / Jelly Radio / Glide Select | Catalog-validated category, budget, weight and occasion controls with removable selections, appropriate radio/combobox semantics and RTL keyboard behavior. No unsupported health benefit filters. |
| Voice Pill | Visual adaptation of real shared VoiceInputButton state; simulated waveform/default capture is demo behavior, not proof of a working mic. Preserve transcript review and permission-denied fallback. |
| Squish Switch / Star Border | Optional restrained selection/edge detail, within existing motion tokens; pause when hidden, honor live reduced-motion changes, cap canvas/pointer work. No continuous flashy outline on every product. |
| View on Map | Footer MAP-01: approximate verified locality, approved hours, lazy map only after activation and a native external maps link. Replace sample Boston address/Unsplash map, avoid invented pin, add required CSP frame origin and keyboard close/focus handling. |

Use the current motion/lucide stack. Verify license/source attribution before copying external component code. Character-by-character `split('')` animation is inappropriate for connected Urdu/Arabic letters; prefer complete phrases/words and semantic accessible text. No new icon/animation framework is selected.

## Pending execution list and acceptance

| Order / task | Status | Completion evidence required |
| --- | --- | --- |
| 1 — SEC02 evidence and owner decisions | Documentation checkpoint | Read-back of these files, verified parent/diff, build/privacy audit, scoped security results; no runtime/deploy claim. |
| 2 — CI-PR17 diagnosis | TODO / release blocking | Exact Run #47 assertion/log, reproduction at source SHA, targeted/full regression and observed green hosted result. Preserve strict assertions. |
| 3 — M07-OG1 + M15-OG1 preservation baseline | SELECTED / TODO | Actual-route desktop/mobile screenshots and browser checks for original borders/motion, card navigation vs Quick View, variant/quantity continuity, sticky photo and Back/scroll/focus restoration. |
| 4 — M01-LG1 + M21-LG1 cinematic polish | SELECTED / TODO | Owner film/poster previews, responsive composition, native scroll, pause/visibility/codec failure/reduced motion/data budget; retain published Studio overrides. |
| 5 — AI-PROFILES-01 | SELECTED / TODO | Existing knowledge inventory, server role allowlist/data projections, Groq workflow compatibility, signed-in/guest quotas, injection and cross-role privacy checks, real provider results in isolated environment. |
| 6 — M07-MOBILE1 + interaction adaptation | SELECTED / TODO | Photo swipe rail and next-card peek, keyboard/touch/RTL controls, explicit Quick View, current prices/cart state and reduced motion; no main-card expansion regression. |
| 7 — ATTACH-01 + MAP-01 | SELECTED / TODO; locality verification pending for map | Safe private upload lifecycle and WhatsApp fallback; confirmed Neelum Block locality, 10AM–7PM local hours, no invented days/pin, lazy map+CSP, accessible fallbacks. |
| 8 — M08-LG1 + M09 continuation | SELECTED / TODO; physical assets dependent | Concept-marked CSS/layered gift reveal, stable Stage03/04 actions, real contents/price/inquiry flow and EN/UR/AR stationery; physical packing claims await merchant verification. |
| 9 — Stage 6 launch | BLOCKED | Resolve relevant CAUTION P0/P1, current catalog/claims, real Auth/Storage/n8n/voice/order tests, full hosted CI, backup/rollback and separately authorized deployment. |

Regression matrix for touched UI: 360/390px, tablet/laptop and 1440px, EN/UR/AR, light/dark, keyboard/focus/touch, reduced motion and 200% text; include short height and failed image/font/video/network states. Cards/Quick View/PDP must retain selected canonical variant and cart quantity, or require visible renewed review on unavailable/repriced data. Success follows persistence; no fake social proof, unsupported statistics or simulated checkout.

## Current evidence and continuation

Documentation/source self-review only; no redesign implementation, new API provider, upload endpoint, maps embed, runtime fix, rules publication or deployment is included. [Checkpoint evidence](evidence/security-20261110/verification.json) separates code, local tests, hosted CI and live state.

Next executable action: obtain the exact PR #17 failing test log and reproduce it, then capture the OG actual-route preservation baseline before integrating any new layout. Do not rebuild the store as a standalone mockup or delete existing premium behavior to match one reference image.
