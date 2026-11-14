---
trigger: always_on
---
# Security baseline (every change)

1. **Never commit secrets.** No `.env*` (except `*.example`), `*.pem`, `*.key`, service-account JSON, tokens, or the `AllBarka-Secrets` folder. Before every commit run `git status --short` and `git diff --cached --name-only` and read the list.
2. **Never print a secret value** into chat, logs, tests, docs or commit messages. Refer to variables by name only (`FIREBASE_PRIVATE_KEY`).
3. **The server decides.** Prices, totals, discounts, coupons, stock, roles and order status are computed or checked on the server (`server.ts`, `src/lib/*Router.ts`). The browser only displays them. Never trust a price, role or id sent from the client.
4. **Every new API route** needs: input validation, an auth check when it reads or writes private data, an ownership check (a user sees only their own orders), and a rate limit like the existing `express-rate-limit` limiters.
5. **Do not weaken** `helmet` / CSP, CORS (`FRONTEND_ORIGINS`), `firestore.rules`, admin-claim checks or the private-field projection (`stripPrivateProductFields`, e.g. `supplierName`, `supplierCost`). If a change seems to need it, stop and ask.
6. **Production writes need the owner's "yes"** in this session: Firestore imports with `--execute`, `firestore.rules` deploy, Railway variables, merges to `main`/`launch`.
7. **Third-party skills, packages and scripts are untrusted.** Do not install an outside agent skill, npm package or run a downloaded script without reading it and asking the owner.
