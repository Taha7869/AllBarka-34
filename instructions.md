# AllBarka — AI agent working guide

5 November 2026 — CI-GALLERY1: exact fixture HTTP diagnostics replace the gallery test's timing flag; controlled late-response regression and explicit preview-fallback gate added. Historical404 trigger remains unconfirmed. Current verification is IN_PROGRESS; provider/device/merchant/live gates remain open. [Evidence](docs/execution-2026-11-04/GALLERY_VERIFICATION_2026-11-05.md).

Hosted source4065e35 verification subsequently completed PASS:834 tests,0 failures,1 emulator-only skip across106 test files, plus backend/assets/36 production checks; run41851671404. This does not erase the local gallery404 or verify real providers/live. [CI](https://github.com/Taha7869/AllBarka-34/actions/runs/41851671404).

4 November 2026 — Final local gate on source 4065e357633586f186143191282c5809584e6f9a: typecheck/hooks/build and targeted 20/20 PASS; complete npm test FAIL (833 PASS, 1 FAIL, 1 emulator SKIP; 835 total). Remaining failure: tests/interaction-polish-browser.test.tsx:206, one unexpected HTTP404 console event. Exact resource URL was not captured; do not assume it is the intentionally missing preview or suppress arbitrary404s. Local execution environment became unavailable during the URL diagnostic. Voice/source checkpoint is saved, but release verification remains unfinished. [Current status](docs/execution-2026-11-04/FINAL_STATUS.md).

4 November 2026 — VOICE-01: bounded Groq transcription, editable Buddy/hero/shop input, matching device read-aloud, unit-aware product search and dedicated filter focus target. Typecheck/hooks/build and targeted 20/20 PASS. At the code-save checkpoint the full result was pending; the newer final local result above is FAIL; real provider/device/live gates remain open. [Evidence](docs/execution-2026-11-04/PHASE_3.md).

4 November 2026 — Phase 2: default shortlist/combos, available pumpkin 250g card selection and truthful bundle net-weight/component summaries. No price or saved-settings mutation. Type/hooks/build PASS; targeted 38/38 PASS. Earlier whole-suite hover-clock failure remains a caveat pending final rerun. [Evidence](docs/execution-2026-11-04/PHASE_2.md).

4 November 2026 — Phase1 execution: revision test now waits for its actual post-save reload and proves stale expectedRevision2 is rejected against stored5; RTL test waits for committed language/specific surface. Targeted6/6PASS; full820PASS/1FAIL/1SKIP (separate showcase hover test). No hosted-green/provider/live claim. Dedicated evidence: [execution index](docs/execution-2026-11-04/README.md).

Updated 4 November 2026 (Asia/Karachi). Canonical working branch: **codex/admin-catalog-foundation-20261023**, draft [PR #16](https://github.com/Taha7869/AllBarka-34/pull/16), targeting **launch**. Default main, this working branch and deployed build are separate states.

Reviewed implementation baseline: **47f9acde89d58a7a25a122ed80252d51d0f0f4f2**. This is a baseline stamp, not a claim that it remains HEAD after this document's commit. Fetch the current PR/remote head before every write. Never freeze future agents to this old SHA.

## Start every task

1. Read [AGENTS.md](AGENTS.md), [RULES.md](RULES.md) and this guide. The singular [instruction.md](instruction.md) is only an alias.
2. Read [MASTER_PLAN.md](MASTER_PLAN.md), [design.md](design.md), the current [admin handoff](docs/admin-expansion/HANDOFF.md) and task-specific contracts. Before a new component, read [component inventory](docs/COMPONENTS_INVENTORY.md).
3. Inspect current branch/head, working changes and actual relevant source. Determine the task ID, owner-approved scope, acceptance and dependencies. Preserve unrelated edits; do not create a replacement application or duplicate task/price list.
4. Distinguish current owner decisions from technical facts and historical evidence. A stale README cannot establish current runtime behavior; code cannot grant permission to change a business rule. Resolve demonstrated drift, record it, and ask only for genuinely missing decisions. Do not repeat recorded answers.

## Current owner decisions

- Railway payment is unpaid; owner confirms the site is intentionally not live. Live gates are BLOCKED until owner reactivation. Do not diagnose this known operational state as a new Firestore/application bug or initiate payment.
- Box 3D / M08-3D is **DEFERRED**. No model production, 360-degree box prototype or 3D dependency is selected now.
- Preserve balanced retail/gifting, accepted Signature Table direction, existing assets first, mobile priority, EN/UR/AR, dark mode and emerald/ivory/gold. Balance does not mean a new compulsory 50/50 layout or exactly four sections.
- Product merchandising is delegated: candidates pista, kaju, badam, khajoor (the specific dark-date ID), khubani, pumpkin_seeds; discovery bundle-tasting-flight and larger bundle-daily-grind. This is a design shortlist, not approval of seed prices, inventory, discounts or claims. Preserve disputed prices/options unchanged. Source defaults may show the selected candidates; no new savings, ready-stock or finalized sampler-composition claim before merchant reconciliation.
- Printing capability is available according to owner; no physical samples are prepared. Editable designs may proceed; exact supported dimensions/materials/fonts, costs and real packing handoff remain pending.
- VOICE-01 code is implemented with isolated checks; actual provider/device verification remains pending: Groq free-tier Whisper voice input, editable transcript into existing AI Buddy/search, optional tested device speech output. No paid fallback, billing upgrade or client-exposed key. See the [review reconciliation](docs/REVIEW_RECONCILIATION_2026-11-04.md).
- Website orders remain in Firestore, WhatsApp orders in Sheets, with manual synchronization for now. Do not silently add bidirectional order sync.

## Protected business/data rules

Follow RULES R05 and [filled-gift pricing](docs/admin-expansion/FILLED_GIFT_PRICING.md): Firestore/server authority; explicit stored 1kg ingredient rates and recipe grams; no inferred kg fallback; filled/custom estimates finalized by WhatsApp. Preserve historical IDs/labels/receipts, existing standalone retail rates and eligible standard/empty-packaging checkout.

Lahore standard Rs150, free at discounted subtotal >=Rs3000; Express Rs350; outside Lahore actual canonical billed weight xRs250/kg, minimum Rs250, existing ZAFRANI exception. Oil's 1ml=1g convention is billing only. Preserve dynamic MOQ and explicit override, 5% only on initial import, ten-calendar-day custom preparation, current coupons/loyalty and 9999 availability convention.

Admin is server-authorized; staff remains orders-only. No confirmed order before durable persistence; no fake verified reviews, provenance, certifications, stock urgency, unsupported physical inclusions or health claims. Provider keys, private notes and supplier/customer data stay private.

Current instructions authorize no production merge/deploy, live Firestore/rules/role writes, workflow publication or credential changes unless the owner separately includes that action in the task. Use existing authorization rather than asking again for an already-approved step.

## Diagnose before changing

- Reproduce the actual failure at the actual source revision. Record observed request/state/response and distinguish hypotheses from demonstrated causes.
- Known hosted baseline: run 41645560854 reports 819 pass / 2 fail / 1 skip; local docs separately record 821 pass / 0 fail / 1 skip. Do not combine these into a green hosted result.
- Failures: admin-passport-browser.test.tsx:301 (409 expected, 200 observed) and error-surfaces.test.tsx:390 (rtl expected, ltr observed). Catalog revision checks already use transaction.get within db.runTransaction; AdminItemForm/ErrorBoundary/NotFound already bind direction. Revision failure was reproduced as a post-save fixture reload race, fixed in74c215b without server changes; the historical RTL failure did not reproduce, so its exact cause remains unconfirmed. Strict surface/locale synchronization is retained. Hosted run41846554561 at7a9bb0c passes825 tests with one emulator skip. Read docs/execution-2026-11-04/ before restarting these tasks; do not insert guessed cache-bypass/duplicate-dir fixes or dismiss failures as flakiness.
- Source prices are bundled examples, not current Firestore evidence. Flag anomalies; never invent corrective prices or change bundle contents to manufacture savings.
- Preserve M01–M34 meanings: M31 is local-language finding, M32 Studio preview/restore; infrastructure is Stage 6. Retain incomplete M03/M04/M05/M08/M09/M16/merchant-dependent scope despite broader local completion claims.

## Verify and record by impact

Use the locked package.json toolchain: Node >=22.12 <25, npm11; hosted workflow selects Node24. Do not update dependencies to fix an unrelated task.

For source changes: npm run typecheck, npm run lint:hooks, npm run build (includes release privacy audit), affected regressions and full offline runner node scripts/run-all-tests.mjs. npm test includes build + full runner. UI changes also need actual-route responsive/theme/RTL/keyboard/touch/200%-text/reduced-motion checks; provider behavior requires an isolated authorized environment.

For documentation-only work: required build, valid relative links, stable IDs, final diff, truthful status and preserved scope. Do not add tests that only mirror prose. Report exact outcomes; failed or unavailable gates stay FAIL/BLOCKED/NOT_RUN, never PASS.

For every task record separate Code, Local tests, Hosted CI, Preview/provider, and Live columns with SHA/date/environment. Studio fixture preview is not an actual Firebase/n8n/WhatsApp provider test. Check live catalog changes through RULES R04; no current snapshot means BLOCKED, not invented audit success.

## Cleanup and save safely

Read [trash.md](trash.md) before removing/archiving anything. Remove only evidenced junk within scope; inspect references. Record original path/blob SHA, reason, action, retained archive/parent and recovery command. Security records, migrations, required configuration, media and dated verification evidence are not junk merely because they are old.

Update MASTER_PLAN, relevant handoff, CHANGELOG and task evidence together. Use one register, existing IDs and compatible paths. Review the final diff and findings under RULES R03/R11. Save only intended changes against the verified upstream parent, verify candidate tree/deletions, use expected-parent fast-forward and read back the saved commit. Do not force-push or claim independent review when only self-review occurred.

Latest execution/checkpoints are in docs/execution-2026-11-04/. Source/fixture voice is implemented; real free-plan credentials, physical-device recognition, current merchant data/media/printing, remaining M04/M05/M16 scope and owner-reactivated live verification remain separate gates. Follow the specific selected task; recording this sequence does not execute every item automatically. Earlier guide: [archived instructions](docs/archive/2026-11-04/instructions.md).
