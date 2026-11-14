---
trigger: always_on
---
# Token economy (do more, read less)

1. **Search, then read a slice.** Use `grep -n` / ripgrep to find the line, then open only that range. Never open `src/data/products.ts`, `src/data/catalogIntake*.json`, `package-lock.json`, `dist/`, `build/` or any `docs/evidence/**` file whole.
2. **Do not re-read a file you just edited** to "check". The edit tool already confirms it.
3. **Batch independent work:** run independent searches or reads together, not one per turn.
4. **Targeted tests first.** Run the one test file that covers your change (`node --import tsx --test tests/<file>.test.ts`). Run the full suite (`node scripts/run-all-tests.mjs`, ~8 min) once, before the final commit, not after every edit.
5. **Pipe long output through `tail -20` or `grep -E "^not ok|# (pass|fail)"`.** Do not paste whole logs.
6. **Answer short.** Lead with the result, then what the owner must do. No recap of steps already shown.
7. **One plan, then act.** Do not rewrite a plan the owner already approved; do not ask permission for routine, reversible steps.
8. **Stop on a loop.** If the same command fails twice for the same reason, stop and report the error instead of retrying variations.
