---
description: Finish an AllBarka task: verify, commit, push the ag/* branch, write the handoff note
---
1. `git branch --show-current` — must be an `ag/*` branch (Antigravity). If it is the deploy branch, stop.
2. Run the checks for what you changed: `npm run typecheck`, the targeted tests, and `npm run build 2>&1 | tail -3` when code changed.
3. `git status --short` and `git diff --cached --name-only` — no `.env`, key or `AllBarka-Secrets` path.
4. Write `docs/handoffs/<yyyymmdd>-<short-task>.md`: what changed (files), how it was checked (command + result line), what is left, any owner decision. No secrets.
5. If something surprised you, add an entry to `docs/LESSONS.md` (skill `allbarka-lessons-learned`).
6. Commit with a clear message and push: `git push -u origin <branch>`.
7. Tell the owner in Roman Urdu: the branch name and one line to send Claude, e.g. "ag/20261116-census push ho gaya, review aur merge karo".
