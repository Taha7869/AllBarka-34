# Premium planning and working rules checkpoint

Date: 25 October 2026 (Asia/Karachi).

## Scope and branch

Owner requested additional design suggestions, required inputs, a persistent progress record, and rules covering review before delivery and category matching after Firestore updates. This checkpoint changes documentation only. New visual/features remain proposals; previous completed admin and interaction work remains preserved.

Review branch: `codex/admin-catalog-foundation-20261023`, PR #16. Inspected parent: `2df0571e52c2281f39f70ed660abef8b62e50784`, tree `f2af11803c3383bfb743db48c1e2ed3787846e63`.

## Changes

- `MASTER_PLAN.md`: original 24 IDs, ten additional ideas, recommended direction, V0–V6 sequence, required inputs, honest state and next-session protocol.
- `RULES.md`: mandatory resume/review, semantic catalog matching, compatibility, evidence, secret/production boundaries, checkpoint and delivery rules.
- `docs/CATALOG_AUDIT.md`: explicit unrun live state, source map and reusable complete-scope reconciliation record.
- Entry points and existing handoff link the new files without replacing the admin roadmap or its Stage 6 blockers.

## Source reconstruction

809 repository files were materialized from an existing local source cache and verified individually against the remote Git blob hashes, recovering six modified local documents from the cached commit. The other working copy and its unfinished drafts were left intact. The 61 absent files were historical images under documentation/evidence/draft asset directories; application source/assets and required configurations were present. They remain in GitHub and are not deletions in this checkpoint.

The unchanged lockfile was verified before reusing the existing installed dependencies. A local snapshot commit is only a diff/verification aid; it is not upstream history. The GitHub commit must be built on the inspected remote tree/parent and include only the intended documentation paths.

## Verification results

All results below were rerun in this checkpoint against the unchanged application source. The documentation files are the only intended changes.

| Gate | Actual result |
| --- | --- |
| `ALLBARKA_SKIP_LOCAL_ENV=true npm run typecheck` | Exit 0. |
| `ALLBARKA_SKIP_LOCAL_ENV=true npm run lint:hooks` | Exit 0. |
| `ALLBARKA_SKIP_LOCAL_ENV=true npm run build` | Exit 0; release privacy audit passed for 84 text artifacts. Existing large-chunk advisory remains; no performance improvement is claimed. |
| Full offline suite with the existing installed Chromium selected by `ALLBARKA_TEST_BROWSER` | Exit 0; 705/705 tests across 72 files; zero failed, cancelled or skipped; 21 backend checks; 36 production checks. |
| Catalog asset audit within the full suite | 97 fixture/catalog products, 115 image references / 111 unique files; zero missing files and zero retired views. This is not a live merchant inventory count. |
| Documentation links and task IDs | 11 changed/new documents checked; 46 relative links resolve locally or in the pinned remote tree; M01–M34 each occur exactly once as feature rows. |
| Final whitespace and changed-path inspection | `git diff --check` passes; 11 intended Markdown paths only. |

Build source hash: `084db1a8e8ef5f92e34e4544f4ff15baccd231c482c196dd30af7b081c876538`.

Initial full-suite attempt: the default Chrome/Edge/Playwright browser was absent. Seven browser tests/groups reported launch failures and the process retained open test servers; the attempt was interrupted (exit 130), not counted as passing. A focused launch reproduced the missing Playwright executable. The existing workspace Chromium 153.0.8010.0 was found and successfully launched using the already-supported `ALLBARKA_TEST_BROWSER` override; the complete suite was then rerun and passed. No test assertions, application code, dependencies or application environment files were changed. Test-only settings used `ALLBARKA_SKIP_LOCAL_ENV=true` and the existing browser executable. The offline runner strips live integration credentials.

The full suite exercised existing mounted browser fixtures; this is regression verification, not new premium visual design or a live provider certification. Existing business/service failure cases intentionally produce diagnostic messages inside tests; the final suite has zero failures.

## Review record

Method: source-guided documentation self-review; no CodeRabbit or independent review claimed. Final diff checked for unsupported approval/completion claims, stale branch instructions, correct file links, all 24 retained IDs, additional proposed IDs, a clear category-vs-collection distinction, explicit live-audit limits and unchanged runtime files.

| Finding | Resolution / evidence |
| --- | --- |
| D01: old current-task/next-work wording could direct a fresh agent back to completed interaction work. | Qualified the old refinement as previously completed and labeled the integration workstream; added the latest planning/rules entry point. Reviewed the resulting diff. |
| D02: one global TODO statement would make per-feature updates easy to overlook. | Added a scope/work cell to each of the 34 feature rows and instructions for linked task evidence. Unique-ID check passes. |
| D03: category rules need to catch unseen new records without relying on a repeated owner reminder. | Added a task-start catalog/taxonomy revision/watermark comparison, full-snapshot fallback and explicit stale/unverified handling. This is a work rule, not an installed automated monitor. |

No unresolved material finding in this documentation scope. Live catalog classification and premium implementation are explicitly unperformed rather than marked passed.

## Delivery gate record

- PASS: requested plan/rules/continuation documents are complete; new implementation is correctly TODO/proposed.
- PASS: final documentation diff self-reviewed; findings D01–D03 resolved and links/IDs checked.
- PASS: required local build/type/lint and full offline regression results above; initial browser failure retained in the record.
- N/A for changing catalog records in this documentation-only task; the separate current live reconciliation remains BLOCKED / NOT_RUN.
- PASS: application source/assets/contracts and dependency lockfile match the inspected parent; no application runtime or data writes.
- PASS: master status, decisions, audit limits, changelog and next action updated.
- GitHub save: use the inspected parent and base tree, then verify the saved commit's exact paths/blob hashes and the feature ref. The commit containing this file is the checkpoint identity; production release remains separate.

## Limits and next action

- No current live Firestore catalog was read or edited; its category reconciliation remains BLOCKED / NOT_RUN.
- No new visual browser QA, photography, merchant content or feature implementation is claimed by this documentation checkpoint.
- Existing integration/release blockers remain in the admin Stage 6 tracker. No environment/key change, live message, rules/workflow publication, production merge or deployment is included.
- Next: record owner commercial priority/hero-product/asset choices in MASTER_PLAN.md, select the first V1 slice and continue through the existing components under RULES.md.
