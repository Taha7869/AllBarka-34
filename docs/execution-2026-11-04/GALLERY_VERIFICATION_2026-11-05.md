# CI-GALLERY1 — gallery failure diagnostics, 5 November 2026

Task scope: SELECTED / IN_PROGRESS. Owner asked to continue the remaining verification. Inspected parent: `ce055cae3e0e29a8e9e1b14d04a72f308c02c5eb`, PR16, `codex/admin-catalog-foundation-20261023`. Isolated worktree preserves the other checkout's unsaved work. No production merge/deployment or merchant/provider/configuration change.

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

## Verification tiers

| Tier | Result on this candidate |
| --- | --- |
| Code | Scoped test-harness change present; implementation self-review pending final diff |
| Local | Typecheck/hooks/build/privacy PASS (84 artifacts); affected3/3PASS (30.65s); complete offline gate IN_PROGRESS |
| Hosted CI | NOT_RUN on this candidate; parent runtime4065e35 run41851671404 remains separately834PASS/0FAIL/1 emulator skip |
| Preview/provider | Local HTTP/browser fixtures only; real Groq/account/Android/iOS/TTS and external providers NOT VERIFIED |
| Live/catalog | BLOCKED: owner-paused hosting and no current complete merchant snapshot; no live mutation |

Environment: Node24.22.1/npm11.9.0, temporary Chromium153.0.8010.0 via existing ALLBARKA_TEST_BROWSER hook, locked application dependencies reused without package changes. Temporary browser is not claimed identical to hosted CI. Offline gates remove provider credentials and skip local env loading.

## Review and remaining release gates

Method: implementation self-review plus actual local tests; no independent CodeRabbit/Gemini/human review is claimed. Historical CodeRabbit authentication limitation is unchanged. Confirm final intended diff, restore generated tracked screenshots and verify remote parent/tree/read-back before delivery.

Real Groq free-plan/model/quota and physical phone recognition/decode/TTS, complete current R04 catalog reconciliation, disputed rates and sampler mix, truthful physical packing claims, merchant assets/printing and owner-reactivated live accepted-order checks remain open. An operational free-tier flag is not account billing proof. No guessed repricing, sampler ingredients or autonomous order action.

## R11 delivery checklist

- [ ] Bounded acceptance complete; historical404 trigger remains explicitly unconfirmed.
- [ ] Final diff reviewed; findings and disposition recorded.
- [ ] Relevant static/build, browser and full offline evidence recorded.
- [x] Current catalog/live audit remains BLOCKED; this change touches test infrastructure only.
- [x] Commerce, privacy, roles, localization and application behavior unchanged.
- [ ] Tracker, handoff and changelog updated with exact results.
- [ ] Correct remote parent and saved files read back; release remains unfinished.

Next action: finish affected and complete offline gates, save the scoped checkpoint, observe its hosted CI; real provider/device/merchant/live gates follow their existing dependencies.
