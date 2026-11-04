# Phase 3 — bounded voice input

Parent: `7a9bb0c538458b89855b9baf7ba80268a07b375c` (Phase 2). PR16 still targets launch; no merge/deployment or provider/account mutation.

## Implementation

Shared `VoiceInputButton` and `voiceInput.ts` serve the existing AI Buddy, hero search and shop search. Tap starts recording; stop leads to an editable transcript; using text never submits a chat/order. Existing search applies the reviewed text. Native buttons support keyboard and44px targets; EN/UR/AR labels, RTL/dark/reduced-motion styling are preserved. Closing/unmounting, backgrounding, another mic or account change invalidates late work and stops tracks. Unknown browser/mic/provider states retain typing.

Existing AI router mounts `voiceRouter.ts` behind its optional-auth and chat-rate guards. Server accepts canonical 16kHz mono PCM16 WAV only, validates exact byte/header consistency and actual duration before calling Groq, caps2MB/15s, limits one pending request per IP and six per process, and enforces20s timeout/cancellation. Provider JSON is bounded64KiB; text <=1000 characters. No raw audio, transcript, key or private upstream response is logged/persisted by this path. Independent server replies contain text or an allowlisted error, never prices, stock or order confirmation. The offline runner now also removes voice credentials/enablement from its child environment.

`GROQ_API_KEY` stays server-only. Model allowlist: whisper-large-v3 (default), whisper-large-v3-turbo. Missing config/free-tier acknowledgement fails closed503; quota returns429, size/duration413, malformed audio400/415, silence422. No retry/model/billing fallback. `VOICE_GROQ_FREE_TIER_CONFIRMED` is an operator acknowledgement, not proof of provider billing. Real account/model/quota must be checked before enabling. Quiet speech/noise detection remains heuristic.

Optional `VoiceReadButton` follows device language voices and voiceschanged, requires a tap, hides when no matching voice/script exists and cancels on mic/close/locale/reply change. Actual pronunciation, browser/OS support and provider processing terms are separate manual gates.

Search follow-up: direct probes found `pista 250g` returned only a gifting pouch, `badam 1kg` and Urdu weight queries returned nothing. Shared search now indexes canonical variant labels and normalizes EN/UR/AR gram/kilogram spellings and Eastern digits to equivalent search tokens. Displayed/editable transcript stays intact. This only changes discovery matching; no variant selection, weight/order mutation or inferred price is performed. Tests verify canonical food ranks first and source catalog bytes remain unchanged.

Regression finding: the first `npm test` returned1 without captured test details after the build. An explicit spec+JUnit complete-module diagnostic recorded834 tests:832PASS,1FAIL,1 emulator SKIP. Failure was `premium-browsing-browser.test.tsx:90`, early filter focus preservation. Adding a mic introduced another `button[aria-controls]` before the filter button, so the old broad locator selected the mic. The same ambiguous selector existed in the production sheet's fallback-focus path. Filter trigger now has a stable dedicated marker, and both production fallback and actual browser test target it. The early-interaction probe also observes the real portal commit and asserts successful range focus before retaining its strict focus-retention assertion after two frames. No arbitrary sleep or weaker assertion. The prior hover assertion passed in this diagnostic. The initial hypothesis of scheduling alone was superseded by this concrete selector collision.

Self-review also made request cleanup idempotent so finish/close cannot release a later request's per-IP slot.

Setup: [README-AI.md](../../README-AI.md), [.env.example](../../.env.example), [INTEGRATIONS.md](../../INTEGRATIONS.md). Existing n8n chat and authoritative commerce are unchanged.

## Verification boundaries

New targeted checks cover canonical audio/real duration, provider multipart contract, Urdu/English fixture text preservation, noise/quota/errors, auth/limiter mount, byte rejection before upstream, timeout/overlap/slot cleanup, plus actual mounted Buddy/hero/shop review/edit flow, no auto-send, delayed permission cancellation, closing capture, typing fallback, device-voice matching and mobile RTL/dark geometry. Hardware, decoded samples and provider responses are fixtures; they do not establish real Urdu recognition accuracy.

Typecheck/hooks/build (privacy84 artifacts) PASS; final affected suite20/20PASS, including9 voice contracts/browser,10 existing discovery checks and the full premium browsing regression. Source fingerprint: fbd4aada994c6c4c45c777d0ca447c162d4bea1368240f8c171cbaf1cec8e235. Final full npm test result: 833 PASS, 1 FAIL, 1 emulator SKIP (835 total), exit1. The remaining gallery404 assertion at interaction-polish-browser.test.tsx:206 is unresolved; exact URL diagnostic was interrupted by environment unavailability. See FINAL_STATUS.md. Source checkpoint 4065e357633586f186143191282c5809584e6f9a was fetched back and matched the candidate tree exactly;28 intended paths, zero deletions. Required manual gates: verified free-plan credentials, real Groq EN/UR product-name/amount recognition, actual iOS/Android mic/decode/TTS, live catalog reconciliation, hosted CI and owner-reactivated hosting. Current Firestore freshness is unverified; source97-item fixture checks are not a live merchant audit. Price-review decisions, physical print samples and3D deferral remain unchanged.

## Self-review

Reviewed cancellation/races, request/memory limits, private errors, key bundling, route guards, no background mic, no automatic commercial action and no price/schema/RBAC mutation. Test synchronization awaits committed router state, not arbitrary sleeps. The optional external CodeRabbit review remains unavailable as recorded in the index; no independent review claim is made.

## Delivery checklist (R11)

- [x] Scoped source implementation present; real provider/device/live release remains unfinished.
- [x] Final source paths reviewed for security, privacy, cancellation and commercial boundaries; no price/data/role mutation.
- [ ] Complete regression PASS: currently FAIL, one unresolved gallery404. Targeted20/20 and static/build gates PASS; outcomes recorded.
- [x] Catalog source/fixture scope identified; current live R04 audit BLOCKED on unavailable current snapshot.
- [x] Commerce, roles, localization, no fake confirmation and typing fallback contracts retained.
- [x] Source checkpoint 4065e357633586f186143191282c5809584e6f9a saved/read back: exact tree3bbc9f8fdb996197c2d54aca311c4088fcd74907,28 intended paths, zero deletions. Tracker/changelog records incomplete verification.

Hosted follow-up: source4065e35 run41851671404 completed PASS:834PASS/0FAIL/1 emulator SKIP across106 test files plus backend/assets/36 production checks. This is fresh hosted evidence, separate from the preserved local833P/1F/1S. Provider/device/live remain unverified.
