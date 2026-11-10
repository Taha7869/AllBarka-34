# AntiGravity — AllBarka home visual block

10 November 2026. Owner-selected parallel work. This is a runnable handoff for the owner's AntiGravity IDE; ChatGPT has not opened or operated that IDE. The separate internal reviewer is not AntiGravity.

## Start here

Select **Gemini 4 Argon / Medium** from the menu the owner supplied. This is a task allocation recommendation, not a benchmark ranking. Use Flash for inspection/small follow-ups; reserve Sonnet for a bounded implementation review and Opus for a specifically difficult unresolved problem. Record the actual selected menu label in your report; do not invent the underlying model ID. Check View Usage; the subscription is not unlimited. Provider reference: https://antigravity.google/docs/models/ and https://antigravity.google/docs/plans/ . Do not assume the consumer subscription provides free production chatbot APIs. Do not add API keys or change billing settings.

Paste the following task into AntiGravity:

---

You are improving the EXISTING AllBarka production codebase, not replacing it with a new landing page. Your goal is a visibly richer, cinematic, coherent luxury grocery and gifting homepage while preserving the working store and its original interactions. Work to your strongest ability within this bounded block.

Repository: https://github.com/Taha7869/AllBarka-34
Integration branch: codex/premium-table-kit-20261108 ; draft PR17.
Create a separate branch named ag/living-gallery-home-20261110 from the latest reviewed integration branch. Record the exact starting SHA. Preserve any uncommitted work on the owner's computer; do not reset, clean, stash without explanation, overwrite an existing checkout or work concurrently in Codex's checkout. Use an isolated checkout/worktree. If the starting branch moves, report the difference rather than rebasing shared work silently.

Read the repository's AGENTS.md, instructions.md, RULES.md, design.md and relevant current handoffs before editing. Read docs/PARALLEL_BUILD_PLAN_2026-11-10.md, docs/CATALOG_INTAKE_HANDOFF_2026-11-10.md and this file. Inspect the current implementation and render the real homepage before deciding what to change. Historical instructions that point at another branch do not replace the owner's explicit active branch above.

YOUR EDIT ALLOWLIST:
- src/components/AllBarkaHero.tsx
- src/components/AllBarkaHero.css
- src/components/CategoryCarousel.tsx
- src/components/BoutiqueSelections.tsx
- src/components/FindGiftOccasionSection.tsx
- Optional new, component-scoped stylesheet src/components/LivingGalleryHome.css, imported only by an allowed component.
- Your delivery report docs/AG_HOME_REPORT.md and actual screenshots under docs/evidence/ag-home-20261110/ .

Everything else is owned by Codex for this block. In particular, do not edit ProductCard, QuickViewModal, ProductDetailPage, RootLayout, HomePage, routing, cart/checkout, translations, catalog JSON/seeds, imports, server/auth/security rules, global CSS, package manifests or existing tests. Keep the existing component exports, public props and callback contracts. If a shared-file change is essential, write the exact proposed patch and reason in your report; do not apply it. New customer-visible strings must be proposed in EN/UR/AR in the report for coordinated translation integration; do not ship untranslated labels. Existing t() keys can be reused.

