# DOC-CLEAN-01 — guide and safe-cleanup verification

Date: 4 November 2026 (Asia/Karachi). Baseline parent: 47f9acde89d58a7a25a122ed80252d51d0f0f4f2; base tree a87956a166a2ab7607a29de91c0d1af6b59345f8; branch codex/admin-catalog-foundation-20261023; draft PR16 targets launch.

## Scope and changes

Owner requested junk/trash cleanup, a trash.md recovery reference and an AI working guide after the external review. Changed only documentation: current AGENTS/instructions, singular entry alias, current AI architecture, roadmap/design/rules/handoff/changelog, review reconciliation, archive and ledger. No runtime/price/configuration/lockfile/image/test source changes.

- Preserve complete original continuation/AI guide history in docs/archive/2026-11-04; archive links now resolve relative to the original repository root. Exact preimages remain available from the parent and blob SHAs in trash.md.
- Complete tracked tree scan: 1,033 original blobs; zero obvious generated/temp patterns; zero physical tracked file deletions. No claim that old security/evidence/assets are junk.
- Preserve M01–M34 identities and pending merchant/provider gates; add owner-selected VOICE-01, deferred box3D and known unpaid hosting.
- Correct source-vs-live pricing, unsupported TastingFlight2200 assumption, roadmap-wide completion and M31/M32/layout misclassification. No selling price or product contents selected by this patch.

## Environment and actual checks

Node24.22.1, npm11.9.0, exact upstream lockfile; ALLBARKA_SKIP_LOCAL_ENV=true for runtime checks. No owner credentials supplied or changed.

| Check | Result / evidence |
| --- | --- |
| npm ci --no-audit --no-fund | PASS;541 locked packages installed. Existing package deprecation warnings and npm proxy warning remain; no dependency/lockfile upgrade. |
| npm run typecheck | PASS,exit0. |
| npm run lint:hooks | PASS,exit0. |
| npm run build | PASS,exit0;2355 modules;84 production text artifacts passed release privacy audit. Existing large-chunk warnings retained. |
| Targeted inquiry/AI suites | PASS,29/29: node --import tsx --test --test-isolation=none tests/stage6-custom-inquiry.test.ts tests/stage7-ai-buddy.test.ts tests/concierge-integration.test.ts. |
| Catalog assets | PASS: node --import tsx scripts/verify-catalog-assets.ts;97 products,115 references/111 unique files,0 missing/retired. |
| Backend checks | PASS,21/21 using node --import tsx tests/run-backend-tests.mjs (the same entry used by the full runner). npm run test:backend's tsx CLI initially failed creating an environment-disallowed Unix IPC socket; the direct Node loader avoids that CLI-only IPC requirement. |
| Production HTTP checks | PASS,36/36: node scripts/verify-production.mjs. Local credential-free fixtures only; not live provider verification. |
| Locked Chromium install | BLOCKED: npx --no-install playwright-core install chromium exited1; downloaded archive was truncated/invalid. |
| Browser / full regression | NOT PASS; see browser diagnostic below. Full runner NOT_RUN because its browser infrastructure is unavailable; no new full-suite green claim. |
| Documentation links / diff / preservation | PASS:14 Markdown paths;173 relative links resolve; M01–M34 IDs and feature titles unchanged; zero tracked deletions; git diff --check clean. No non-documentation path is changed. |

## Browser diagnostic

The initial two-file browser attempt reached four passing SSR checks and two browser startup failures, then retained fixture server handles; it was interrupted (exit130). A bounded diagnostic repeats those two files with Node's --test-force-exit so startup failure details can be collected. This changes no test source or assertion and is not an acceptance workaround. Current hosted baseline already had two genuine assertions failing; this environment must not be claimed to reproduce or fix those assertions when it cannot start the browser.

Bounded diagnostic result: exit1,6 tests,4 SSR PASS and2 browser startup FAIL. Both failures report the missing locked chromium_headless_shell-1243 executable, at browser launch before the original assertions. The known hosted409/RTL failures therefore remain unresolved and were not reproduced here.

## Self-review findings

| Finding | Disposition |
| --- | --- |
| Obsolete root AI guide required browser localhost/Ollama and wildcard origins | Replaced active guide with actual server/n8n path; original retained and clearly historical. |
| Mixed current instructions/history and external review overclaimed complete roadmap/provider verification | Concise guide plus archived history; local/hosted/fixture/provider/live statuses kept separate. |
| Reviewer treated seed prices as approved live rates and proposed automatic price/mix changes | Explicit source-based flags and merchant dependencies; no product/runtime mutation. |
| Repository verification helper names old feat/renovation-v2 default with an explicit-override clause | AGENTS now identifies current owner-selected branch as that override; helper verification requirements remain preserved. No personal skill installation/edit occurred. |
| Missing browser prevents required full application regression | Recorded BLOCKED/NOT_RUN; no assertion weakened, browser substituted, runtime repair or release-ready claim. |

## Review and release boundaries

Direct source/final-diff self-review only; no independent human/CodeRabbit review claimed. Gates that need Chromium or real Firebase/Auth/Storage/n8n/WhatsApp and physical devices remain BLOCKED/NOT_RUN. This is a documentation checkpoint, not a verified application release.

R11 disposition: documentation scope delivered subject to recorded checks; runtime, roles, pricing, localization contracts and history preserved; live catalog audit N/A for prose-only work; current Firestore prices not certified; final parent/tree/blob/read-back checks required at save. No production merge/deployment, payment, key/configuration, live database/rules/workflow/role mutation or customer message.

The resulting commit is discoverable as the DOC-CLEAN-01 successor of the parent above on PR16; do not embed a self-referential commit hash or imply its hosted CI has completed before observing it.
