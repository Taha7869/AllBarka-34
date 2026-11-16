---
description: Run every AllBarka gate before a commit or push (push = production deploy)
---
1. `git branch --show-current` — Claude: `claude/celebrations-foundation-20261112`; Antigravity: an `ag/*` branch, never the deploy branch.
2. `git status --short` and `git diff --cached --name-only` — stop if any `.env`, key, credential or `AllBarka-Secrets` path appears.
3. `npm run typecheck`
4. `npm run lint:hooks`
5. Targeted tests for the files you changed: `node --import tsx --test tests/<file>.test.ts`
6. `node scripts/run-all-tests.mjs 2>&1 | tail -5` (full suite, about 8 minutes)
7. `npm run build 2>&1 | tail -5` — must end with "Release privacy audit passed".
8. `ls dist/assets | grep -c '\.map$'` — must print `0`.
9. Report each step's result line. If any step fails, stop and report; do not commit.
