# Local baseline — 2026-09-15

Imported source baseline: `40488fb`. Read AGENTS.md, REQUIREMENTS.md, CONTINUE_HERE.md, FRONTEND_CHECKPOINT.md and LAUNCH_CHECKLIST.md. Application source and both lockfiles were preserved. Archives, backup copies, credentials, dependencies and generated output are ignored; existing files were not deleted.

## Verified working

- Node 24.14.0, npm 11.9.0.
- `npm run lint` executes `tsc --noEmit`: exit 0.
- Full `npm run build`: exit 0 after the Windows dependency repair below and permission to launch esbuild. Vite 6.4.3 built 2,180 modules and esbuild produced dist/server.cjs.
- One built full-stack preview is running at http://localhost:3000 using `NODE_ENV=production` and `npm start`. The earlier development process was stopped.
- Browser inspection confirmed the homepage finished loading, including hero, categories, product cards, reviews, FAQ, header and footer. Preview tab retained for the user.
- GET /api/health: HTTP 200, status ok, apiActive false.
- GET /api/commerce/readiness: HTTP 200, processRunning true, authActive true, databaseConnected false, durablePersistenceReady false, mode containment_maintenance.
- GET /shop: HTTP 200 HTML. GET /favicon.svg: HTTP 200 SVG. These HTTP checks do not certify all route interactions.
- Source contains the required route inventory, localStorage cart recovery and sessionStorage order-success recovery. Functional end-to-end recovery is unverified.

## Installation and exact failures

1. Documentation uses npm, but package-lock.json is stale. Initial `npm ci --no-audit --no-fund` failed with ENOTCACHED under the sandbox's only-if-cached policy.
2. Retried with registry permission: EUSAGE, `npm ci can only install packages when your package.json and package-lock.json ... are in sync`. Missing entries included react-icons@5.7.0, react-router-dom@7.18.3, react-router@7.18.3, cookie@1.1.1, set-cookie-parser@2.7.2, fsevents@2.3.3 and platform variants for oxide@4.3.1, esbuild@0.28.1 / @0.25.12, lightningcss@1.32.0 and rollup@4.62.2.
3. bun.lock matches the current root dependencies. `npx --yes --package=bun bun install --frozen-lockfile` (Bun 1.4.2) installed 403 packages without changing either lockfile, but its imported platform package entries were also incomplete.
4. First build failed with `Cannot find module @rollup/rollup-win32-x64-msvc` (MODULE_NOT_FOUND).
5. Local dependency-only repair: npm pack fetched @rollup/rollup-win32-x64-msvc@4.62.2, @tailwindcss/oxide-win32-x64-msvc@4.3.1 and lightningcss-win32-x64-msvc@1.32.0. Archives were extracted into their node_modules directories. Versions match the installed packages' optional dependencies. This workaround is not a portable lockfile repair.
6. Sandboxed build and development startup encountered `Error: spawn EPERM` from esbuild. Build passed with elevated subprocess permission.
7. Elevated `npm run dev` emitted its script banner but did not listen on port 3000 during observation; stopped it. Root cause unverified. Built server startup succeeded instead.
8. Successful build warning: chunks larger than 500 kB after minification (512.69 kB and 662.67 kB).

## Configuration status (names only)

No local environment file was present; only .env.example. These names were unset in the inspected process:

- GEMINI_API_KEY — AI integration inactive.
- GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY — Sheets integration unconfigured.
- FIRESTORE_EMULATOR_HOST — server initializes its database handle only when this is set. Adding production credentials alone does not enable the current database code path.
- GOOGLE_APPLICATION_CREDENTIALS — unset; alternative Application Default Credentials were not verified. Admin initialization success is not proof of working authentication.
- APP_URL — listed in the template but no runtime use found.

The Firebase public client configuration is present. No real login, order, contact, newsletter, payment or message submission was performed. The source returns HTTP 503 / PERSISTENCE_PENDING for otherwise-valid order creation when the database handle is absent; no order was submitted to exercise that path.

## Remaining checkpoint work

- Reconcile documentation: latest handoff says Batch 4 complete / Batch 5 next; FRONTEND_CHECKPOINT and LAUNCH_CHECKLIST still describe Batch 1. Requirements also describe React 18 while the installed source dependency is React 19.
- Establish one reproducible authoritative package-manager/lockfile workflow, including Windows native packages, and diagnose development startup.
- Configure and verify durable order persistence, authentication, checkout/payment edge cases, custom hampers, coupon/free-shipping boundaries, reload recovery and mobile flows using isolated test infrastructure.
- SEO/social metadata, canonical domain and Product/Organization/LocalBusiness schema audit. Sitemap and robots.txt are absent from public; OG metadata exists with a relative image path.
- PWA manifest, service worker and offline resilience: no manifest or service worker implementation found. Cart persistence exists but does not provide offline application delivery.
- Performance/image/font audit; address large chunks. Full contrast, keyboard, responsive, RTL and reduced-motion claims were not recertified by this baseline.
- Finish journal article and long legal-policy translations; owner content review remains.
- Production hardening/telemetry, hosting HTTPS, backend abuse protection and launch-register revalidation remain.
- Revisit the launch checklist's secrets-off-frontend claim: vite.config.ts defines process.env.GEMINI_API_KEY for client substitution. No current client reference was found; remove that exposure path before future client code can use it.

No redesign, image regeneration, automation activation, real messages or deployment occurred.
