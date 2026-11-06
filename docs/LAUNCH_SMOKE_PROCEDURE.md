# AllBarka Launch Smoke Procedure (Local & Preview Verification)

This document provides the exact, runnable procedure to verify the AllBarka luxury e-commerce application offline and in isolated preview before any authorized release.

---

## 1. Prerequisites & Environment Check

Verify Node.js and npm versions against `package.json` engines (`"node": ">=22.12.0 <25"`, `"npm": "11.x"`):
```bash
node -v        # Must satisfy >=22.12.0 <25
npm -v         # Must satisfy 11.x
git status     # Ensure clean working tree on codex/admin-catalog-foundation-20261023
```

> [!CAUTION]
> **Environment Isolation Warning:**
> A local server process started in an environment with existing production credentials (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` targeting `allbarka-live`) connects to live production Firestore. It is **NOT** an isolated test environment.
> Never execute mutation tests, place test orders, or run admin edit tests against a server connected to `allbarka-live`.
> For isolated local verification, ensure `ALLBARKA_SKIP_LOCAL_ENV="true"` is set or run tests via memory fixtures (`memoryFirestore`).

---

## 2. Core Quality Gates (Automated & Isolated)

Execute the standard validation pipeline:

### A. TypeScript Typecheck
```bash
npm run typecheck
```
*Expected output: Exit 0, zero type errors (`tsc --noEmit`).*

### B. React Hooks & Architecture Lint
```bash
npm run lint:hooks
```
*Expected output: Exit 0, zero warnings/errors (`eslint src`).*

### C. Build & Release Privacy Audit
```bash
# Windows PowerShell:
$env:ALLBARKA_SKIP_LOCAL_ENV="true"; npm run build

# Linux/macOS:
ALLBARKA_SKIP_LOCAL_ENV="true" npm run build
```
*Expected output: Exit 0, Vite bundle built, server compiled to `build/server.cjs`, and release privacy audit passes with 84+ text artifacts audited clean.*

### D. Full Offline Test Suite (770+ Tests on Memory Fixtures)
```bash
node scripts/run-all-tests.mjs
```
*Expected output: 770+ unit/integration tests PASS, 21 backend checks PASS, 36 production checks PASS.*

---

## 3. Catalog Health & Readiness Audit (M34)

### A. Default Static Reference Audit (Read-Only)
Evaluates current compiled code definitions (`src/data/products.ts`, `src/lib/hamperCatalog.ts`):
```bash
npx tsx scripts/report-catalog-health.ts
```
*Expected output: Source `default_static`, `Read Status: products=NOT_AUDITED, hamperBoxes=NOT_AUDITED, config=STATIC_DEFAULT`. Clearly notes compiled-reference scope.*

### B. Explicit Offline Snapshot Audit
Evaluates against an explicit, dated offline snapshot (e.g. `R04-CAT1` live Firestore inspection from 30 Oct 2026):
```bash
npx tsx scripts/report-catalog-health.ts --snapshot=docs/evidence/catalog-audit/r04-cat1-audit.json
```
*Expected output: Source `snapshot_fixture`, `Read Status: products=CONFIRMED, hamperBoxes=CONFIRMED`. Reports exact Firestore document presence (89 products, 0 hamperBoxes, 7 actionable definite failures).*

### C. Machine-Readable Export
```bash
npx tsx scripts/report-catalog-health.ts --snapshot=docs/evidence/catalog-audit/r04-cat1-audit.json --json --output=docs/evidence/catalog-audit/health-report.json
```

---

## 4. Production Server Smoke Verification (Isolated Verification Script)

Start and test the compiled production server on loopback with isolated environment checks:
```bash
node scripts/verify-production.mjs
```
*Expected output: `Production checks: 36 passed.` covering SPA routing, security headers, metadata, robots, and honest fail-closed persistence.*

---

## 5. Manual Read-Only Browser Journey (Local Isolated Server)

To inspect storefront and UI surfaces locally without mutations:
```bash
# Ensure local secrets are NOT loaded into test environment:
$env:ALLBARKA_SKIP_LOCAL_ENV="true"; node build/server.cjs
```
Open `http://localhost:3000` (or configured PORT) in your browser:

1. **Homepage & Navigation:**
   - Verify emerald signature hero table, navbar, language selector (EN / UR / AR with RTL layout), and dark mode toggle.
   - Verify typography (Playfair Display for headings, Satoshi/Inter for body, Amiri for Urdu/Arabic).
2. **Product Browsing & PDP:**
   - Navigate to `/shop`. Verify 4 items per row on desktop (`lg:grid-cols-4`).
   - Click `/product/pista`. Verify variant options (`250g`, `500g`, `1kg`), image zoom, and Add to Cart.
3. **Cart & Sliding Drawer:**
   - Add items to cart. Verify drawer opens smoothly with subtotal, shipping calculation, and minimum order threshold.
4. **Custom Hamper & Gifting Flow:**
   - Navigate to `/gifting`. Open Custom Hamper Builder.
   - Select box packaging (`box-wood`, `box-velvet`, `box-tin`) and 4+ dry fruit selections.
   - Click "Request Hamper Quote". Verify inquiry modal opens without corrupting shopping cart count.
5. **Staff Order Room:**
   - Navigate to `/staff/orders`. Verify customer denial and staff authentication requirement (`noindex` enforced).
6. **Merchant Admin Studio:**
   - Navigate to `/admin/orders`. Verify admin authorization barrier.
7. **Error & 404 Surfaces:**
   - Navigate to `/non-existent-route`. Verify branded 404 page renders in EN, UR, and AR with proper RTL direction and luxury button links.
   - Verify error boundary fallback behaves gracefully when a component fails.
