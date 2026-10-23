# AllBarka expansion change log

Each stage records the prior behavior, resulting behavior, reason, affected paths and actual verification. Earlier renovation work remains in its existing reports.

## 24 October 2026 — Stage 1: audit and working documents

- **Before:** expansion requirements were in conversation; existing renovation documents described earlier stages and contained some stale stack/category prose.
- **After:** the approved scope, six-stage plan, roles, design, fields, compatibility rules, evidence and next step are linked in `instructions.md`, `design.md` and `docs/admin-expansion/`.
- **Reason:** make continuation and future changes reviewable without repeating decisions or mistaking an existing partial feature for completed work.
- **Runtime behavior:** unchanged. No environment values, rates, products, shipping policy, permissions or production services changed.
- **Verification:** source snapshot hashes matched for 548 files. Existing locked install, baseline typecheck, hooks lint and production build passed. Expansion tests and live checks are pending.