VISUAL DIRECTION — THE ALLBARKA LIVING GALLERY:
- Keep the emerald/ivory/travertine identity, restrained brushed gold accents and existing typography system. Preserve legibility and the strongest OG card border/hover/Quick View treatments. Improve hierarchy, spacing, texture, framing and motion; do not remove features to obtain a cleaner screenshot.
- Inspect the current local fonts. Use the current Playfair/Inter/Amiri/Urdu system appropriately; do not scatter font families or animate Urdu/Arabic character by character. Never download random unlicensed fonts.
- Hero: cinematic platter film plus editorial headline and both retail/gifting actions. Keep desktop and mobile media framing intentionally different. Preserve current poster/video-error fallback, light/dark and reduced-motion behavior. Animate a subtle scene widen or framing transition as normal scrolling proceeds. Text, controls and shopping remain available immediately; no scroll hijack, forced automatic page scroll, intro wait or wheel interception.
- Natural motion should come from light, leaf shadows and the existing approved film. A panning still image is not a video or true 3D. Do not claim realistic lid opening without matching layers/frames. If new owner-generated film is needed, deliver exact desktop/mobile prompts, aspect ratios, safe text zones, poster and loop specifications in the report. Use existing approved assets until replacement is accepted.
- Collection rail: retain curved perspective/depth on capable desktop devices, prominent center selection, usable arrows and keyboard focus. Mobile should support native-feeling swipe/snap with visible next-item affordance and large touch targets. Do not auto-rotate tabs while someone is reading; any moving rail pauses on interaction/focus and offers a stop control where needed. Reduced motion presents a stable layout.
- Selected for your table: preserve real catalog, existing filters, variant controls and commerce callbacks. Make the allowed section composition editorial and material-rich. Product-card restyling proposals belong in the report, since the shared ProductCard file is locked for integration. Quick View opens only from its explicit action; primary card/title actions lead to the detail page. Never nest interactive buttons inside a link.
- Gift Atelier: a purposeful, lightweight progression from closed box to open/layered contents to personalization can be proposed/implemented only with existing verified assets. Use transform/opacity-driven layers, not a heavy WebGL dependency. Keep final inquiry/ready-to-ship actions stable, clickable and reachable without completing a scroll animation. Existing quantity/pricing/preparation policies remain authoritative. A reference box is not a promise of exact sellable packaging.
- Use tasteful hover light/sheens and short damped press feedback where they clarify action; avoid rubbery headings, repeated bouncing, floating controls everywhere, arbitrary particles, neon gradients or a template dashboard look. Mobile/touch has no hover dependency.
- Search/voice/discovery tools and all current navigation utilities must stay accessible. Because RootLayout is locked, inspect it for regressions but request any navigation changes in your report. Do not delete utility controls to simplify the hero.

RESEARCH WITHOUT HALLUCINATION:
Explore a small set of real design references, including https://v0-gigi-energy-drink-landing-page.vercel.app if accessible. Research clean editorial commerce, cinematic video heroes, perspective collection rails and restrained scroll transitions. Record exact reference URLs, what you actually observed, the specific adaptable technique and how it serves AllBarka. If a page is inaccessible, say so; do not invent an award, animation or case study. Take inspiration, not proprietary code/assets. Identify source/license before reusing any supplied Motion snippet or third-party code.

PRESERVE BUSINESS TRUTH:
- Do not alter existing products/rates, shipping, stock, discounts, MOQ, checkout or inquiry paths.
- Do not invent origins, farm stories, certifications, health outcomes, reviews, sales activity, fulfillment or order confirmations.
- Do not apply the prepared-but-blocked catalog JSON/media mapping/care fields through another writer. The current catalog handoff describes the public-payload approval boundary; this visual block does not authorize bypassing it.
- Do not duplicate Phool Makhana: the existing id is fox-nuts. Reference image corrections exist, but source wiring and merchant publication are separate tasks.
- Do not send messages to customers, call live providers, change production Firestore, add keys, merge to launch/main or deploy.

VALIDATION AND DELIVERY:
Run typecheck, hooks lint, production build/privacy audit and the existing relevant browser tests using the repo's supported browser. Run the complete offline regression gate before proposing integration. If the environment blocks a check, record the exact command/error; never mark it passed. Do not edit a failing test to conceal a behavior regression.
Inspect actual routes at widths360,390,768,1440 with EN/UR/AR, light/dark and reduced motion; check200% text zoom, keyboard order/focus, Escape behavior of existing overlays, touch/swipe, no horizontal overflow and poster/error fallbacks. Verify call-to-action targets and product/Quick View actions. Inspect animation while moving, not only frozen screenshots. Keep expensive work outside hot scroll handlers; clean up observers/listeners; avoid layout thrashing and large blur filters over moving video. Preserve browser-native scrolling and performance fallbacks for low-end devices. Report measured performance and test conditions rather than inventing Lighthouse scores or device compatibility.

Deliver a bounded diff on your branch and docs/AG_HOME_REPORT.md containing: selected model menu label; base SHA and result commit; changed-file list; reference observations; exact commands and results; actual before/after screenshots from the browser; motion/fallback behavior; remaining shared-file proposals; any owner film requirements. A mockup is not a browser screenshot. Stage only allowed files. Do not force-push or modify the integration/launch branch. Hand the report and branch/commit to the owner for Codex review and integration. If GitHub branch publication needs credentials not available in the IDE, supply the local commit/diff and say it is not pushed.

---

## Owner return message

Send Codex the AntiGravity branch/commit and AG_HOME_REPORT.md. Codex will review the bounded diff, integrate shared-file proposals, run regression and report what is actually ready. Neither this handoff nor a green offline suite alone authorizes a production launch.
