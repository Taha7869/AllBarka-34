# CI-GALLERY1 — gallery failure diagnostics, 5 November 2026

Task scope: SELECTED / DONE for bounded local and hosted acceptance; real provider/live release unfinished. Owner asked to continue the remaining verification. Inspected parent: `ce055cae3e0e29a8e9e1b14d04a72f308c02c5eb`, PR16, `codex/admin-catalog-foundation-20261023`. Isolated worktree preserves the other checkout's unsaved work. No production merge/deployment or merchant/provider/configuration change.

## Evidence and bounded diagnosis

The historical local unexpected404 at interaction-polish-browser.test.tsx:206 has no recorded resource URL. It did not reproduce in two targeted original-behavior runs or the gallery portion of a diagnostic full run. Their captured failures were only POST `/api/orders/quote`503 and GET `/images/missing-preview.webp`404. The complete diagnostic run was interrupted after an execution transport disconnect and has no final count/exit; it is NOT a complete PASS.

A controlled local HTTP reproduction held the known missing-preview response until after the UI returned to its normal state. The old time-window console filter then recorded that deliberate404 as unexpected. This demonstrates a test-harness timing defect; it does not establish that it was the exact historical trigger. The old filter also exempted every404/503 during its active window, potentially hiding an unrelated failure.

## Change

- Reuse the existing browser diagnostic collector. Optional fixture exceptions specify exact same-origin URL (including query), method and status; the default collector still exempts no HTTP failure. Console resource exceptions require the specific URL/status and browser HTTP-error message. Wrong HTTP methods remain failures through response diagnostics, even though console events have no method field.
- Gallery's only deliberate exceptions are POST `/api/orders/quote`503 and GET `/images/missing-preview.webp`404. Runtime errors, failed requests, different URLs/statuses/methods and application console errors remain failures with resource URLs.
- Gate the missing-preview fixture response until the actual hover preview exists. Observe404 and the actual preview fallback before restoring media. No sleep, weakened error assertion or application gallery change.
- Use the same strict collector on the touch context with no fixture exceptions.
- Real-browser regression holds a response across the UI phase transition and verifies delayed expected404/503 handling; wrong status, other resource, wrong method and application console errors must still be reported. Existing failed-API/script/OS-resource checks remain.

Changed source is test infrastructure only. Product seeds/prices, stored merchandising, runtime components, server/rules, packages and keys are unchanged. No tracked deletion or archive; generated test screenshots are restored to their historical versions before saving.

## Hosted follow-up — CI-VOICE-SYNC1

Run41905051979 passed the gallery and both diagnostic cases but failed the one-shot hero voice value read at tests/voice-concierge-browser.test.tsx:99 (expected pista250g, observed empty). Source2036234 now awaits the real input value committed through PlaceholdersAndVanishInput's controlled-value effect, retaining strict equality, product suggestion and no-auto-submit assertions. [Trace and evidence](VOICE_SYNC_2026-11-05.md). Affected9/9, fresh full local835P/0F/1S and source2036234 hosted835P/0F/1S pass. The failed hosted observation is preserved, not labeled harmless.

## Verification tiers

| Tier | Result on this candidate |
| --- | --- |
| Code | Gallery source02fa4a24d4098ed7a8deb2482f3c6f8ae80ec77a, voice assertion follow-up203623404979b52837963c4750d7724acdfec305; exact source tree32bc4232c8e405b8990c0d27b4ce493e6ef6ba58 and branch read-back verified; final implementation self-review PASS |
| Local | Typecheck/hooks/build/privacy PASS (84 artifacts); affected3/3PASS (30.65s); full offline836 total,835PASS/0FAIL/1 emulator-only SKIP (294.67s on2036234), exit0;21 backend PASS;97 products/115 image references/0 missing;36 production checks PASS |
| Hosted CI | Gallery checks PASS in41905051979; complete gate FAIL834P/1F/1S on the voice assertion. Source2036234 retry[41907251379](https://github.com/Taha7869/AllBarka-34/actions/runs/41907251379) PASS:835P/0F/1 emulator SKIP across106 files,21 backend,97 products/115 references/0 missing,36 production checks; typecheck/hooks/build/privacy also PASS. Earlier4065e35 run41851671404 remains separately834P/0F/1S |
| Preview/provider | Local HTTP/browser fixtures only; real Groq/account/Android/iOS/TTS and external providers NOT VERIFIED |
| Live/catalog | BLOCKED: owner-paused hosting and no current complete merchant snapshot; no live mutation |

Environment: Node24.22.1/npm11.9.0, temporary Chromium153.0.8010.0 via existing ALLBARKA_TEST_BROWSER hook, locked application dependencies reused without package changes. Temporary browser is not claimed identical to hosted CI. Offline gates remove provider credentials and skip local env loading.

## Review and remaining release gates

Method: implementation self-review plus actual local tests; no independent CodeRabbit/Gemini/human review is claimed. Earlier CodeRabbit authentication evidence is historical; no fresh independent CodeRabbit review ran. Reviewed source/diff: exact fixture exceptions, wrong-method response retention, strict runtime/network capture, real preview-before-failure gate and touch parity. No unresolved critical/high finding observed within this bounded test diff. The historical failure is not relabeled as proven fixed. Source save used a nonempty verified base tree, exact11-path candidate tree, expected-parent fast-forward and branch read-back; zero file deletions. Final documentation save/read-back follows the same gate. Generated tracked screenshots are restored before saving.

Real Groq free-plan/model/quota and physical phone recognition/decode/TTS, complete current R04 catalog reconciliation, disputed rates and sampler mix, truthful physical packing claims, merchant assets/printing and owner-reactivated live accepted-order checks remain open. An operational free-tier flag is not account billing proof. No guessed repricing, sampler ingredients or autonomous order action.

## R11 delivery checklist

- [x] Bounded acceptance complete; historical404 trigger remains explicitly unconfirmed.
- [x] Final diff reviewed; findings and disposition recorded.
- [x] Relevant static/build, browser and full offline evidence recorded.
- [x] Current catalog/live audit remains BLOCKED; this change touches test infrastructure only.
- [x] Commerce, privacy, roles, localization and application behavior unchanged.
- [x] Tracker, handoff and changelog updated with exact results.
- [x] Source remote parent/tree and branch read-back verified; release remains unfinished. Final documentation save is recorded by its resulting Git commit.

Next action: the documentation-only successor may start its own CI; verified runtime/test source is2036234. Continue real provider/device/merchant gates when their existing dependencies are available; real provider/device/merchant/live gates follow their existing dependencies.
