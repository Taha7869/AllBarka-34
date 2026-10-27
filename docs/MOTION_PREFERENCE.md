# M21 — live device motion preference

28 October 2026 (Asia/Karachi). Codex. SELECTED / DONE locally for this bounded slice; verified remote save is the final delivery step. Inspected parent `7fa11696d81c347a0ee8ce91aa52efbc0561dd46`, tree `599fc1839f38d55d1046b7ba5bee0331a63902a4`, draft PR #16. Owner requested the next independent step and deferred keys/configuration changes and final release. This bounded slice continues the already-selected M21 motion work.

## Result and scope

Existing Motion `useReducedMotion` consumers read an initial preference in the installed implementation. A device preference changed during a shopping session could leave their JavaScript-controlled movement or smooth scrolling using the old value. The new shared `usePrefersReducedMotion` hook subscribes through React's existing `useSyncExternalStore`, with a stable server snapshot, current boolean browser snapshot, listener cleanup and legacy-listener fallback. Missing browser APIs do not throw in the hook.

All 35 existing consumers now use the shared hook. This includes product/gallery/collection controls, shared motion utilities, overlays, cart/checkout, navigation and secondary effects. Their existing pause/manual-play policies, translations and animation variants remain the owners of behavior; this changes the live preference source. It does not certify every possible animation in the application. CSS media queries already react to preference changes and were retained. No new component, dependency, user setting, pricing path or backend schema.

ScrollReveal previously returned different wrapper element types for normal/reduced motion. Applying a live preference without correcting that branch would remount its children and discard input. It now retains one motion wrapper and switches its animation targets/duration. MagneticButton's existing coarse-pointer query also guards an absent `matchMedia` function. Other consumer changes are import substitutions only.

## Verification and evidence

- Typecheck, hooks lint and production build/privacy audit PASS on the corrected source. Final runtime fingerprint: `8d8f6222a9808c2258174bd732fecc23e3f54c361afec556f553830a5a7e2c37`. Existing bundle advisory remains.
- Targeted command, with `ALLBARKA_SKIP_LOCAL_ENV=true`, installed Chromium via `ALLBARKA_TEST_BROWSER` and evidence capture enabled: `node --import tsx --test --test-isolation=none tests/motion-preference.test.tsx tests/pantry-motion.test.tsx tests/visual-refinements.test.tsx tests/circular-carousel.test.tsx`. PASS **21/21**, zero failed/cancelled/skipped, exit 0.
- New mounted browser journey uses the actual shared hook, ScrollReveal, MagneticButton, BackToTop, LanguageProvider and ThemeProvider. It changes the real emulated device preference after mounting, preserves typed input inside the reveal, clicks the real action, and checks requested `auto` versus `smooth` back-to-top behavior. Twelve width/language/theme combinations (390/1440, EN/UR/AR, light/dark), each toggled on/off, yield 24 rows in [the matrix](evidence/motion-preference/layouts.json). No app reload or artificial hook override is used for this matrix. A scroll-call recorder inspects the requested behavior; it is not a real-device scroll physics measurement.
- Separate mounted hook probes exercise legacy `addListener` notifications/unsubscription and missing `matchMedia`. The server rendering case checks a safe server snapshot. This certifies the hook's fallback, not the entire app on browsers lacking modern APIs.
- Final full offline suite: PASS **715/715 across 79 files**, zero failed/cancelled/skipped, exit 0; 21 backend and 36 production checks PASS. Assets: 97 products, 115 references / 111 unique files, zero missing/retired views. Command: `ALLBARKA_SKIP_LOCAL_ENV=true ALLBARKA_TEST_BROWSER=/workspace/scratch/f57ba9a36e75/browser-runtime/bin/chromium node scripts/run-all-tests.mjs`. Standalone production confirmation after the delivery build also passes 36/36. [Machine-readable evidence](evidence/motion-preference/verification.json).

An initial new-test diagnostic failed because serializing a TypeScript-instrumented getter into `addInitScript` referenced the transpiler's `__name` helper in the browser. A plain JavaScript injection and an isolated actual-hook probe remove that fixture error. No application assertion was removed; the 24 main UI checks, real preference notifications and listener cleanup remain. The first targeted run was 20/21; only the final 21/21 run is acceptance evidence.

## Self-review

Review method: source/import diff, shared-state lifecycle inspection and mounted browser regressions. No independent reviewer claimed.

| ID | Finding | Resolution |
| --- | --- | --- |
| MP01, medium | Initial-only preference can leave existing motion/scroll controls active after a device setting change. | One subscribed hook; all 35 prior consumers migrated. Current preference and actual back-to-top request are checked. |
| MP02, medium | Dynamic ScrollReveal branch would replace its wrapper and lose descendant input. | Stable wrapper type; mounted text survives all 24 preference/theme/language/size transitions. |
| MP03, compatibility | Coarse-pointer query can throw if matchMedia is absent. | Guard in MagneticButton; shared hook handles absent APIs and legacy subscription cleanup. Full-app legacy compatibility is not claimed. |

## Catalog and external boundaries

Fresh public catalog watermark and 97-product count are in [the public read record](evidence/motion-preference/public-watermark.json). The version matches the previously captured public projection. No product/taxonomy/media assignments, rates or availability changed. R04 complete private semantic reconciliation remains BLOCKED without a current authorized merchant/taxonomy snapshot; a public watermark does not close it.

Existing current auth, Storage, n8n, accepted-order, preview/rollback and final release gates remain open. Photography, factual claims and merchant printing/style options retain their separate master-plan statuses. No provider/key configuration or live database/workflow/role write, merge or deploy occurs in this slice.

## R11 and continuation

- [x] Bounded acceptance implemented; broader M21 and live gates remain separately scoped.
- [x] Source self-review and meaningful failure/state preservation checks recorded.
- [x] Final full suite, typecheck/hooks/build/privacy and whitespace checks pass; relative links checked before save.
- [x] Catalog impact/watermark recorded with public/private distinction.
- [x] Existing commerce, privacy, roles, localization and manual reading controls retained.
- [x] Master/handoff/test/changelog updated; source checkpoint prepared for verified save.
- [ ] Expected parent/base tree, candidate contents and saved remote ref verified.

Next independent continuation after final save: inspect remaining route/overlay keyboard and short-height behavior (M20/M21) while provider-dependent checks stay deferred. Do not restart this preference migration or the completed premium/admin stages. Obtain authorized provider/test access when the owner moves to final integration; changing keys is not itself verification.

Self-review also compared all migrated consumer bodies against the inspected baseline: 33 are import-only substitutions; only ScrollReveal and MagneticButton have the documented additional changes. Live release is deferred. The full suite includes the new mounted preference journey and existing actual-route admin/catalog/gifting/purchase/navigation checks.
