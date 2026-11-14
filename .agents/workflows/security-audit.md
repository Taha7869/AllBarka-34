---
description: Quick security audit of the current branch using the allbarka-security-hardening skill
---
1. Read `.agents/skills/allbarka-security-hardening/SKILL.md`.
2. `npm audit --omit=dev 2>&1 | tail -15`
3. `git grep -nIE "dangerouslySetInnerHTML|eval\(|new Function\(" -- src server.ts`
4. `git grep -nE "VITE_[A-Z_]*(SECRET|PRIVATE|TOKEN)" -- . ':!*.example'`
5. List every `app.(get|post|put|patch|delete)` route in `server.ts` and `src/lib/*Router.ts`; for each, note auth, ownership and rate limit.
6. `ls dist/assets | grep -c '\.map$'` after a build.
7. Write findings (severity, file:line, attack, fix) to `docs/SECURITY_AUDIT_<date>.md`. Change no code until the owner picks which findings to fix.
