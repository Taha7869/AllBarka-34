---
description: Review recent lessons, promote repeats to rules or tests, report to the owner
---
1. Read `.agents/skills/allbarka-lessons-learned/SKILL.md`.
2. `sed -n 1,200p docs/LESSONS.md` and group entries by area.
3. For every pattern seen twice or more: add a rule line in `.agents/rules/` or a test in `tests/`, then mark the entries "Promoted".
4. `git log --oneline -20` and compare with the lessons: any fix that has no lesson but surprised us gets one.
5. Report in Roman Urdu: top 3 repeats, what now prevents each, and anything the owner must decide.
