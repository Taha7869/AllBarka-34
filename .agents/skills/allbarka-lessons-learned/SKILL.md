---
name: allbarka-lessons-learned
description: >-
  Self-improvement loop for AllBarka agents. Use at the START of every task (read the lessons that
  apply) and at the END of every task that hit a surprise, a failed test, a wrong assumption, an
  owner correction or a production issue (write the lesson). Also use when the owner says "same
  mistake again", "yaad rakho", "remember this", or runs /retro.
---

# Lessons learned: get better every task

The memory lives in `docs/LESSONS.md` (in git, so every agent and every session shares it).

## At the start of a task
1. `grep -n -i "<two or three words from the task>" docs/LESSONS.md` and read only the matching entries.
2. Follow every matching "Do" line. If a lesson contradicts the owner's current instruction, the owner wins; note it.

## At the end of a task
Write a lesson only when something went differently than expected. One entry, newest at the top, this exact shape:

```
### YYYY-MM-DD · <area> · <one-line title>
- What happened: <fact, with the file, command or log line>
- Root cause: <why, confirmed, not guessed>
- Do: <the rule that prevents it next time, as an instruction>
- Check: <the command or test that proves it>
```

Rules:
- Facts only, with evidence; no blame, no secrets, no customer data.
- If the lesson is a permanent rule (applies to every task), also add one line to the right file in `.agents/rules/` and say so in the entry.
- If a test could catch it, write the test in the same task; the lesson then points to the test.
- Merge duplicates: if a similar entry exists, update it instead of adding another.
- Keep the file under about 300 lines: when it grows, fold old entries that became rules or tests into a one-line "Promoted" list at the bottom.

## Weekly (or when the owner runs /retro)
Read the last 20 entries, find repeats, promote each repeat to a rule or a test, and report to the owner in Roman Urdu: what kept going wrong and what now prevents it.
