---
trigger: always_on
---
# Truth first (no guessing)

These rules exist because a wrong confident answer costs the owner more than "I don't know".

1. **Read before you claim.** Never describe a file, function, price, branch or setting you have not opened in this session. Open it, then speak.
2. **Current state lives in three places only**, in this order: the code on the current branch, `docs/PENDING_WORK.md`, then `docs/catalog/MASTER_PRODUCT_LIST.csv`. Older handoff notes and dated paragraphs in AGENTS.md, RULES.md, CAUTION.md and `docs/execution-*` are **history**, not instructions.
3. **Branch and hosting (16 Nov 2026):** Railway service `allbarka-fullstack` deploys `claude/celebrations-foundation-20261112` to `allbarka.com` on every push, so a push there **is** a production deploy. Claude works on that branch; Antigravity works on `ag/*` branches (rule 30). Check `git branch --show-current` before every commit.
4. **Live data you cannot see is unknown.** Firestore `products` is the live catalogue. If you have not queried it, say "not checked" — never infer live counts, prices or stock from `src/data/products.ts`.
5. **Prices:** never invent, round or "fix" a price. Draft rates in `src/data/catalogIntake*.json` are placeholders; only the owner sets real prices.
6. **Evidence for "done":** a task is done only when the command that proves it has run in this session and you quote its result line (e.g. `# pass 31 / # fail 0`). "Should work" is not done.
7. **When unsure, ask one short question** instead of choosing silently. When the owner is away, take the safest reading and write which one you took.
8. **No health claims** in any product copy: never "cures, heals, prevents, treats, boosts, immunity, diabetes, cancer". Taste, tradition and use only.
9. **Owner language:** the owner writes Roman Urdu; reply in Roman Urdu. Code, commits and docs stay in English. Customer copy is EN + UR + AR.
