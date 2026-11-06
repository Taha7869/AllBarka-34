# AllBarka — deletion and archive ledger

Updated 4 November 2026 (Asia/Karachi). Cleanup baseline: 47f9acde89d58a7a25a122ed80252d51d0f0f4f2. This is a recovery ledger, not a trash directory to purge automatically.

## Policy

- Inspect complete tracked paths and references before removal; use dry-run first.
- Delete only confirmed temporary/generated/unneeded files in the owner's scope. Age, file count or an unfamiliar name does not establish junk.
- Preserve security/audit evidence, source/tests, original media, configuration, migrations, lockfile and current owner decisions.
- For each deletion/archive/replacement record date, task, original path/blob, reason, action, recovery reference and verification.
- Never include secrets/customer records as a backup. Never use git clean -fdx or a broad recursive removal as cleanup.
- Git history is the recovery source for committed files. Record the pre-change commit before removal; do not delete remote history.

## 4 November 2026 — DOC-CLEAN-01

A complete recursive tracked tree at the baseline contained **1,033 blobs**. A scoped generated/temp scan found **zero** node_modules/dist/build/coverage/test-results/playwright-report tracked paths, .DS_Store/Thumbs.db, .bak/.tmp/.log files. Existing ignore rules already exclude the common generated artifacts. This does not classify every unused asset or legacy document as disposable.

**Physical tracked file deletions: 0.** No evidence-based disposable file was found. Do not fabricate deletions to satisfy a cleanup count.

| Original path | Original blob SHA | Action / reason | Recovery / retained copy |
| --- | --- | --- | --- |
| instructions.md | 9344b4db1bfad76898024ee7ec139c360d22d4ed | Replace oversized mixed continuation/history with a concise current AI guide; keep historical outcomes and update relative archive links | [Archived guide](docs/archive/2026-11-04/instructions.md); exact original via git show 47f9acde89d58a7a25a122ed80252d51d0f0f4f2:instructions.md |
| README-AI.md | 0cd8beaea6903747e55fefdeeaf9a89283683a52 | Remove obsolete localhost/Ollama setup from active instructions; replace with actual server/n8n request path and selected voice scope | [Archived AI guide](docs/archive/2026-11-04/README-AI.md); exact original via git show 47f9acde89d58a7a25a122ed80252d51d0f0f4f2:README-AI.md |

No old stage/security/provider evidence, deployment configuration, media, product seed or test was deleted. Multiple hosting files are retained until actual reference/deployment review proves a specific path obsolete.

The new instruction.md is an entry alias, not a second rulebook. Current verification: [cleanup record](docs/CLEANUP_VERIFICATION_2026-11-04.md).

## Future entries

| Date / task | Deleted or archived path | Pre-change commit + blob | Reason and reference check | Recovery action | Verification |
| --- | --- | --- | --- | --- | --- |
| — | No further removals recorded | — | — | — | — |

