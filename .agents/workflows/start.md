---
description: Start an AllBarka task safely (sync, own branch, read lessons and the latest handoff)
---
1. `git status --short` — if anything is uncommitted, stop and ask the owner what it is. Never discard it.
2. `git fetch origin`
3. Create the task branch from the latest deploy branch: `git switch -c ag/<yyyymmdd>-<short-task> origin/claude/celebrations-foundation-20261112` (Claude skips this step and stays on its branch).
4. Read the first 12 lines of `AGENTS.md` and the newest file in `docs/handoffs/` (if any).
5. `grep -n -i "<two words from the task>" docs/LESSONS.md` and read the matching entries.
6. If the task is in `docs/PENDING_WORK.md`, read its row.
7. Reply to the owner in Roman Urdu with: branch name, the files you expect to change, the test you will run, and anything you need from the owner. Then start.
